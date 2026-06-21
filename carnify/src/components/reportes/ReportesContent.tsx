"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  TrendingUp, TrendingDown, DollarSign, ShoppingBag,
  Receipt, BarChart3, Download, ArrowUpRight,
  Percent, Calendar,
} from "lucide-react";
import {
  AreaChart, Area, XAxis, YAxis,
  CartesianGrid, Tooltip,
  PieChart, Pie, Cell,
} from "recharts";
import { formatCurrency, formatNumber } from "@/lib/constants";
import { downloadReportePDF } from "@/lib/pdfUtils";
import { getAggregatedReportData } from "@/actions/reportes";
import type { AggregatedReportData } from "@/actions/reportes";

type Period = "hoy" | "semana" | "mes" | "custom";
type ChartTooltipEntry = { value?: number };

const PAYMENT_METHODS_CONFIG = [
  { key: "cash", label: "Efectivo", color: "#22C55E" },
  { key: "transfer", label: "Transferencia", color: "#3B82F6" },
  { key: "card", label: "Tarjeta", color: "#F59E0B" },
  { key: "link", label: "QR / Link", color: "#A855F7" },
  { key: "fiado", label: "Cta. Cte.", color: "#EF4444" },
  { key: "mixed", label: "Mixto", color: "#64748B" },
] as const;

// ART = UTC-3: subtract 3h before converting to ISO string to get ART date
const TODAY = new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString().split("T")[0];

function PaymentTooltip({ active, payload, label }: { active?: boolean; payload?: ChartTooltipEntry[]; label?: string }) {
  if (!active || !payload?.length) return null;
  return (
    <div style={{
      background: "var(--bg-elevated)", border: "1px solid var(--border)",
      borderRadius: "var(--radius-md)", padding: "10px 14px",
      fontSize: "0.8rem", boxShadow: "var(--shadow-lg)",
    }}>
      <p style={{ color: "var(--text-tertiary)", marginBottom: 4 }}>{label}</p>
      <p style={{ color: "#DC2626", fontWeight: 700 }}>{formatCurrency(payload[0].value ?? 0)}</p>
    </div>
  );
}

function MeasuredChart({
  height,
  children,
}: {
  height: number;
  children: (size: { width: number; height: number }) => React.ReactNode;
}) {
  const ref = useRef<HTMLDivElement | null>(null);
  const [width, setWidth] = useState(0);

  useEffect(() => {
    const element = ref.current;
    if (!element) return;

    const updateWidth = (nextWidth: number) => {
      const roundedWidth = Math.round(nextWidth);
      setWidth((prev) => (prev === roundedWidth ? prev : roundedWidth));
    };

    updateWidth(element.getBoundingClientRect().width);

    const observer = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (!entry) return;
      updateWidth(entry.contentRect.width);
    });

    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  return (
    <div ref={ref} className="chart-container" style={{ height }}>
      {width > 0 && children({ width, height })}
    </div>
  );
}

