"use client";

import { useState, useMemo, useEffect } from "react";
import {
  TrendingUp, TrendingDown, DollarSign, ShoppingBag,
  Receipt, BarChart3, Download, ArrowUpRight,
  Percent, Calendar
} from "lucide-react";
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis,
  CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell
} from "recharts";
import { formatCurrency, formatNumber } from "@/lib/constants";
import { useCajaStore } from "@/stores/useCajaStore";
import { getSessionHistory } from "@/actions/caja";

// ── Mock data por período ── (used as fallback or for future periods)
const MOCK_DATA = {
  hoy: {
    ventas: 0, tx: 0, avgTicket: 0, margen: 0,
    vsTrend: { ventas: 0, tx: 0, ticket: 0, margen: 0 },
    timeline: [{ t: "08:00", v: 0 }, { t: "12:00", v: 0 }, { t: "16:00", v: 0 }, { t: "20:00", v: 0 }],
    cats: [] as { name: string; emoji: string; v: number; color: string }[],
  },
  semana: {
    ventas: 0, tx: 0, avgTicket: 0, margen: 0,
    vsTrend: { ventas: 0, tx: 0, ticket: 0, margen: 0 },
    timeline: [{ t: "Lun", v: 0 }, { t: "Mié", v: 0 }, { t: "Vie", v: 0 }, { t: "Dom", v: 0 }],
    cats: [] as { name: string; emoji: string; v: number; color: string }[],
  },
  mes: {
    ventas: 0, tx: 0, avgTicket: 0, margen: 0,
    vsTrend: { ventas: 0, tx: 0, ticket: 0, margen: 0 },
    timeline: [{ t: "Sem 1", v: 0 }, { t: "Sem 2", v: 0 }, { t: "Sem 3", v: 0 }, { t: "Sem 4", v: 0 }],
    cats: [] as { name: string; emoji: string; v: number; color: string }[],
  },
} as const;

const PAYMENT_METHODS_CONFIG = [
  { key: "cash",     label: "Efectivo",      color: "#22C55E" },
  { key: "transfer", label: "Transferencia", color: "#3B82F6" },
  { key: "card",     label: "Tarjeta",       color: "#F59E0B" },
  { key: "link",     label: "QR / Link",     color: "#A855F7" },
  { key: "fiado",    label: "Cta. Cte.",     color: "#EF4444" },
];

const WEEKLY = [
  { day: "Lun", v: 0, tx: 0, today: false },
  { day: "Mar", v: 0, tx: 0, today: false },
  { day: "Mié", v: 0, tx: 0, today: false },
  { day: "Jue", v: 0, tx: 0, today: false },
  { day: "Vie", v: 0, tx: 0, today: false },
  { day: "Sáb", v: 0, tx: 0, today: false },
  { day: "Hoy", v: 0, tx: 0, today: true },
];
// weekMax computed dynamically in component now

const TOP_PRODUCTS: any[] = [];

type Period = "hoy" | "semana" | "mes" | "custom";
type PaymentEntry = { method: string; amount: number; pct: number; color: string };

const TODAY = new Date().toISOString().split("T")[0];

function seedFromDate(dateStr: string): number {
  const s = dateStr.replace(/-/g, "");
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) & 0xffff;
  return 0.45 + (h % 1000) / 1818;
}

function buildCustomData(dateStr: string) {
  const f = seedFromDate(dateStr);
  const base = MOCK_DATA.hoy;
  return {
    ventas: Math.round(base.ventas * f),
    tx: Math.round(base.tx * f),
    avgTicket: Math.round(base.avgTicket * (0.88 + f * 0.24)),
    margen: parseFloat((base.margen * (0.9 + f * 0.2)).toFixed(1)),
    vsTrend: {
      ventas: parseFloat(((f - 1) * 30).toFixed(1)),
      tx: parseFloat(((f - 0.95) * 25).toFixed(1)),
      ticket: parseFloat(((f - 1) * 10).toFixed(1)),
      margen: parseFloat(((f - 1) * 5).toFixed(1)),
    },
    timeline: base.timeline.map(p => ({ t: p.t, v: Math.round(p.v * f) })),
    cats: base.cats.map(c => ({ ...c, v: Math.round(c.v * f) })),
  };
}

function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div style={{
      background: "var(--bg-elevated)", border: "1px solid var(--border)",
      borderRadius: "var(--radius-md)", padding: "10px 14px",
      fontSize: "0.8rem", boxShadow: "var(--shadow-lg)",
    }}>
      <p style={{ color: "var(--text-tertiary)", marginBottom: 4 }}>{label}</p>
      <p style={{ color: "#DC2626", fontWeight: 700 }}>
        {formatCurrency(payload[0].value)}
      </p>
    </div>
  );
}

