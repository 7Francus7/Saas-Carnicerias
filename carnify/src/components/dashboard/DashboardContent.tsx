"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
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
import { formatCurrency, formatNumber } from "@/lib/constants";
import { useCajaStore, mapDbSessionToStore } from "@/stores/useCajaStore";
import { getCurrentSession } from "@/actions/caja";
import { useSession } from "@/lib/auth-client";

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
        <div className={`stat-card__trend stat-card__trend--${stat.trendDirection}`} style={{ visibility: stat.trend === 0 ? "hidden" : "visible" }}>
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

function SalesChart({ data }: { data: any[] }) {
  const displayData = data.length > 0 ? data : [{ hour: "08:00", ventas: 0 }, { hour: "20:00", ventas: 0 }];

  return (
    <div className="card animate-in animate-in-delay-2">
      <div className="card__header">
        <div>
          <div className="card__title">Ventas Hoy</div>
          <div className="card__subtitle">Evolución por hora</div>
        </div>
      </div>
      <div className="chart-container">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={displayData} margin={{ top: 5, right: 10, left: -10, bottom: 0 }}>
            <defs>
              <linearGradient id="salesGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#DC2626" stopOpacity={0.3} />
                <stop offset="100%" stopColor="#DC2626" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border-light)" vertical={false} />
            <XAxis
              dataKey="hour"
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

function RightPanel({ paymentData }: { paymentData: any[] }) {
  const router = useRouter();
  const actions = [
    { icon: <ShoppingCart size={18} />, cls: "pos", title: "Nueva Venta", desc: "Abrir punto de venta", href: "/pos" },
    { icon: <UserPlus size={18} />, cls: "client", title: "Nuevo Cliente", desc: "Registrar cliente", href: "/clientes" },
  ];

  const emptyData = [{ method: "Sin registros", amount: 1, color: "var(--border-light)", percentage: 100 }];

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
                data={paymentData.length > 0 ? paymentData : emptyData}
                cx="50%"
                cy="50%"
                innerRadius={38}
                outerRadius={56}
                paddingAngle={paymentData.length > 0 ? 3 : 0}
                dataKey="amount"
                stroke="none"
              >
                {(paymentData.length > 0 ? paymentData : emptyData).map((entry, idx) => (
                  <Cell key={idx} fill={entry.color} stroke="transparent" />
                ))}
              </Pie>
            </PieChart>
          </ResponsiveContainer>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 4 }}>
          {paymentData.length === 0 && (
            <div style={{ textAlign: "center", color: "var(--text-muted)", fontSize: "0.8rem", width: "100%" }}>
              Aún no hay ventas en la caja actual
            </div>
          )}
          {paymentData.map((p) => (
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

function RecentSalesCard({ sales }: { sales: any[] }) {
  const router = useRouter();
  return (
    <div className="card animate-in animate-in-delay-2">
      <div className="card__header">
        <div>
          <div className="card__title">Últimas Ventas</div>
          <div className="card__subtitle">Transacciones de la caja actual</div>
        </div>
        {sales.length > 0 && (
          <button className="btn btn--ghost btn--sm" onClick={() => router.push("/caja")}>
            Ver todas <ArrowUpRight size={14} />
          </button>
        )}
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
            {sales.length === 0 && (
              <tr>
                <td colSpan={6} style={{ textAlign: "center", padding: "32px 0", color: "var(--text-muted)", borderBottom: "none" }}>
                  No se han registrado transacciones todavía. <br/>
                  <button className="btn btn--primary btn--sm" style={{ marginTop: 12, margin: "16px auto 0" }} onClick={() => router.push("/pos")}>
                    Ir al Punto de Venta
                  </button>
                </td>
              </tr>
            )}
            {sales.slice(0, 4).map((sale) => (
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
  const { currentSession, hydrate } = useCajaStore();

  const loadSession = useCallback(async () => {
    const s = await getCurrentSession();
    if (s) hydrate(mapDbSessionToStore(s), []);
    else hydrate(null, []);
  }, [hydrate]);

  useEffect(() => { loadSession(); }, [loadSession]);

  const { data: session } = useSession();

  const greeting = () => {
    const h = new Date().getHours();
    if (h < 12) return "Buenos días";
    if (h < 18) return "Buenas tardes";
    return "Buenas noches";
  };

  const userName = session?.user?.name?.split(" ")[0] || "Usuario";

  const realData = useMemo(() => {
    if (!currentSession || currentSession.ventas.length === 0) {
      return {
        revenue: 0, orders: 0, ticket: 0, clients: 0,
        hourlySales: [], recentSales: [], paymentBreakdown: []
      };
    }

    const ventas = currentSession.ventas.reduce((acc, v) => acc + v.total, 0);
    const orders = currentSession.ventas.length;
    let uniqueClients = new Set(currentSession.ventas.filter(v => v.clientId).map(v => v.clientId)).size;
    
    // Si hubo ventas pero no registraron cliente, asumimos al menos 1 publico general
    if (uniqueClients === 0 && orders > 0) uniqueClients = 1; 

    const ticket = orders > 0 ? Math.round(ventas / orders) : 0;
    
    // Evolutivo por hora
    const mapHourly: Record<string, number> = {};
    currentSession.ventas.forEach(v => {
        const h = new Date(v.timestamp).getHours().toString().padStart(2, '0') + ':00';
        mapHourly[h] = (mapHourly[h] ?? 0) + v.total;
    });
    
    const hourlySales = Object.entries(mapHourly)
      .map(([hour, val]) => ({ hour, ventas: val }))
      .sort((a,b) => a.hour.localeCompare(b.hour));

    // Distribucion de medios de pago
    const paymentMap: Record<string, number> = {};
    currentSession.ventas.forEach(v => {
      if (v.splits) {
        v.splits.forEach(sp => { paymentMap[sp.method] = (paymentMap[sp.method] ?? 0) + sp.amount; });
      } else {
        paymentMap[v.method] = (paymentMap[v.method] ?? 0) + v.total;
      }
    });

    const colors: any = {
      "Efectivo": "#22C55E",
      "Transferencia": "#3B82F6",
      "Tarjeta": "#F59E0B",
      "QR / Link": "#A855F7",
      "Cuenta Corriente": "#EF4444"
    };

    const paymentBreakdown = Object.entries(paymentMap).map(([m, val]) => ({
       method: m, amount: val, percentage: ventas > 0 ? parseFloat(((val/ventas)*100).toFixed(1)) : 0, color: colors[m] || "#888"
    })).sort((a,b) => b.amount - a.amount);

    // ultimas transacciones (top 5)
    const recentSales = [...currentSession.ventas].reverse().map(v => ({
       id: `TK-${v.id.substring(0,4).toUpperCase()}`,
       time: new Date(v.timestamp).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'}),
       items: v.itemCount || 1,
       total: v.total,
       payment: v.method,
       client: v.clientName || null
    }));

    return { revenue: ventas, orders, ticket, clients: uniqueClients, hourlySales, recentSales, paymentBreakdown };
  }, [currentSession]);


  return (
    <div className="page-container">
      {/* Header */}
      <div className="page-header animate-in">
        <div className="page-header__left">
          <div className="page-header__greeting">{greeting()}, {userName}</div>
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

      {/* Stats - Conectados a Datos Reales */}
      <div className="stats-grid">
        <StatCard stat={{ label: "Ventas del Día", value: realData.revenue, trend: 0, trendDirection: "up" }} type="revenue" delay={1} />
        <StatCard stat={{ label: "Transacciones", value: realData.orders, trend: 0, trendDirection: "up" }} type="orders" delay={2} />
        <StatCard stat={{ label: "Ticket Promedio", value: realData.ticket, trend: 0, trendDirection: "up" }} type="ticket" delay={3} />
        <StatCard stat={{ label: "Clientes Atendidos", value: realData.clients, trend: 0, trendDirection: "up" }} type="clients" delay={4} />
      </div>

      {/* Chart + Quick Actions */}
      <div className="dashboard-grid">
        <SalesChart data={realData.hourlySales} />
        <RightPanel paymentData={realData.paymentBreakdown} />
      </div>

      {/* Recent Sales */}
      <div style={{ marginBottom: 24 }}>
        <RecentSalesCard sales={realData.recentSales} />
      </div>

    </div>
  );
}
