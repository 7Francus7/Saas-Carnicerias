"use client";

import { useEffect, useMemo, useState } from "react";
import {
  TrendingUp, TrendingDown, DollarSign, ShoppingBag,
  Receipt, BarChart3, Download, ArrowUpRight,
  Percent, Calendar,
} from "lucide-react";
import {
  AreaChart, Area, XAxis, YAxis,
  CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell,
} from "recharts";
import { formatCurrency, formatNumber } from "@/lib/constants";
import { getSessionHistory, getCurrentSession } from "@/actions/caja";
import { downloadReportePDF } from "@/lib/pdfUtils";

type Period = "hoy" | "semana" | "mes" | "custom";
type ChartTooltipEntry = { value?: number };
type TimelinePoint = { t: string; v: number };
type PaymentEntry = { method: string; amount: number; pct: number; color: string };
type CategoryEntry = { name: string; emoji: string; v: number; color: string };
type TopProduct = {
  name: string;
  emoji: string;
  cat: string;
  sold: number;
  unit: string;
  rev: number;
  margin: number;
};

type SessionHistoryEntry = Awaited<ReturnType<typeof getSessionHistory>>[number];
type CurrentSessionEntry = NonNullable<Awaited<ReturnType<typeof getCurrentSession>>>;
type SaleEntry =
  | SessionHistoryEntry["sales"][number]
  | CurrentSessionEntry["sales"][number];

type NormalizedItem = {
  name: string;
  category: string;
  emoji: string;
  unit: string;
  quantity: number;
  revenue: number;
  cost: number;
  hasCost: boolean;
};

type NormalizedSale = {
  id: string;
  timestamp: Date;
  total: number;
  method: string;
  itemCount: number;
  splits: { method: string; amount: number }[];
  items: NormalizedItem[];
};

type PeriodData = {
  ventas: number;
  tx: number;
  avgTicket: number;
  margen: number;
  vsTrend: { ventas: number; tx: number; ticket: number; margen: number };
  timeline: TimelinePoint[];
  cats: CategoryEntry[];
  paymentMap: Record<string, number>;
  topProducts: TopProduct[];
};

const PAYMENT_METHODS_CONFIG = [
  { key: "cash", label: "Efectivo", color: "#22C55E" },
  { key: "transfer", label: "Transferencia", color: "#3B82F6" },
  { key: "card", label: "Tarjeta", color: "#F59E0B" },
  { key: "link", label: "QR / Link", color: "#A855F7" },
  { key: "fiado", label: "Cta. Cte.", color: "#EF4444" },
  { key: "mixed", label: "Mixto", color: "#64748B" },
] as const;

const CATEGORY_COLORS = [
  "#DC2626",
  "#F97316",
  "#16A34A",
  "#2563EB",
  "#A855F7",
  "#0F766E",
  "#D97706",
];

const EMPTY_DAILY_TIMELINE: TimelinePoint[] = [
  { t: "08:00", v: 0 },
  { t: "12:00", v: 0 },
  { t: "16:00", v: 0 },
  { t: "20:00", v: 0 },
];

const EMPTY_WEEKLY_TIMELINE: TimelinePoint[] = [
  { t: "Lun", v: 0 },
  { t: "Mar", v: 0 },
  { t: "Mie", v: 0 },
  { t: "Jue", v: 0 },
  { t: "Vie", v: 0 },
  { t: "Sab", v: 0 },
  { t: "Hoy", v: 0 },
];

const EMPTY_MONTHLY_TIMELINE: TimelinePoint[] = [
  { t: "Sem 1", v: 0 },
  { t: "Sem 2", v: 0 },
  { t: "Sem 3", v: 0 },
  { t: "Sem 4", v: 0 },
];

const TODAY = new Date().toISOString().split("T")[0];

function startOfDay(date: Date) {
  const copy = new Date(date);
  copy.setHours(0, 0, 0, 0);
  return copy;
}

function addDays(date: Date, days: number) {
  const copy = new Date(date);
  copy.setDate(copy.getDate() + days);
  return copy;
}

