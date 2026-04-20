"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  DollarSign, ShoppingBag, Receipt, Users,
  TrendingUp, TrendingDown, ShoppingCart,
  UserPlus, Clock, ArrowUpRight
} from "lucide-react";
import {
  AreaChart, Area, XAxis, YAxis,
  CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell,
} from "recharts";
import {
  MOCK_STATS, MOCK_HOURLY_SALES,
  MOCK_RECENT_SALES, MOCK_PAYMENT_BREAKDOWN, MOCK_WEEKLY_SALES,
  formatCurrency, formatNumber,
} from "@/lib/constants";

function CustomTooltip({ active, payload, label }: any) {
  if (active && payload && payload.length) {
    return (
      <div style={{
        background: "var(--bg-elevated)",
        border: "1px solid var(--border)",
        borderRadius: "var(--radius-md)",
        padding: "10px 14px",
        fontSize: "0.8rem",
        boxShadow: "var(--shadow-lg)",
      }}>
        <p style={{ color: "var(--text-tertiary)", marginBottom: 4 }}>{label}</p>
        {payload.map((entry: any, idx: number) => (
          <p key={idx} style={{ color: entry.color, fontWeight: 600 }}>
            {entry.name === "ventas" ? formatCurrency(entry.value) : entry.value}
          </p>
        ))}
      </div>
    );
  }
  return null;
}

