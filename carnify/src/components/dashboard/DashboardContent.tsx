"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  DollarSign, ShoppingBag, Receipt, Users,
  TrendingUp, TrendingDown, ShoppingCart,
  UserPlus, Clock, ArrowUpRight, Package,
  AlertTriangle, Wallet, BarChart3, Activity,
  Boxes
} from "lucide-react";
import { formatCurrency, formatNumber } from "@/lib/constants";
import { useCajaStore, mapDbSessionToStore } from "@/stores/useCajaStore";
import { getCurrentSession } from "@/actions/caja";
import { getDashboardStats } from "@/actions/dashboard";
import { useSession } from "@/lib/auth-client";

type ChartPoint = { hour: string; ventas: number };
type WeeklyPoint = { day: string; ventas: number };
type PaymentSlice = { method: string; amount: number; percentage: number; color: string };
type RecentSale = {
  id: string;
  time: string;
  items: number;
  total: number;
  payment: string;
  client: string | null;
};
type DashboardData = {
  revenue: number;
  orders: number;
  ticket: number;
  clients: number;
  hasOpenCaja: boolean;
  profit: number;
  margin: number;
  costCoverage: number;
  stockValue: number;
  cajaToday: {
    isOpen: boolean;
    openedAt: Date | string | null;
    totalExpected: number;
    byMethod: { method: string; amount: number }[];
  };
  hourlySales: ChartPoint[];
  weeklySales: WeeklyPoint[];
  paymentBreakdown: PaymentSlice[];
  recentSales: RecentSale[];
  stockAlerts: {
    productId: string;
    product: string;
    emoji: string;
    stock: number;
    unit: string;
    threshold: number;
    status: string;
  }[];
  slowMovers: {
    productId: string;
    product: string;
    emoji: string;
    stock: number;
    unit: string;
    daysWithoutSales: number;
  }[];
  topProducts: {
    productId: string;
    name: string;
    emoji: string | null;
    category: string | null;
    quantity: number;
    unit: string;
    revenue: number;
    margin: number | null;
    tickets: number;
  }[];
  recentMovements: {
    id: string;
    type: string;
    product: string;
    emoji: string | null;
    quantity: number;
    unit: string;
    date: Date | string;
    reason: string | null;
  }[];
};

const PAYMENT_LABELS: Record<string, string> = {
  cash: "Efectivo",
  transfer: "Transferencia",
  card: "Tarjeta",
  link: "QR / Link",
  fiado: "Cuenta Cte.",
  mixed: "Mixto",
};

function labelPayment(method: string) {
  return PAYMENT_LABELS[method] ?? method;
}

// Mini grafico de barras 100% CSS — sin recharts ni JS de medicion.
// Render instantaneo y casi cero costo de CPU (clave en PCs de gama baja).
function MiniBars({ points, variant }: {
  points: { label: string; value: number }[];
  variant?: "week";
}) {
  if (points.length === 0) {
    return <div className="bar-chart__empty">Sin datos todavia</div>;
  }
  const max = Math.max(1, ...points.map((p) => p.value));
  return (
    <div className="bar-chart">
      {points.map((p, idx) => (
        <div className="bar-chart__col" key={`${p.label}-${idx}`}>
          <div className="bar-chart__track">
            <div
              className={`bar-chart__bar${variant === "week" ? " bar-chart__bar--week" : ""}`}
              style={{ height: `${Math.round((p.value / max) * 100)}%` }}
              title={`${p.label}: ${formatCurrency(p.value)}`}
            />
          </div>
          <span className="bar-chart__label">{p.label}</span>
        </div>
      ))}
    </div>
  );
}