function startOfMonth(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

function startOfNextMonth(date: Date) {
  return new Date(date.getFullYear(), date.getMonth() + 1, 1);
}

function percentChange(current: number, previous: number) {
  if (previous <= 0) return 0;
  return parseFloat((((current - previous) / previous) * 100).toFixed(1));
}

function buildPaymentMap(sales: NormalizedSale[]) {
  const map: Record<string, number> = {};
  sales.forEach((sale) => {
    if (sale.splits.length > 0) {
      sale.splits.forEach((split) => {
        map[split.method] = (map[split.method] ?? 0) + split.amount;
      });
    } else {
      map[sale.method] = (map[sale.method] ?? 0) + sale.total;
    }
  });
  return map;
}

function normalizeSale(sale: SaleEntry): NormalizedSale {
  return {
    id: sale.id,
    timestamp: new Date(sale.timestamp),
    total: sale.total,
    method: sale.method,
    itemCount: sale.itemCount,
    splits: sale.splits ?? [],
    items: sale.items.map((item) => {
      const revenue = item.price * item.quantity;
      const hasCost = typeof item.unitCost === "number";
      return {
        name: item.product?.name ?? item.name,
        category: item.product?.category ?? "Sin categoria",
        emoji: item.product?.emoji ?? item.emoji ?? "📦",
        unit: item.product?.unit ?? item.unit,
        quantity: item.quantity,
        revenue,
        cost: hasCost ? item.unitCost! * item.quantity : 0,
        hasCost,
      };
    }),
  };
}

function salesBetween(sales: NormalizedSale[], start: Date, end: Date) {
  return sales.filter((sale) => sale.timestamp >= start && sale.timestamp < end);
}

function buildDailyTimeline(sales: NormalizedSale[]) {
  if (sales.length === 0) return EMPTY_DAILY_TIMELINE;

  const hourMap = new Map<string, number>();
  sales.forEach((sale) => {
    const hour = `${sale.timestamp.getHours().toString().padStart(2, "0")}:00`;
    hourMap.set(hour, (hourMap.get(hour) ?? 0) + sale.total);
  });

  return [...hourMap.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([t, v]) => ({ t, v }));
}

function buildWeeklyTimeline(sales: NormalizedSale[], now: Date) {
  const rows = Array.from({ length: 7 }, (_, index) => {
    const day = addDays(startOfDay(now), index - 6);
    const nextDay = addDays(day, 1);
    const total = salesBetween(sales, day, nextDay).reduce((acc, sale) => acc + sale.total, 0);
    const isToday = day.toDateString() === startOfDay(now).toDateString();
    const label = isToday
      ? "Hoy"
      : day.toLocaleDateString("es-AR", { weekday: "short" }).replace(".", "");
    return {
      t: label.charAt(0).toUpperCase() + label.slice(1),
      v: total,
    };
  });

  return rows.some((row) => row.v > 0) ? rows : EMPTY_WEEKLY_TIMELINE;
}

function buildMonthlyTimeline(sales: NormalizedSale[], now: Date) {
  const monthStart = startOfMonth(now);
  const nextMonth = startOfNextMonth(now);
  const weekCount = Math.max(4, Math.ceil((nextMonth.getDate() - monthStart.getDate()) / 7));

  const rows = Array.from({ length: weekCount }, (_, index) => {
    const start = addDays(monthStart, index * 7);
    const end = index === weekCount - 1 ? nextMonth : addDays(start, 7);
    const total = salesBetween(sales, start, end).reduce((acc, sale) => acc + sale.total, 0);
    return { t: `Sem ${index + 1}`, v: total };
  });

  return rows.some((row) => row.v > 0) ? rows : EMPTY_MONTHLY_TIMELINE;
}

function buildCategoryData(sales: NormalizedSale[]) {
  const categoryMap = new Map<string, CategoryEntry>();

  sales.forEach((sale) => {
    sale.items.forEach((item) => {
      const current = categoryMap.get(item.category);
      if (current) {
        current.v += item.revenue;
        return;
      }

      categoryMap.set(item.category, {
        name: item.category,
        emoji: item.emoji,
        v: item.revenue,
        color: CATEGORY_COLORS[categoryMap.size % CATEGORY_COLORS.length],
      });
    });
  });

  return [...categoryMap.values()].sort((a, b) => b.v - a.v);
}

function buildTopProducts(sales: NormalizedSale[]) {
  const productMap = new Map<
    string,
    { name: string; emoji: string; cat: string; sold: number; unit: string; rev: number; cost: number; knownCostRevenue: number }
  >();

  sales.forEach((sale) => {
    sale.items.forEach((item) => {
      const key = `${item.category}:${item.name}`;
      const current = productMap.get(key) ?? {
        name: item.name,
        emoji: item.emoji,
        cat: item.category,
        sold: 0,
        unit: item.unit,
        rev: 0,
        cost: 0,
        knownCostRevenue: 0,
      };

      current.sold += item.quantity;
      current.rev += item.revenue;
      current.cost += item.cost;
      if (item.hasCost) current.knownCostRevenue += item.revenue;
      productMap.set(key, current);
    });
  });

  return [...productMap.values()]
    .sort((a, b) => b.rev - a.rev)
    .slice(0, 5)
    .map((product) => ({
      name: product.name,
      emoji: product.emoji,
      cat: product.cat,
      sold: parseFloat(product.sold.toFixed(3)),
      unit: product.unit,
      rev: product.rev,
      margin:
        product.knownCostRevenue > 0
          ? parseFloat((((product.knownCostRevenue - product.cost) / product.knownCostRevenue) * 100).toFixed(1))
          : 0,
    }));
}

function summarizeSales(
  sales: NormalizedSale[],
  previousSales: NormalizedSale[],
  timeline: TimelinePoint[]
): PeriodData {
  const ventas = sales.reduce((acc, sale) => acc + sale.total, 0);
  const tx = sales.length;
  const avgTicket = tx > 0 ? Math.round(ventas / tx) : 0;
  const previousVentas = previousSales.reduce((acc, sale) => acc + sale.total, 0);
  const previousTx = previousSales.length;
  const previousAvgTicket = previousTx > 0 ? previousVentas / previousTx : 0;

  let revenueWithCost = 0;
  let totalCost = 0;
  sales.forEach((sale) => {
    sale.items.forEach((item) => {
      if (!item.hasCost) return;
      revenueWithCost += item.revenue;
      totalCost += item.cost;
    });
  });
  const margen = revenueWithCost > 0
    ? parseFloat((((revenueWithCost - totalCost) / revenueWithCost) * 100).toFixed(1))
    : 0;

  let previousRevenueWithCost = 0;
  let previousCost = 0;
  previousSales.forEach((sale) => {
    sale.items.forEach((item) => {
      if (!item.hasCost) return;
      previousRevenueWithCost += item.revenue;
      previousCost += item.cost;
    });
  });
  const previousMargen = previousRevenueWithCost > 0
    ? ((previousRevenueWithCost - previousCost) / previousRevenueWithCost) * 100
    : 0;

  return {
    ventas,
    tx,
    avgTicket,
    margen,
    vsTrend: {
      ventas: percentChange(ventas, previousVentas),
      tx: percentChange(tx, previousTx),
      ticket: percentChange(avgTicket, previousAvgTicket),
      margen: percentChange(margen, previousMargen),
    },
    timeline,
    cats: buildCategoryData(sales),
    paymentMap: buildPaymentMap(sales),
    topProducts: buildTopProducts(sales),
  };
}

function CustomTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: ChartTooltipEntry[];
  label?: string;
}) {
  if (!active || !payload?.length) return null;
  return (
    <div
      style={{
        background: "var(--bg-elevated)",
        border: "1px solid var(--border)",
        borderRadius: "var(--radius-md)",
        padding: "10px 14px",
        fontSize: "0.8rem",
        boxShadow: "var(--shadow-lg)",
      }}
    >
      <p style={{ color: "var(--text-tertiary)", marginBottom: 4 }}>{label}</p>
      <p style={{ color: "#DC2626", fontWeight: 700 }}>
        {formatCurrency(payload[0].value ?? 0)}
      </p>
    </div>
  );
}