export default function ReportesContent() {
  const [period, setPeriod] = useState<Period>("hoy");
  const [customDate, setCustomDate] = useState("");
  const [data, setData] = useState<AggregatedReportData | null>(null);
  const [chartsReady, setChartsReady] = useState(false);
  const [showAllProducts, setShowAllProducts] = useState(false);

  useEffect(() => {
    getAggregatedReportData(period, customDate || undefined).then(setData);
  }, [period, customDate]);
  useEffect(() => {
    const frame = requestAnimationFrame(() => setChartsReady(true));
    return () => cancelAnimationFrame(frame);
  }, []);

  const reportData = data ?? {
    current: { ventas: 0, tx: 0, avgTicket: 0, margen: 0 },
    previous: { ventas: 0, tx: 0, avgTicket: 0, margen: 0 },
    timeline: [],
    paymentMap: {},
    categories: [],
    topProducts: [],
    weeklyByDay: [],
  };

  const weeklyRows = useMemo(
    () => reportData.weeklyByDay,
    [reportData.weeklyByDay],
  );

  const currentPaymentData = useMemo(() => {
    return PAYMENT_METHODS_CONFIG.map((config) => {
      const amount = reportData.paymentMap[config.key] ?? 0;
      return {
        method: config.label,
        amount,
        pct: reportData.current.ventas > 0
          ? parseFloat(((amount / reportData.current.ventas) * 100).toFixed(1))
          : 0,
        color: config.color,
      };
    }).filter((entry) => entry.amount > 0 || reportData.current.ventas === 0);
  }, [reportData.paymentMap, reportData.current.ventas]);

  const catMax = Math.max(1, ...reportData.categories.map((c) => c.v));
  const vsTrend = {
    ventas: reportData.previous.ventas > 0
      ? parseFloat((((reportData.current.ventas - reportData.previous.ventas) / reportData.previous.ventas) * 100).toFixed(1))
      : 0,
    tx: reportData.previous.tx > 0
      ? parseFloat((((reportData.current.tx - reportData.previous.tx) / reportData.previous.tx) * 100).toFixed(1))
      : 0,
    ticket: reportData.previous.avgTicket > 0
      ? parseFloat((((reportData.current.avgTicket - reportData.previous.avgTicket) / reportData.previous.avgTicket) * 100).toFixed(1))
      : 0,
    margen: reportData.current.margen - reportData.previous.margen,
  };

  const dateLabel = customDate
    ? new Date(`${customDate}T12:00:00`).toLocaleDateString("es-AR", {
        weekday: "long", day: "numeric", month: "long", year: "numeric",
      })
    : null;

  return (
    <div className="page-container">
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
            {(["hoy", "semana", "mes"] as const).map((tab) => (
              <button key={tab}
                className={`period-tab ${period === tab ? "active" : ""}`}
                onClick={() => { setPeriod(tab); setCustomDate(""); }}
              >
                {tab === "hoy" ? "Hoy" : tab === "semana" ? "Esta Semana" : "Este Mes"}
              </button>
            ))}
          </div>

          <div className="date-picker-wrap">
            <Calendar size={14} className="date-picker-icon" />
            <input type="date"
              className={`date-picker-input ${customDate ? "active" : ""}`}
              value={customDate} max={TODAY}
              onChange={(e) => { setCustomDate(e.target.value); if (e.target.value) setPeriod("custom"); }}
              title="Elegir fecha especifica"
            />
          </div>

          <button className="btn btn--ghost btn--sm"
            onClick={() => downloadReportePDF({
              period, ventas: reportData.current.ventas,
              tx: reportData.current.tx, avgTicket: reportData.current.avgTicket,
              payments: currentPaymentData, weeklyRows,
            })}
          >
            <Download size={14} /> Exportar PDF
          </button>
        </div>
      </div>

      <div className="stats-grid">
        <div className="stat-card stat-card--revenue animate-in animate-in-delay-1">
          <div className="stat-card__top">
            <div className="stat-card__icon stat-card__icon--revenue"><DollarSign size={20} /></div>
            <div className={`stat-card__trend stat-card__trend--${vsTrend.ventas >= 0 ? "up" : "down"}`}>
              {vsTrend.ventas >= 0 ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
              {Math.abs(vsTrend.ventas)}%
            </div>
          </div>
          <div className="stat-card__value">{formatCurrency(reportData.current.ventas)}</div>
          <div className="stat-card__label">Ventas Totales</div>
        </div>

        <div className="stat-card stat-card--orders animate-in animate-in-delay-2">
          <div className="stat-card__top">
            <div className="stat-card__icon stat-card__icon--orders"><ShoppingBag size={20} /></div>
            <div className={`stat-card__trend stat-card__trend--${vsTrend.tx >= 0 ? "up" : "down"}`}>
              {vsTrend.tx >= 0 ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
              {Math.abs(vsTrend.tx)}%
            </div>
          </div>
          <div className="stat-card__value">{formatNumber(reportData.current.tx)}</div>
          <div className="stat-card__label">Transacciones</div>
        </div>

        <div className="stat-card stat-card--ticket animate-in animate-in-delay-3">
          <div className="stat-card__top">
            <div className="stat-card__icon stat-card__icon--ticket"><Receipt size={20} /></div>
            <div className={`stat-card__trend stat-card__trend--${vsTrend.ticket >= 0 ? "up" : "down"}`}>
              {vsTrend.ticket >= 0 ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
              {Math.abs(vsTrend.ticket)}%
            </div>
          </div>
          <div className="stat-card__value">{formatCurrency(reportData.current.avgTicket)}</div>
          <div className="stat-card__label">Ticket Promedio</div>
        </div>

        <div className="stat-card stat-card--clients animate-in animate-in-delay-4">
          <div className="stat-card__top">
            <div className="stat-card__icon stat-card__icon--clients"><Percent size={20} /></div>
            <div className={`stat-card__trend stat-card__trend--${vsTrend.margen >= 0 ? "up" : "down"}`}>
              {vsTrend.margen >= 0 ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
              {Math.abs(vsTrend.margen)}pp
            </div>
          </div>
          <div className="stat-card__value">{reportData.current.margen}%</div>
          <div className="stat-card__label">Margen Real</div>
        </div>
      </div>

      <div className="dashboard-grid">
        <div className="card animate-in animate-in-delay-2">
          <div className="card__header">
            <div>
              <div className="card__title">Evolución de Ventas</div>
              <div className="card__subtitle">
                {period === "custom" || period === "hoy" ? "Por hora" : period === "semana" ? "Por dia" : "Por semana"}
              </div>
            </div>
            <BarChart3 size={16} style={{ color: "var(--text-muted)" }} />
          </div>
          {chartsReady && (
            <MeasuredChart height={280}>
              {({ width, height }) => (
                <AreaChart width={width} height={height} data={reportData.timeline} margin={{ top: 5, right: 10, left: -10, bottom: 0 }}>
                  <defs>
                    <linearGradient id="rGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#DC2626" stopOpacity={0.25} />
                      <stop offset="100%" stopColor="#DC2626" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border-light)" vertical={false} />
                  <XAxis dataKey="t" tick={{ fill: "var(--text-muted)", fontSize: 11 }} axisLine={{ stroke: "var(--border-light)" }} tickLine={false} />
                  <YAxis tick={{ fill: "var(--text-muted)", fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={(value) => `$${(value / 1000).toFixed(0)}k`} />
                  <Tooltip content={<PaymentTooltip />} />
                  <Area type="monotone" dataKey="v" stroke="#DC2626" strokeWidth={2.5} fill="url(#rGrad)" dot={false} activeDot={{ r: 5, stroke: "#DC2626", strokeWidth: 2, fill: "var(--bg-card)" }} />
                </AreaChart>
              )}
            </MeasuredChart>
          )}
        </div>

        <div className="card animate-in animate-in-delay-3">
          <div className="card__header">
            <div>
              <div className="card__title">Medios de Pago</div>
              <div className="card__subtitle">Distribución del período</div>
            </div>
          </div>
          {chartsReady && (
            <MeasuredChart height={160}>
              {({ width, height }) => (
                <PieChart width={width} height={height}>
                  <Pie
                    data={currentPaymentData.length > 0 ? currentPaymentData : [{ method: "Sin ventas", amount: 1, pct: 100, color: "var(--border-light)" }]}
                    cx="50%" cy="50%" innerRadius={45} outerRadius={68}
                    paddingAngle={currentPaymentData.length > 0 ? 3 : 0} dataKey="amount"
                  >
                    {(currentPaymentData.length > 0 ? currentPaymentData : [{ method: "Sin ventas", amount: 1, pct: 100, color: "var(--border-light)" }]).map((entry, idx) => (
                      <Cell key={idx} fill={entry.color} stroke="transparent" />
                    ))}
                  </Pie>
                </PieChart>
              )}
            </MeasuredChart>
          )}
          <div className="donut-legend">
            {currentPaymentData.length === 0 ? (
              <div className="donut-legend-item">
                <span className="donut-legend-label">Sin ventas registradas en el periodo</span>
              </div>
            ) : currentPaymentData.map((payment) => (
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
            ))}
          </div>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 16 }}>
        <div className="card animate-in animate-in-delay-2">
          <div className="card__header">
            <div>
              <div className="card__title">Ventas por Categoría</div>
              <div className="card__subtitle">Participación en el período</div>
            </div>
          </div>
          {reportData.categories.length === 0 ? (
            <div style={{ color: "var(--text-muted)", fontSize: "0.88rem" }}>
              Todavia no hay items vendidos para desglosar categorias en este periodo.
            </div>
          ) : reportData.categories.map((cat) => (
            <div key={cat.name} className="cat-bar-row">
              <span className="cat-emoji">{cat.emoji}</span>
              <span className="cat-name">{cat.name}</span>
              <div className="cat-bar-track">
                <div className="cat-bar-fill" style={{ width: `${Math.round((cat.v / catMax) * 100)}%`, background: cat.color }} />
              </div>
              <span className="cat-bar-value">{formatCurrency(cat.v)}</span>
            </div>
          ))}
        </div>

        <div className="card animate-in animate-in-delay-3">
          <div className="card__header">
            <div>
              <div className="card__title">Productos Más Vendidos</div>
              <div className="card__subtitle">Ranking del período</div>
            </div>
            {reportData.topProducts.length > 5 && (
              <button className="btn btn--ghost btn--sm" onClick={() => setShowAllProducts((v) => !v)}>
                {showAllProducts ? "Ver menos" : "Ver todos"} <ArrowUpRight size={13} />
              </button>
            )}
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
                ) : (showAllProducts ? reportData.topProducts : reportData.topProducts.slice(0, 5)).map((product, idx) => (
                  <tr key={`${product.name}_${idx}`}>
                    <td style={{ fontWeight: 700, color: idx < 3 ? "var(--primary)" : "var(--text-muted)", fontFamily: "var(--font-mono)" }}>
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
                    <td style={{ fontFamily: "var(--font-mono)", fontWeight: 600, color: "var(--text-primary)" }}>
                      {formatCurrency(product.rev)}
                    </td>
                    <td>
                      <span className={`badge ${product.margin >= 40 ? "badge--success" : product.margin >= 25 ? "badge--info" : "badge--warning"}`}>
                        {product.margin}%
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

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
                {row.today && <span style={{ marginLeft: 6, fontSize: "0.65rem", color: "var(--primary)", fontWeight: 700 }}>HOY</span>}
              </span>
              <div className="week-bar-wrap">
                <div className="week-bar-fill"
                  style={{ width: `${Math.round((row.v / Math.max(1, ...weeklyRows.map((r) => r.v))) * 100)}%` }}
                />
              </div>
              <span className="week-ventas">{formatCurrency(row.v)}</span>
              <span className="week-tx">{row.tx}</span>
              <span className="week-avg">{formatCurrency(row.tx > 0 ? Math.round(row.v / row.tx) : 0)}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