type ClosedSession = Awaited<ReturnType<typeof getSessionHistory>>[number];

function computeFromSessions(sessions: ClosedSession[]) {
  const ventas = sessions.reduce((acc, s) => acc + s.sales.reduce((a, v) => a + v.total, 0), 0);
  const tx = sessions.reduce((acc, s) => acc + s.sales.length, 0);
  const avgTicket = tx > 0 ? Math.round(ventas / tx) : 0;
  const paymentMap: Record<string, number> = {};
  sessions.forEach((s) =>
    s.sales.forEach((sale) => {
      if (sale.splits.length > 0) {
        sale.splits.forEach((sp) => { paymentMap[sp.method] = (paymentMap[sp.method] ?? 0) + sp.amount; });
      } else {
        paymentMap[sale.method] = (paymentMap[sale.method] ?? 0) + sale.total;
      }
    })
  );
  return { ventas, tx, avgTicket, paymentMap };
}

export default function ReportesContent() {
  const { currentSession } = useCajaStore();
  const [period, setPeriod] = useState<Period>("hoy");
  const [customDate, setCustomDate] = useState("");
  const [closedSessions, setClosedSessions] = useState<ClosedSession[]>([]);

  useEffect(() => {
    getSessionHistory().then(setClosedSessions);
  }, []);

  // Week = last 7 days
  const weekData = useMemo(() => {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - 7);
    const sessions = closedSessions.filter((s) => new Date(s.openedAt) >= cutoff);
    const { ventas, tx, avgTicket, paymentMap } = computeFromSessions(sessions);

    // Build timeline by day of week
    const dayNames = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];
    const dayMap: Record<string, number> = {};
    sessions.forEach((s) => {
      const day = dayNames[new Date(s.openedAt).getDay()];
      dayMap[day] = (dayMap[day] ?? 0) + s.sales.reduce((a, v) => a + v.total, 0);
    });
    const timeline = dayNames.map((d) => ({ t: d, v: dayMap[d] ?? 0 }));

    return {
      ventas, tx, avgTicket, margen: 0,
      vsTrend: { ventas: 0, tx: 0, ticket: 0, margen: 0 },
      timeline, cats: [],
      paymentMap,
    };
  }, [closedSessions]);

  // Month = current calendar month
  const monthData = useMemo(() => {
    const now = new Date();
    const sessions = closedSessions.filter((s) => {
      const d = new Date(s.openedAt);
      return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
    });
    const { ventas, tx, avgTicket, paymentMap } = computeFromSessions(sessions);

    const weekLabels = ["Sem 1", "Sem 2", "Sem 3", "Sem 4"];
    const weekMap: Record<string, number> = {};
    sessions.forEach((s) => {
      const week = Math.ceil(new Date(s.openedAt).getDate() / 7);
      const label = `Sem ${Math.min(week, 4)}`;
      weekMap[label] = (weekMap[label] ?? 0) + s.sales.reduce((a, v) => a + v.total, 0);
    });
    const timeline = weekLabels.map((w) => ({ t: w, v: weekMap[w] ?? 0 }));

    return {
      ventas, tx, avgTicket, margen: 0,
      vsTrend: { ventas: 0, tx: 0, ticket: 0, margen: 0 },
      timeline, cats: [],
      paymentMap,
    };
  }, [closedSessions]);

  // Real WEEKLY rows (last 7 calendar days)
  const weeklyRows = useMemo(() => {
    const dayNames = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];
    const shortNames = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"];
    const now = new Date();
    return shortNames.map((day, i) => {
      const target = new Date(now);
      target.setDate(now.getDate() - (6 - i));
      const sessions = closedSessions.filter((s) => {
        const d = new Date(s.openedAt);
        return d.toDateString() === target.toDateString();
      });
      const v = sessions.reduce((acc, s) => acc + s.sales.reduce((a, vv) => a + vv.total, 0), 0);
      const tx = sessions.reduce((acc, s) => acc + s.sales.length, 0);
      const isToday = target.toDateString() === now.toDateString();
      return { day: isToday ? "Hoy" : day, v, tx, today: isToday };
    });
  }, [closedSessions]);

  // Derived real data for 'hoy'
  const realTodayData = useMemo(() => {
    if (!currentSession) return { ...MOCK_DATA.hoy, paymentData: [] as PaymentEntry[] };
    const ventas = currentSession.ventas.reduce((acc, v) => acc + v.total, 0);
    const tx = currentSession.ventas.length;
    const avgTicket = tx > 0 ? Math.round(ventas / tx) : 0;
    
    // Payment methods from current session
    const paymentMap: Record<string, number> = {};
    currentSession.ventas.forEach(v => {
      if (v.splits) {
        v.splits.forEach(sp => {
          paymentMap[sp.method] = (paymentMap[sp.method] ?? 0) + sp.amount;
        });
      } else {
        paymentMap[v.method] = (paymentMap[v.method] ?? 0) + v.total;
      }
    });

    const paymentData = PAYMENT_METHODS_CONFIG.map(config => {
      const amount = paymentMap[config.key] ?? 0;
      return {
        method: config.label,
        amount,
        pct: ventas > 0 ? parseFloat(((amount / ventas) * 100).toFixed(1)) : 0,
        color: config.color
      };
    });

    // Timeline (simple hourly grouping)
    const timelineMap: Record<string, number> = {};
    currentSession.ventas.forEach(v => {
      const hour = new Date(v.timestamp).getHours().toString().padStart(2, '0') + ':00';
      timelineMap[hour] = (timelineMap[hour] ?? 0) + v.total;
    });

    const timeline = MOCK_DATA.hoy.timeline.map(p => ({
      t: p.t,
      v: timelineMap[p.t] ?? 0
    }));

    return {
      ventas,
      tx,
      avgTicket,
      margen: 34.2, // hypothetical
      vsTrend: MOCK_DATA.hoy.vsTrend,
      timeline,
      cats: MOCK_DATA.hoy.cats,
      paymentData
    };
  }, [currentSession]);

  const d = useMemo(() => {
    if (period === "custom" && customDate) return buildCustomData(customDate);
    if (period === "hoy") return realTodayData;
    if (period === "semana") return weekData;
    return monthData;
  }, [period, customDate, realTodayData, weekData, monthData]);

  const currentPaymentData = useMemo<PaymentEntry[]>(() => {
    const sourceMap =
      period === "hoy" ? (realTodayData.paymentData?.reduce((acc: Record<string, number>, p: PaymentEntry) => { acc[p.method] = p.amount; return acc; }, {}) ?? {})
      : period === "semana" ? weekData.paymentMap
      : period === "mes" ? monthData.paymentMap
      : {};

    if (period === "hoy") return realTodayData.paymentData || [];

    return PAYMENT_METHODS_CONFIG.map((config) => {
      const amount = (sourceMap as Record<string, number>)[config.key] ?? 0;
      const total = d.ventas;
      return { method: config.label, amount, pct: total > 0 ? parseFloat(((amount / total) * 100).toFixed(1)) : 0, color: config.color };
    });
  }, [period, d.ventas, realTodayData, weekData, monthData]);

  const catMax = Math.max(...d.cats.map(c => c.v));

  const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setCustomDate(val);
    if (val) setPeriod("custom");
  };

  const handleTabClick = (p: "hoy" | "semana" | "mes") => {
    setPeriod(p);
    setCustomDate("");
  };

  const dateLabel = customDate
    ? new Date(customDate + "T12:00:00").toLocaleDateString("es-AR", { weekday: "long", day: "numeric", month: "long", year: "numeric" })
    : null;

  return (
    <div className="page-container">
      {/* Header */}
      <div className="page-header animate-in">
        <div className="page-header__left">
          <div className="page-header__greeting">Finanzas</div>
          <h1 className="page-header__title">Reportes y <span>Análisis</span></h1>
          {dateLabel && (
            <div style={{ marginTop: 4, fontSize: "0.82rem", color: "var(--primary)", fontWeight: 600, textTransform: "capitalize" }}>
              {dateLabel}
            </div>
          )}
        </div>
        <div className="page-header__right" style={{ gap: 10, flexWrap: "wrap", justifyContent: "flex-end" }}>
          <div className="period-tabs">
            {(["hoy", "semana", "mes"] as const).map(p => (
              <button
                key={p}
                className={`period-tab ${period === p ? "period-tab--active" : ""}`}
                onClick={() => handleTabClick(p)}
              >
                {p === "hoy" ? "Hoy" : p === "semana" ? "Esta Semana" : "Este Mes"}
              </button>
            ))}
          </div>

          {/* Date picker */}
          <div className="date-picker-wrap">
            <Calendar size={14} className="date-picker-icon" />
            <input
              type="date"
              className={`date-picker-input ${period === "custom" ? "date-picker-input--active" : ""}`}
              value={customDate}
              max={TODAY}
              onChange={handleDateChange}
              title="Elegir fecha específica"
            />
          </div>

          <button className="btn btn--ghost btn--sm">
            <Download size={14} /> Exportar
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="stats-grid">
        <div className="stat-card stat-card--revenue animate-in animate-in-delay-1">
          <div className="stat-card__top">
            <div className="stat-card__icon stat-card__icon--revenue"><DollarSign size={20} /></div>
            <div className={`stat-card__trend stat-card__trend--${d.vsTrend.ventas >= 0 ? "up" : "down"}`}>
              {d.vsTrend.ventas >= 0 ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
              {Math.abs(d.vsTrend.ventas)}%
            </div>
          </div>
          <div className="stat-card__value">{formatCurrency(d.ventas)}</div>
          <div className="stat-card__label">Ventas Totales</div>
        </div>

        <div className="stat-card stat-card--orders animate-in animate-in-delay-2">
          <div className="stat-card__top">
            <div className="stat-card__icon stat-card__icon--orders"><ShoppingBag size={20} /></div>
            <div className={`stat-card__trend stat-card__trend--${d.vsTrend.tx >= 0 ? "up" : "down"}`}>
              {d.vsTrend.tx >= 0 ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
              {Math.abs(d.vsTrend.tx)}%
            </div>
          </div>
          <div className="stat-card__value">{formatNumber(d.tx)}</div>
          <div className="stat-card__label">Transacciones</div>
        </div>

        <div className="stat-card stat-card--ticket animate-in animate-in-delay-3">
          <div className="stat-card__top">
            <div className="stat-card__icon stat-card__icon--ticket"><Receipt size={20} /></div>
            <div className={`stat-card__trend stat-card__trend--${d.vsTrend.ticket >= 0 ? "up" : "down"}`}>
              {d.vsTrend.ticket >= 0 ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
              {Math.abs(d.vsTrend.ticket)}%
            </div>
          </div>
          <div className="stat-card__value">{formatCurrency(d.avgTicket)}</div>
          <div className="stat-card__label">Ticket Promedio</div>
        </div>

        <div className="stat-card stat-card--clients animate-in animate-in-delay-4">
          <div className="stat-card__top">
            <div className="stat-card__icon stat-card__icon--clients"><Percent size={20} /></div>
            <div className={`stat-card__trend stat-card__trend--${d.vsTrend.margen >= 0 ? "up" : "down"}`}>
              {d.vsTrend.margen >= 0 ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
              {Math.abs(d.vsTrend.margen)}pp
            </div>
          </div>
          <div className="stat-card__value">{d.margen}%</div>
          <div className="stat-card__label">Margen Estimado</div>
        </div>
      </div>

      {/* Sales Chart + Payment Donut */}
      <div className="dashboard-grid">
        {/* Area Chart */}
        <div className="card animate-in animate-in-delay-2">
          <div className="card__header">
            <div>
              <div className="card__title">Evolución de Ventas</div>
              <div className="card__subtitle">
                {period === "custom" ? "Por hora" : period === "hoy" ? "Por hora" : period === "semana" ? "Por día" : "Por semana"}
              </div>
            </div>
            <BarChart3 size={16} style={{ color: "var(--text-muted)" }} />
          </div>
          <div className="chart-container">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={d.timeline as { t: string; v: number }[]} margin={{ top: 5, right: 10, left: -10, bottom: 0 }}>
                <defs>
                  <linearGradient id="rGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#DC2626" stopOpacity={0.25} />
                    <stop offset="100%" stopColor="#DC2626" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border-light)" vertical={false} />
                <XAxis dataKey="t" tick={{ fill: "var(--text-muted)", fontSize: 11 }} axisLine={{ stroke: "var(--border-light)" }} tickLine={false} />
                <YAxis tick={{ fill: "var(--text-muted)", fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={v => `$${(v / 1000).toFixed(0)}k`} />
                <Tooltip content={<CustomTooltip />} />
                <Area type="monotone" dataKey="v" stroke="#DC2626" strokeWidth={2.5} fill="url(#rGrad)" dot={false} activeDot={{ r: 5, stroke: "#DC2626", strokeWidth: 2, fill: "var(--bg-card)" }} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Donut Payment */}
        <div className="card animate-in animate-in-delay-3">
          <div className="card__header">
            <div>
              <div className="card__title">Medios de Pago</div>
              <div className="card__subtitle">Distribución del período</div>
            </div>
          </div>
          <div style={{ height: 160, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={currentPaymentData} cx="50%" cy="50%" innerRadius={45} outerRadius={68} paddingAngle={3} dataKey="amount">
                  {currentPaymentData.map((entry, idx) => (
                    <Cell key={idx} fill={entry.color} stroke="transparent" />
                  ))}
                </Pie>
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="donut-legend">
            {currentPaymentData.map(p => (
              <div key={p.method} className="donut-legend-item">
                <div className="donut-legend-left">
                  <div className="donut-legend-dot" style={{ background: p.color }} />
                  <span className="donut-legend-label">{p.method}</span>
                </div>
                <div className="donut-legend-right">
                  <span className="donut-legend-pct">{p.pct}%</span>
                  <span className="donut-legend-val">{formatCurrency(p.amount)}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>


      {/* Category Breakdown + Top Products */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 16 }}>
        {/* Category horizontal bars */}
        <div className="card animate-in animate-in-delay-2">
          <div className="card__header">
            <div>
              <div className="card__title">Ventas por Categoría</div>
              <div className="card__subtitle">Participación en el período</div>
            </div>
          </div>
          {d.cats.map(c => (
            <div key={c.name} className="cat-bar-row">
              <span className="cat-emoji">{c.emoji}</span>
              <span className="cat-name">{c.name}</span>
              <div className="cat-bar-track">
                <div
                  className="cat-bar-fill"
                  style={{ width: `${Math.round((c.v / catMax) * 100)}%`, background: c.color }}
                />
              </div>
              <span className="cat-bar-value">{formatCurrency(c.v)}</span>
            </div>
          ))}
        </div>

        {/* Top Products */}
        <div className="card animate-in animate-in-delay-3">
          <div className="card__header">
            <div>
              <div className="card__title">Productos Más Vendidos</div>
              <div className="card__subtitle">Ranking del período</div>
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
                {TOP_PRODUCTS.map((p, idx) => (
                  <tr key={p.name}>
                    <td style={{ fontWeight: 700, color: idx < 3 ? "var(--primary)" : "var(--text-muted)", fontFamily: "var(--font-mono)" }}>
                      {idx + 1}
                    </td>
                    <td>
                      <div className="product-cell">
                        <div className="product-cell__img">{p.emoji}</div>
                        <div>
                          <div className="product-cell__name">{p.name}</div>
                          <div style={{ fontSize: "0.68rem", color: "var(--text-muted)" }}>{p.cat}</div>
                        </div>
                      </div>
                    </td>
                    <td style={{ fontFamily: "var(--font-mono)" }}>{p.sold} {p.unit}</td>
                    <td style={{ fontFamily: "var(--font-mono)", fontWeight: 600, color: "var(--text-primary)" }}>
                      {formatCurrency(p.rev)}
                    </td>
                    <td>
                      <span className={`badge ${p.margin >= 40 ? "badge--success" : p.margin >= 30 ? "badge--info" : "badge--warning"}`}>
                        {p.margin}%
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Weekly Summary */}
      <div className="card animate-in animate-in-delay-3">
        <div className="card__header">
          <div>
            <div className="card__title">Resumen Semanal</div>
            <div className="card__subtitle">Últimos 7 días — comparativa por jornada</div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: "0.78rem", color: "var(--text-tertiary)" }}>
            <Calendar size={13} /> Semana actual
          </div>
        </div>
        <div className="week-table">
          <div className="week-row week-row--header">
            <span>Día</span>
            <span>Progreso</span>
            <span style={{ textAlign: "right" }}>Ventas</span>
            <span style={{ textAlign: "center" }}>Tx</span>
            <span style={{ textAlign: "right" }}>Promedio</span>
          </div>
          {weeklyRows.map(row => (
            <div key={row.day} className={`week-row ${row.today ? "week-row--today" : ""}`}>
              <span className="week-day">
                {row.day}
                {row.today && (
                  <span style={{ marginLeft: 6, fontSize: "0.65rem", color: "var(--primary)", fontWeight: 700 }}>HOY</span>
                )}
              </span>
              <div className="week-bar-wrap">
                <div className="week-bar-fill" style={{ width: `${Math.round((row.v / Math.max(1, ...weeklyRows.map(r => r.v))) * 100)}%` }} />
              </div>
              <span className="week-ventas">{formatCurrency(row.v)}</span>
              <span className="week-tx">{row.tx}</span>
              <span className="week-avg">{formatCurrency(Math.round(row.v / row.tx))}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