export default function ReportesContent() {
  const [period, setPeriod] = useState<Period>("hoy");
  const [customDate, setCustomDate] = useState("");
  const [closedSessions, setClosedSessions] = useState<SessionHistoryEntry[]>([]);
  const [currentSession, setCurrentSession] = useState<CurrentSessionEntry | null>(null);

  useEffect(() => {
    getSessionHistory().then(setClosedSessions);
    getCurrentSession().then((session) => {
      setCurrentSession(session ?? null);
    });
  }, []);

  const allSales = useMemo(() => {
    const closed = closedSessions.flatMap((session) => session.sales.map(normalizeSale));
    const open = currentSession ? currentSession.sales.map(normalizeSale) : [];
    return [...closed, ...open].sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
  }, [closedSessions, currentSession]);

  const weeklyRows = useMemo(() => {
    const now = new Date();
    return Array.from({ length: 7 }, (_, index) => {
      const day = addDays(startOfDay(now), index - 6);
      const nextDay = addDays(day, 1);
      const sales = salesBetween(allSales, day, nextDay);
      const v = sales.reduce((acc, sale) => acc + sale.total, 0);
      const tx = sales.length;
      const isToday = day.toDateString() === startOfDay(now).toDateString();
      const label = isToday
        ? "Hoy"
        : day.toLocaleDateString("es-AR", { weekday: "short" }).replace(".", "");
      return {
        day: label.charAt(0).toUpperCase() + label.slice(1),
        v,
        tx,
        today: isToday,
      };
    });
  }, [allSales]);

  const reportData = useMemo(() => {
    const now = new Date();

    if (period === "hoy") {
      const start = startOfDay(now);
      const end = addDays(start, 1);
      const currentSales = salesBetween(allSales, start, end);
      const previousSales = salesBetween(allSales, addDays(start, -1), start);
      return summarizeSales(currentSales, previousSales, buildDailyTimeline(currentSales));
    }

    if (period === "semana") {
      const start = addDays(startOfDay(now), -6);
      const end = addDays(startOfDay(now), 1);
      const previousStart = addDays(start, -7);
      const currentSales = salesBetween(allSales, start, end);
      const previousSales = salesBetween(allSales, previousStart, start);
      return summarizeSales(currentSales, previousSales, buildWeeklyTimeline(currentSales, now));
    }

    if (period === "mes") {
      const start = startOfMonth(now);
      const end = startOfNextMonth(now);
      const previousStart = new Date(start.getFullYear(), start.getMonth() - 1, 1);
      const currentSales = salesBetween(allSales, start, end);
      const previousSales = salesBetween(allSales, previousStart, start);
      return summarizeSales(currentSales, previousSales, buildMonthlyTimeline(currentSales, now));
    }

    if (!customDate) {
      return summarizeSales([], [], EMPTY_DAILY_TIMELINE);
    }

    const start = new Date(`${customDate}T00:00:00`);
    const end = addDays(start, 1);
    const previousSales = salesBetween(allSales, addDays(start, -1), start);
    const currentSales = salesBetween(allSales, start, end);
    return summarizeSales(currentSales, previousSales, buildDailyTimeline(currentSales));
  }, [allSales, customDate, period]);

  const currentPaymentData = useMemo<PaymentEntry[]>(() => {
    return PAYMENT_METHODS_CONFIG.map((config) => {
      const amount = reportData.paymentMap[config.key] ?? 0;
      return {
        method: config.label,
        amount,
        pct: reportData.ventas > 0
          ? parseFloat(((amount / reportData.ventas) * 100).toFixed(1))
          : 0,
        color: config.color,
      };
    }).filter((entry) => entry.amount > 0 || reportData.ventas === 0);
  }, [reportData.paymentMap, reportData.ventas]);

  const catMax = Math.max(1, ...reportData.cats.map((category) => category.v));

  const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setCustomDate(value);
    if (value) setPeriod("custom");
  };

  const handleTabClick = (nextPeriod: "hoy" | "semana" | "mes") => {
    setPeriod(nextPeriod);
    setCustomDate("");
  };

  const dateLabel = customDate
    ? new Date(`${customDate}T12:00:00`).toLocaleDateString("es-AR", {
        weekday: "long",
        day: "numeric",
        month: "long",
        year: "numeric",
      })
    : null;

  return (
    <div className="page-container">
      <div className="page-header animate-in">
        <div className="page-header__left">
          <div className="page-header__greeting">Finanzas</div>
          <h1 className="page-header__title">Reportes y <span>Analisis</span></h1>
          {dateLabel && (
            <div
              style={{
                marginTop: 4,
                fontSize: "0.82rem",
                color: "var(--primary)",
                fontWeight: 600,
                textTransform: "capitalize",
              }}
            >
              {dateLabel}
            </div>
          )}
        </div>
        <div
          className="page-header__right"
          style={{ gap: 10, flexWrap: "wrap", justifyContent: "flex-end" }}
        >
          <div className="period-tabs">
            {(["hoy", "semana", "mes"] as const).map((tab) => (
              <button
                key={tab}
                className={`period-tab ${period === tab ? "period-tab--active" : ""}`}
                onClick={() => handleTabClick(tab)}
              >
                {tab === "hoy" ? "Hoy" : tab === "semana" ? "Esta Semana" : "Este Mes"}
              </button>
            ))}
          </div>

          <div className="date-picker-wrap">
            <Calendar size={14} className="date-picker-icon" />
            <input
              type="date"
              className={`date-picker-input ${period === "custom" ? "date-picker-input--active" : ""}`}
              value={customDate}
              max={TODAY}
              onChange={handleDateChange}
              title="Elegir fecha especifica"
            />
          </div>

          <button
            className="btn btn--ghost btn--sm"
            onClick={() =>
              downloadReportePDF({
                period,
                ventas: reportData.ventas,
                tx: reportData.tx,
                avgTicket: reportData.avgTicket,
                payments: currentPaymentData,
                weeklyRows,
              })
            }
          >
            <Download size={14} /> Exportar PDF
          </button>
        </div>
      </div>

      <div className="stats-grid">
        <div className="stat-card stat-card--revenue animate-in animate-in-delay-1">
          <div className="stat-card__top">
            <div className="stat-card__icon stat-card__icon--revenue"><DollarSign size={20} /></div>
            <div className={`stat-card__trend stat-card__trend--${reportData.vsTrend.ventas >= 0 ? "up" : "down"}`}>
              {reportData.vsTrend.ventas >= 0 ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
              {Math.abs(reportData.vsTrend.ventas)}%
            </div>
          </div>
          <div className="stat-card__value">{formatCurrency(reportData.ventas)}</div>
          <div className="stat-card__label">Ventas Totales</div>
        </div>

        <div className="stat-card stat-card--orders animate-in animate-in-delay-2">
          <div className="stat-card__top">
            <div className="stat-card__icon stat-card__icon--orders"><ShoppingBag size={20} /></div>
            <div className={`stat-card__trend stat-card__trend--${reportData.vsTrend.tx >= 0 ? "up" : "down"}`}>
              {reportData.vsTrend.tx >= 0 ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
              {Math.abs(reportData.vsTrend.tx)}%
            </div>
          </div>
          <div className="stat-card__value">{formatNumber(reportData.tx)}</div>
          <div className="stat-card__label">Transacciones</div>
        </div>

        <div className="stat-card stat-card--ticket animate-in animate-in-delay-3">
          <div className="stat-card__top">
            <div className="stat-card__icon stat-card__icon--ticket"><Receipt size={20} /></div>
            <div className={`stat-card__trend stat-card__trend--${reportData.vsTrend.ticket >= 0 ? "up" : "down"}`}>
              {reportData.vsTrend.ticket >= 0 ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
              {Math.abs(reportData.vsTrend.ticket)}%
            </div>
          </div>
          <div className="stat-card__value">{formatCurrency(reportData.avgTicket)}</div>
          <div className="stat-card__label">Ticket Promedio</div>
        </div>

        <div className="stat-card stat-card--clients animate-in animate-in-delay-4">
          <div className="stat-card__top">
            <div className="stat-card__icon stat-card__icon--clients"><Percent size={20} /></div>
            <div className={`stat-card__trend stat-card__trend--${reportData.vsTrend.margen >= 0 ? "up" : "down"}`}>
              {reportData.vsTrend.margen >= 0 ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
              {Math.abs(reportData.vsTrend.margen)}pp
            </div>
          </div>
          <div className="stat-card__value">{reportData.margen}%</div>
          <div className="stat-card__label">Margen Real</div>
        </div>
      </div>

      <div className="dashboard-grid">
        <div className="card animate-in animate-in-delay-2">
          <div className="card__header">
            <div>
              <div className="card__title">Evolucion de Ventas</div>
              <div className="card__subtitle">
                {period === "custom"
                  ? "Por hora"
                  : period === "hoy"
                    ? "Por hora"
                    : period === "semana"
                      ? "Por dia"
                      : "Por semana"}
              </div>
            </div>
            <BarChart3 size={16} style={{ color: "var(--text-muted)" }} />
          </div>
          <div className="chart-container">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart
                data={reportData.timeline}
                margin={{ top: 5, right: 10, left: -10, bottom: 0 }}
              >
                <defs>
                  <linearGradient id="rGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#DC2626" stopOpacity={0.25} />
                    <stop offset="100%" stopColor="#DC2626" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border-light)" vertical={false} />
                <XAxis
                  dataKey="t"
                  tick={{ fill: "var(--text-muted)", fontSize: 11 }}
                  axisLine={{ stroke: "var(--border-light)" }}
                  tickLine={false}
                />
                <YAxis
                  tick={{ fill: "var(--text-muted)", fontSize: 11 }}
                  axisLine={false}
                  tickLine={false}
                  tickFormatter={(value) => `$${(value / 1000).toFixed(0)}k`}
                />
                <Tooltip content={<CustomTooltip />} />
                <Area
                  type="monotone"
                  dataKey="v"
                  stroke="#DC2626"
                  strokeWidth={2.5}
                  fill="url(#rGrad)"
                  dot={false}
                  activeDot={{ r: 5, stroke: "#DC2626", strokeWidth: 2, fill: "var(--bg-card)" }}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="card animate-in animate-in-delay-3">
          <div className="card__header">
            <div>
              <div className="card__title">Medios de Pago</div>
              <div className="card__subtitle">Distribucion del periodo</div>
            </div>
          </div>
          <div style={{ height: 160, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={currentPaymentData.length > 0 ? currentPaymentData : [{ method: "Sin ventas", amount: 1, pct: 100, color: "var(--border-light)" }]}
                  cx="50%"
                  cy="50%"
                  innerRadius={45}
                  outerRadius={68}
                  paddingAngle={currentPaymentData.length > 0 ? 3 : 0}
                  dataKey="amount"
                >
                  {(currentPaymentData.length > 0
                    ? currentPaymentData
                    : [{ method: "Sin ventas", amount: 1, pct: 100, color: "var(--border-light)" }]).map((entry, idx) => (
                    <Cell key={idx} fill={entry.color} stroke="transparent" />
                  ))}
                </Pie>
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="donut-legend">
            {currentPaymentData.length === 0 ? (
              <div className="donut-legend-item">
                <span className="donut-legend-label">Sin ventas registradas en el periodo</span>
              </div>
            ) : (
              currentPaymentData.map((payment) => (
                <div key={payment.method} className="donut-legend-item">
                  <div className="donut-legend-left">
                    <div className="donut-legend-dot" style={{ background: payment.color }} />
                    <span className="donut-legend-label">{payment.method}</span>
                  </div>
                  <div className="donut-legend-right">
                    <span className="donut-legend-pct">{payment.pct}%</span>
                    <span className="donut-legend-val">{formatCurrency(payment.amount)}</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 16 }}>
        <div className="card animate-in animate-in-delay-2">
          <div className="card__header">
            <div>
              <div className="card__title">Ventas por Categoria</div>
              <div className="card__subtitle">Participacion en el periodo</div>
            </div>
          </div>
          {reportData.cats.length === 0 ? (
            <div style={{ color: "var(--text-muted)", fontSize: "0.88rem" }}>
              Todavia no hay items vendidos para desglosar categorias en este periodo.
            </div>
          ) : (
            reportData.cats.map((category) => (
              <div key={category.name} className="cat-bar-row">
                <span className="cat-emoji">{category.emoji}</span>
                <span className="cat-name">{category.name}</span>
                <div className="cat-bar-track">
                  <div
                    className="cat-bar-fill"
                    style={{
                      width: `${Math.round((category.v / catMax) * 100)}%`,
                      background: category.color,
                    }}
                  />
                </div>
                <span className="cat-bar-value">{formatCurrency(category.v)}</span>
              </div>
            ))
          )}
        </div>

        <div className="card animate-in animate-in-delay-3">
          <div className="card__header">
            <div>
              <div className="card__title">Productos Mas Vendidos</div>
              <div className="card__subtitle">Ranking del periodo</div>
            </div>
            <button className="btn btn--ghost btn--sm">
              Ver todos <ArrowUpRight size={13} />
            </button>
          </div>
          <div className="table-wrapper">
            <table className="data-table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Producto</th>
                  <th>Vendido</th>
                  <th>Facturado</th>
                  <th>Margen</th>
                </tr>
              </thead>
              <tbody>
                {reportData.topProducts.length === 0 ? (
                  <tr>
                    <td colSpan={5} style={{ textAlign: "center", padding: "24px 0", color: "var(--text-muted)" }}>
                      No hay ventas suficientes para armar el ranking en este periodo.
                    </td>
                  </tr>
                ) : (
                  reportData.topProducts.map((product, idx) => (
                    <tr key={`${product.name}_${idx}`}>
                      <td
                        style={{
                          fontWeight: 700,
                          color: idx < 3 ? "var(--primary)" : "var(--text-muted)",
                          fontFamily: "var(--font-mono)",
                        }}
                      >
                        {idx + 1}
                      </td>
                      <td>
                        <div className="product-cell">
                          <div className="product-cell__img">{product.emoji}</div>
                          <div>
                            <div className="product-cell__name">{product.name}</div>
                            <div style={{ fontSize: "0.68rem", color: "var(--text-muted)" }}>{product.cat}</div>
                          </div>
                        </div>
                      </td>
                      <td style={{ fontFamily: "var(--font-mono)" }}>
                        {formatNumber(product.sold)} {product.unit}
                      </td>
                      <td
                        style={{
                          fontFamily: "var(--font-mono)",
                          fontWeight: 600,
                          color: "var(--text-primary)",
                        }}
                      >
                        {formatCurrency(product.rev)}
                      </td>
                      <td>
                        <span className={`badge ${product.margin >= 40 ? "badge--success" : product.margin >= 25 ? "badge--info" : "badge--warning"}`}>
                          {product.margin}%
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <div className="card animate-in animate-in-delay-3">
        <div className="card__header">
          <div>
            <div className="card__title">Resumen Semanal</div>
            <div className="card__subtitle">Ultimos 7 dias - comparativa por jornada</div>
          </div>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 6,
              fontSize: "0.78rem",
              color: "var(--text-tertiary)",
            }}
          >
            <Calendar size={13} /> Semana actual
          </div>
        </div>
        <div className="week-table">
          <div className="week-row week-row--header">
            <span>Dia</span>
            <span>Progreso</span>
            <span style={{ textAlign: "right" }}>Ventas</span>
            <span style={{ textAlign: "center" }}>Tx</span>
            <span style={{ textAlign: "right" }}>Promedio</span>
          </div>
          {weeklyRows.map((row) => (
            <div key={row.day} className={`week-row ${row.today ? "week-row--today" : ""}`}>
              <span className="week-day">
                {row.day}
                {row.today && (
                  <span style={{ marginLeft: 6, fontSize: "0.65rem", color: "var(--primary)", fontWeight: 700 }}>
                    HOY
                  </span>
                )}
              </span>
              <div className="week-bar-wrap">
                <div
                  className="week-bar-fill"
                  style={{
                    width: `${Math.round((row.v / Math.max(1, ...weeklyRows.map((weekRow) => weekRow.v))) * 100)}%`,
                  }}
                />
              </div>
              <span className="week-ventas">{formatCurrency(row.v)}</span>
              <span className="week-tx">{row.tx}</span>
              <span className="week-avg">
                {formatCurrency(row.tx > 0 ? Math.round(row.v / row.tx) : 0)}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