function StatCard({ stat, type }: {
  stat: { value: number; trend: number; trendDirection: "up" | "down"; label: string };
  type: "revenue" | "orders" | "ticket" | "clients";
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
    <div className={`stat-card stat-card--${type}`}>
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

function OpsMetric({ icon, label, value, detail, tone }: {
  icon: React.ReactNode;
  label: string;
  value: string;
  detail: string;
  tone: "good" | "warn" | "info" | "danger";
}) {
  return (
    <div className={`ops-metric ops-metric--${tone}`}>
      <div className="ops-metric__icon">{icon}</div>
      <div className="ops-metric__content">
        <span className="ops-metric__label">{label}</span>
        <strong className="ops-metric__value">{value}</strong>
        <span className="ops-metric__detail">{detail}</span>
      </div>
    </div>
  );
}

function OperationsStrip({ data }: { data: DashboardData }) {
  const stockTone = data.stockAlerts.some((item) => item.status === "out") ? "danger" : data.stockAlerts.length > 0 ? "warn" : "good";
  const marginTone = data.costCoverage === 0 ? "warn" : data.margin >= 25 ? "good" : "info";

  return (
    <div className="ops-strip">
      <OpsMetric
        icon={<Wallet size={20} />}
        label="Caja del dia"
        value={data.cajaToday.isOpen ? formatCurrency(data.cajaToday.totalExpected) : "Caja cerrada"}
        detail={data.cajaToday.isOpen ? "Teorico actual sin cuenta corriente" : "Abrir caja para operar POS"}
        tone={data.cajaToday.isOpen ? "good" : "danger"}
      />
      <OpsMetric
        icon={<AlertTriangle size={20} />}
        label="Alertas de stock"
        value={`${data.stockAlerts.length}`}
        detail={data.stockAlerts.length > 0 ? "Productos bajo minimo o sin stock" : "Inventario sin alertas criticas"}
        tone={stockTone}
      />
      <OpsMetric
        icon={<BarChart3 size={20} />}
        label="Margen bruto"
        value={data.costCoverage > 0 ? `${data.margin}%` : "Sin costo"}
        detail={data.costCoverage > 0 ? `${data.costCoverage}% de ventas con costo cargado` : "Cargar costos para rentabilidad"}
        tone={marginTone}
      />
      <OpsMetric
        icon={<Boxes size={20} />}
        label="Valor de stock"
        value={formatCurrency(data.stockValue)}
        detail="Valorizado por precio de venta"
        tone="info"
      />
    </div>
  );
}

function LiveClock() {
  const [time, setTime] = useState<Date>(() => new Date());
  useEffect(() => {
    // Tick por minuto (no por segundo): menos re-renders en CPU de gama baja.
    const t = setInterval(() => setTime(new Date()), 30000);
    return () => clearInterval(t);
  }, []);
  const tz = "America/Argentina/Buenos_Aires";
  return (
    <div className="live-clock">
      <Clock size={16} style={{ color: "var(--text-tertiary)" }} />
      <div>
        <div className="live-clock__time" suppressHydrationWarning>
          {time.toLocaleTimeString("es-AR", { hour: "2-digit", minute: "2-digit", timeZone: tz })}
        </div>
        <div className="live-clock__date" style={{ textTransform: "capitalize" }} suppressHydrationWarning>
          {time.toLocaleDateString("es-AR", { weekday: "long", day: "numeric", month: "long", timeZone: tz })}
        </div>
      </div>
    </div>
  );
}

function WeeklyChart({ data }: { data: WeeklyPoint[] }) {
  const points = data.map((d) => ({ label: d.day, value: d.ventas }));
  return (
    <div className="card">
      <div className="card__header">
        <div>
          <div className="card__title">Ventas Semanales</div>
          <div className="card__subtitle">Últimos 7 días</div>
        </div>
      </div>
      <MiniBars points={points} variant="week" />
    </div>
  );
}

function SalesChart({ data }: { data: ChartPoint[] }) {
  const points = data.map((d) => ({ label: d.hour, value: d.ventas }));
  return (
    <div className="card">
      <div className="card__header">
        <div>
          <div className="card__title">Ventas Hoy</div>
          <div className="card__subtitle">Evolución por hora</div>
        </div>
      </div>
      <MiniBars points={points} />
    </div>
  );
}

function RightPanel({ paymentData }: { paymentData: PaymentSlice[] }) {
  const router = useRouter();
  const actions = [
    { icon: <ShoppingCart size={18} />, cls: "pos", title: "Nueva Venta", desc: "Abrir punto de venta", href: "/pos" },
    { icon: <UserPlus size={18} />, cls: "client", title: "Nuevo Cliente", desc: "Registrar cliente", href: "/clientes" },
  ];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      {/* Quick Actions */}
      <div className="card">
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

      {/* Payment Breakdown — barras horizontales CSS (sin torta recharts) */}
      <div className="card">
        <div className="card__header">
          <div className="card__title">Medios de Pago</div>
          <div className="card__subtitle">Distribución del día</div>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 12, marginTop: 4 }}>
          {paymentData.length === 0 && (
            <div style={{ textAlign: "center", color: "var(--text-muted)", fontSize: "0.8rem", width: "100%" }}>
              Aún no hay ventas en la caja actual
            </div>
          )}
          {paymentData.map((p) => (
            <div key={p.method}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", fontSize: "0.8rem" }}>
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
              <div className="pay-bar">
                <div className="pay-bar__fill" style={{ width: `${p.percentage}%`, background: p.color }} />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function RecentSalesCard({ sales }: { sales: RecentSale[] }) {
  const router = useRouter();
  return (
    <div className="card">
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
                    sale.payment === "cash" ? "badge--success" :
                    sale.payment === "transfer" ? "badge--info" :
                    sale.payment === "card" ? "badge--warning" :
                    "badge--neutral"
                  }`}>
                    {labelPayment(sale.payment)}
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

function TopProductsCard({ products }: { products: DashboardData["topProducts"] }) {
  return (
    <div className="card dashboard-list-card">
      <div className="card__header">
        <div>
          <div className="card__title">Productos mas vendidos</div>
          <div className="card__subtitle">Ranking real del dia por facturacion</div>
        </div>
      </div>
      <div className="dashboard-list">
        {products.length === 0 ? (
          <div className="dashboard-empty-line">
            <ShoppingBag size={18} /> Sin ventas registradas hoy
          </div>
        ) : products.map((product, index) => (
          <div key={`${product.productId}-${product.name}`} className="dashboard-rank-row">
            <span className="dashboard-rank-row__rank">{index + 1}</span>
            <span className="dashboard-rank-row__emoji">{product.emoji ?? "#"}</span>
            <div className="dashboard-rank-row__info">
              <strong>{product.name}</strong>
              <span>{formatNumber(product.quantity)} {product.unit} - {product.tickets} tickets</span>
            </div>
            <div className="dashboard-rank-row__value">
              <strong>{formatCurrency(product.revenue)}</strong>
              <span>{product.margin == null ? "sin costo" : `${product.margin}% margen`}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function StockAlertsCard({ alerts, slowMovers }: {
  alerts: DashboardData["stockAlerts"];
  slowMovers: DashboardData["slowMovers"];
}) {
  return (
    <div className="card dashboard-list-card">
      <div className="card__header">
        <div>
          <div className="card__title">Alertas operativas</div>
          <div className="card__subtitle">Stock bajo, sin stock y sin movimiento</div>
        </div>
      </div>
      <div className="dashboard-alert-stack">
        {alerts.length === 0 ? (
          <div className="dashboard-empty-line">
            <Package size={18} /> No hay productos bajo minimo
          </div>
        ) : alerts.slice(0, 5).map((item) => (
          <div key={item.productId} className={`dashboard-alert-row dashboard-alert-row--${item.status}`}>
            <div className="dashboard-alert-row__main">
              <span>{item.emoji}</span>
              <div>
                <strong>{item.product}</strong>
                <p>{item.status === "out" ? "Sin stock disponible" : `Minimo sugerido ${formatNumber(item.threshold)} ${item.unit}`}</p>
              </div>
            </div>
            <strong>{formatNumber(item.stock)} {item.unit}</strong>
          </div>
        ))}
        {slowMovers.length > 0 && (
          <div className="dashboard-slow-box">
            <div className="dashboard-slow-box__title">
              <Activity size={16} /> Sin ventas en 30 dias
            </div>
            <div className="dashboard-slow-box__chips">
              {slowMovers.slice(0, 4).map((item) => (
                <span key={item.productId}>{item.emoji} {item.product}</span>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function CajaPanel({ data }: { data: DashboardData }) {
  return (
    <div className="card dashboard-list-card">
      <div className="card__header">
        <div>
          <div className="card__title">Caja del dia</div>
          <div className="card__subtitle">Control teorico por medio de pago</div>
        </div>
      </div>
      {!data.cajaToday.isOpen ? (
        <div className="dashboard-empty-line dashboard-empty-line--danger">
          <AlertTriangle size={18} /> Caja cerrada: el POS no puede vender
        </div>
      ) : (
        <div className="dashboard-list">
          <div className="dashboard-cash-total">
            <span>Total teorico</span>
            <strong>{formatCurrency(data.cajaToday.totalExpected)}</strong>
          </div>
          {data.cajaToday.byMethod.map((row) => (
            <div key={row.method} className="dashboard-cash-row">
              <span>{labelPayment(row.method)}</span>
              <strong>{formatCurrency(row.amount)}</strong>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function DashboardSkeleton() {
  return (
    <div className="page-container" aria-busy="true" aria-label="Cargando tablero">
      <div className="page-header">
        <div className="page-header__left" style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <div className="skeleton" style={{ width: 150, height: 14 }} />
          <div className="skeleton" style={{ width: 240, height: 30 }} />
        </div>
        <div className="page-header__right" style={{ display: "flex", gap: 12 }}>
          <div className="skeleton" style={{ width: 130, height: 44, borderRadius: 12 }} />
          <div className="skeleton" style={{ width: 140, height: 44, borderRadius: 12 }} />
        </div>
      </div>

      <div className="ops-strip">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="skeleton-card" style={{ flexDirection: "row", alignItems: "center", gap: 14 }}>
            <div className="skeleton" style={{ width: 40, height: 40, borderRadius: 12, flexShrink: 0 }} />
            <div style={{ display: "flex", flexDirection: "column", gap: 8, flex: 1 }}>
              <div className="skeleton" style={{ width: "55%", height: 10 }} />
              <div className="skeleton" style={{ width: "70%", height: 18 }} />
            </div>
          </div>
        ))}
      </div>

      <div className="stats-grid">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="skeleton-card">
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <div className="skeleton" style={{ width: 40, height: 40, borderRadius: 12 }} />
              <div className="skeleton" style={{ width: 48, height: 22, borderRadius: 999 }} />
            </div>
            <div className="skeleton" style={{ width: "65%", height: 26, marginTop: 4 }} />
            <div className="skeleton" style={{ width: "45%", height: 12 }} />
          </div>
        ))}
      </div>

      <div className="dashboard-grid">
        <div className="skeleton-card" style={{ minHeight: 320 }}>
          <div className="skeleton" style={{ width: 160, height: 16 }} />
          <div className="skeleton" style={{ flex: 1, minHeight: 240, marginTop: 8 }} />
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <div className="skeleton-card" style={{ minHeight: 150 }}>
            <div className="skeleton" style={{ width: 130, height: 14 }} />
            <div className="skeleton" style={{ flex: 1, minHeight: 90, marginTop: 8 }} />
          </div>
          <div className="skeleton-card" style={{ minHeight: 150 }}>
            <div className="skeleton" style={{ width: 130, height: 14 }} />
            <div className="skeleton" style={{ flex: 1, minHeight: 90, marginTop: 8 }} />
          </div>
        </div>
      </div>
    </div>
  );
}

export default function DashboardContent() {
  const router = useRouter();
  const { hydrate } = useCajaStore();
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const loadSession = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      // Las dos consultas son independientes: en paralelo carga mas rapido.
      const [s, stats] = await Promise.all([getCurrentSession(), getDashboardStats()]);
      hydrate(s ? mapDbSessionToStore(s) : null, []);
      setDashboardData(stats as DashboardData);
    } catch (error) {
      setLoadError(error instanceof Error ? error.message : "No se pudo cargar el dashboard.");
    } finally {
      setLoading(false);
    }
  }, [hydrate]);

  useEffect(() => { void loadSession(); }, [loadSession]);

  const { data: session } = useSession();

  const greeting = () => {
    const h = new Date().getHours();
    if (h < 12) return "Buenos días";
    if (h < 18) return "Buenas tardes";
    return "Buenas noches";
  };

  const userName = session?.user?.name?.split(" ")[0] || "Usuario";

  const realData = dashboardData ?? {
    revenue: 0, orders: 0, ticket: 0, clients: 0,
    hasOpenCaja: false,
    profit: 0,
    margin: 0,
    costCoverage: 0,
    stockValue: 0,
    cajaToday: { isOpen: false, openedAt: null, totalExpected: 0, byMethod: [] },
    hourlySales: [] as ChartPoint[],
    weeklySales: [] as WeeklyPoint[],
    paymentBreakdown: [] as PaymentSlice[],
    recentSales: [] as RecentSale[],
    stockAlerts: [],
    slowMovers: [],
    topProducts: [],
    recentMovements: [],
  };

  if (loading) {
    return <DashboardSkeleton />;
  }

  if (loadError) {
    return (
      <div className="page-container">
        <div className="card dashboard-error-card">
          <AlertTriangle size={24} />
          <div>
            <strong>No se pudo cargar el dashboard</strong>
            <p>{loadError}</p>
          </div>
          <button className="btn btn--primary btn--sm" onClick={() => void loadSession()}>
            Reintentar
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="page-container">
      {/* Header */}
      <div className="page-header">
        <div className="page-header__left">
          <div className="page-header__greeting">
            {greeting()}, {userName}
            {!realData.hasOpenCaja && realData.revenue > 0 && (
              <span className="badge badge--warning" style={{ marginLeft: 12, fontSize: "0.7rem", verticalAlign: "middle" }}>
                Caja cerrada
              </span>
            )}
          </div>
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

      <OperationsStrip data={realData} />

      {/* Stats */}
      <div className="stats-grid">
        <StatCard stat={{ label: "Ventas del Día", value: realData.revenue, trend: 0, trendDirection: "up" }} type="revenue" />
        <StatCard stat={{ label: "Transacciones", value: realData.orders, trend: 0, trendDirection: "up" }} type="orders" />
        <StatCard stat={{ label: "Ticket Promedio", value: realData.ticket, trend: 0, trendDirection: "up" }} type="ticket" />
        <StatCard stat={{ label: "Clientes Atendidos", value: realData.clients, trend: 0, trendDirection: "up" }} type="clients" />
      </div>

      {/* Left: Charts | Right: Quick Actions + Payment + Weekly */}
      <div className="dashboard-grid">
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <SalesChart data={realData.hourlySales} />
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <RightPanel paymentData={realData.paymentBreakdown} />
          <WeeklyChart data={realData.weeklySales} />
        </div>
      </div>

      <div className="dashboard-ops-grid">
        <TopProductsCard products={realData.topProducts} />
        <StockAlertsCard alerts={realData.stockAlerts} slowMovers={realData.slowMovers} />
        <CajaPanel data={realData} />
      </div>

      {/* Recent Sales */}
      <div style={{ marginBottom: 24 }}>
        <RecentSalesCard sales={realData.recentSales} />
      </div>

    </div>
  );
}