function StatCard({ stat, type, delay }: {
  stat: { value: number; trend: number; trendDirection: "up" | "down"; label: string };
  type: "revenue" | "orders" | "ticket" | "clients";
  delay: number;
}) {
  const icons = {
    revenue: <DollarSign size={20} />,
    orders: <ShoppingBag size={20} />,
    ticket: <Receipt size={20} />,
    clients: <Users size={20} />,
  };

  const formattedValue = type === "orders" || type === "clients"
    ? formatNumber(stat.value)
    : formatCurrency(stat.value);

  return (
    <div className={`stat-card stat-card--${type} animate-in animate-in-delay-${delay}`}>
      <div className="stat-card__top">
        <div className={`stat-card__icon stat-card__icon--${type}`}>{icons[type]}</div>
        <div className={`stat-card__trend stat-card__trend--${stat.trendDirection}`}>
          {stat.trendDirection === "up" ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
          {Math.abs(stat.trend)}%
        </div>
      </div>
      <div className="stat-card__value">{formattedValue}</div>
      <div className="stat-card__label">{stat.label}</div>
    </div>
  );
}

function LiveClock() {
  const [time, setTime] = useState<Date | null>(null);
  useEffect(() => {
    setTime(new Date());
    const t = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(t);
  }, []);
  const tz = "America/Argentina/Buenos_Aires";
  return (
    <div className="live-clock">
      <Clock size={16} style={{ color: "var(--text-tertiary)" }} />
      <div>
        <div className="live-clock__time">
          {time?.toLocaleTimeString("es-AR", { hour: "2-digit", minute: "2-digit", second: "2-digit", timeZone: tz }) ?? ""}
        </div>
        <div className="live-clock__date" style={{ textTransform: "capitalize" }}>
          {time?.toLocaleDateString("es-AR", { weekday: "long", day: "numeric", month: "long", timeZone: tz }) ?? ""}
        </div>
      </div>
    </div>
  );
}

function SalesChart() {
  const [view, setView] = useState<"hourly" | "weekly">("hourly");
  const data = view === "hourly" ? MOCK_HOURLY_SALES : MOCK_WEEKLY_SALES;
  const xKey = view === "hourly" ? "hour" : "day";

  return (
    <div className="card animate-in animate-in-delay-2">
      <div className="card__header">
        <div>
          <div className="card__title">Ventas</div>
          <div className="card__subtitle">
            {view === "hourly" ? "Hoy por hora" : "Última semana"}
          </div>
        </div>
        <div style={{ display: "flex", gap: 4 }}>
          <button
            className={`btn btn--sm ${view === "hourly" ? "btn--primary" : "btn--ghost"}`}
            onClick={() => setView("hourly")}
          >
            Hoy
          </button>
          <button
            className={`btn btn--sm ${view === "weekly" ? "btn--primary" : "btn--ghost"}`}
            onClick={() => setView("weekly")}
          >
            Semana
          </button>
        </div>
      </div>
      <div className="chart-container">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data as any[]} margin={{ top: 5, right: 10, left: -10, bottom: 0 }}>
            <defs>
              <linearGradient id="salesGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#DC2626" stopOpacity={0.3} />
                <stop offset="100%" stopColor="#DC2626" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border-light)" vertical={false} />
            <XAxis
              dataKey={xKey}
              tick={{ fill: "var(--text-muted)", fontSize: 11 }}
              axisLine={{ stroke: "var(--border-light)" }}
              tickLine={false}
            />
            <YAxis
              tick={{ fill: "var(--text-muted)", fontSize: 11 }}
              axisLine={false}
              tickLine={false}
              tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`}
            />
            <Tooltip content={<CustomTooltip />} />
            <Area
              type="monotone"
              dataKey="ventas"
              stroke="#DC2626"
              strokeWidth={2.5}
              fill="url(#salesGradient)"
              dot={false}
              activeDot={{ r: 5, stroke: "#DC2626", strokeWidth: 2, fill: "var(--bg-card)" }}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

function RightPanel() {
  const router = useRouter();

  const actions = [
    { icon: <ShoppingCart size={18} />, cls: "pos", title: "Nueva Venta", desc: "Abrir punto de venta", href: "/pos" },
{ icon: <UserPlus size={18} />, cls: "client", title: "Nuevo Cliente", desc: "Registrar cliente", href: "/clientes" },
  ];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      {/* Quick Actions */}
      <div className="card animate-in animate-in-delay-3">
        <div className="card__header">
          <div className="card__title">Acciones Rápidas</div>
        </div>
        <div className="quick-actions">
          {actions.map((a) => (
            <button
              key={a.href + a.title}
              className="quick-action"
              style={{ background: "none", border: "1px solid var(--border-light)", cursor: "pointer", width: "100%", textAlign: "left" }}
              onClick={() => router.push(a.href)}
            >
              <div className={`quick-action__icon quick-action__icon--${a.cls}`}>{a.icon}</div>
              <div className="quick-action__info">
                <div className="quick-action__title">{a.title}</div>
                <div className="quick-action__desc">{a.desc}</div>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Payment Breakdown */}
      <div className="card animate-in animate-in-delay-4">
        <div className="card__header">
          <div className="card__title">Medios de Pago</div>
          <div className="card__subtitle">Distribución del día</div>
        </div>
        <div style={{ height: 130, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={MOCK_PAYMENT_BREAKDOWN}
                cx="50%"
                cy="50%"
                innerRadius={38}
                outerRadius={56}
                paddingAngle={3}
                dataKey="amount"
              >
                {MOCK_PAYMENT_BREAKDOWN.map((entry, idx) => (
                  <Cell key={idx} fill={entry.color} stroke="transparent" />
                ))}
              </Pie>
            </PieChart>
          </ResponsiveContainer>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 4 }}>
          {MOCK_PAYMENT_BREAKDOWN.map((p) => (
            <div key={p.method} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", fontSize: "0.8rem" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <div style={{ width: 8, height: 8, borderRadius: "50%", background: p.color }} />
                <span style={{ color: "var(--text-secondary)" }}>{p.method}</span>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <span style={{ color: "var(--text-tertiary)", fontSize: "0.75rem" }}>{p.percentage}%</span>
                <span style={{ fontFamily: "var(--font-mono)", fontWeight: 600, color: "var(--text-primary)", minWidth: 80, textAlign: "right" }}>
                  {formatCurrency(p.amount)}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}



function RecentSalesCard() {
  const router = useRouter();
  return (
    <div className="card animate-in animate-in-delay-2">
      <div className="card__header">
        <div>
          <div className="card__title">Últimas Ventas</div>
          <div className="card__subtitle">Transacciones recientes</div>
        </div>
        <button className="btn btn--ghost btn--sm" onClick={() => router.push("/caja")}>
          Ver todas <ArrowUpRight size={14} />
        </button>
      </div>
      <div className="table-wrapper">
        <table className="data-table">
          <thead>
            <tr>
              <th>Ticket</th>
              <th>Hora</th>
              <th>Ítems</th>
              <th>Total</th>
              <th>Pago</th>
              <th>Cliente</th>
            </tr>
          </thead>
          <tbody>
            {MOCK_RECENT_SALES.slice(0, 4).map((sale) => (
              <tr key={sale.id}>
                <td style={{ fontFamily: "var(--font-mono)", fontWeight: 600, color: "var(--primary)" }}>
                  {sale.id}
                </td>
                <td style={{ fontFamily: "var(--font-mono)" }}>{sale.time}</td>
                <td>{sale.items}</td>
                <td style={{ fontFamily: "var(--font-mono)", fontWeight: 600, color: "var(--text-primary)" }}>
                  {formatCurrency(sale.total)}
                </td>
                <td>
                  <span className={`badge ${
                    sale.payment === "Efectivo" ? "badge--success" :
                    sale.payment === "Transferencia" ? "badge--info" :
                    sale.payment === "Tarjeta" ? "badge--warning" :
                    "badge--neutral"
                  }`}>
                    {sale.payment === "Cuenta Corriente" ? "Cta. Cte." : sale.payment}
                  </span>
                </td>
                <td style={{ color: sale.client ? "var(--text-primary)" : "var(--text-muted)" }}>
                  {sale.client || "Consumidor final"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default function DashboardContent() {
  const router = useRouter();
  const greeting = () => {
    const h = new Date().getHours();
    if (h < 12) return "Buenos días";
    if (h < 18) return "Buenas tardes";
    return "Buenas noches";
  };

  return (
    <div className="page-container">
      {/* Header */}
      <div className="page-header animate-in">
        <div className="page-header__left">
          <div className="page-header__greeting">{greeting()}, Administrador 👋</div>
          <h1 className="page-header__title">
            Panel de <span>Control</span>
          </h1>
        </div>
        <div className="page-header__right">
          <LiveClock />
          <button className="btn btn--primary" onClick={() => router.push("/pos")}>
            <ShoppingCart size={16} /> Nueva Venta
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="stats-grid">
        <StatCard stat={MOCK_STATS.revenue} type="revenue" delay={1} />
        <StatCard stat={MOCK_STATS.orders} type="orders" delay={2} />
        <StatCard stat={MOCK_STATS.avgTicket} type="ticket" delay={3} />
        <StatCard stat={MOCK_STATS.clients} type="clients" delay={4} />
      </div>

      {/* Chart + Quick Actions */}
      <div className="dashboard-grid">
        <SalesChart />
        <RightPanel />
      </div>

      {/* Recent Sales */}
      <div style={{ marginBottom: 24 }}>
        <RecentSalesCard />
      </div>

    </div>
  );
}
