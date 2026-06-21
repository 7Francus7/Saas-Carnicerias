"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import {
  DollarSign, ShoppingBag, Receipt, Users,
  TrendingUp, TrendingDown, ShoppingCart,
  UserPlus, Clock, ArrowUpRight, Package,
  AlertTriangle, Wallet, BarChart3, Activity,
  Boxes, RefreshCw
} from "lucide-react";
import {
  AreaChart, Area, XAxis, YAxis,
  CartesianGrid, Tooltip, PieChart, Pie, Cell,
} from "recharts";
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
type TooltipEntry = { color?: string; name?: string; value?: number };

type DashboardData = {
  revenue: number;
  orders: number;
  productCount: number;
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

function CustomTooltip({ active, payload, label }: {
  active?: boolean;
  payload?: TooltipEntry[];
  label?: string;
}) {
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
        {payload.map((entry, idx: number) => (
          <p key={idx} style={{ color: entry.color, fontWeight: 600 }}>
            {entry.name === "ventas" ? formatCurrency(entry.value ?? 0) : entry.value}
          </p>
        ))}
      </div>
    );
  }
  return null;
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
    <div className="ops-strip animate-in animate-in-delay-1">
      <OpsMetric
        icon={<Wallet size={20} />}
        label="Caja del día"
        value={data.cajaToday.isOpen ? formatCurrency(data.cajaToday.totalExpected) : "Caja cerrada"}
        detail={data.cajaToday.isOpen ? "Teórico actual sin cuenta corriente" : "Abrir caja para operar POS"}
        tone={data.cajaToday.isOpen ? "good" : "danger"}
      />
      <OpsMetric
        icon={<AlertTriangle size={20} />}
        label="Alertas de stock"
        value={`${data.stockAlerts.length}`}
        detail={data.stockAlerts.length > 0 ? "Productos bajo mínimo o sin stock" : "Inventario sin alertas críticas"}
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
    const t = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(t);
  }, []);
  const tz = "America/Argentina/Buenos_Aires";
  return (
    <div className="live-clock">
      <Clock size={16} style={{ color: "var(--text-tertiary)" }} />
      <div>
        <div className="live-clock__time" suppressHydrationWarning>
          {time.toLocaleTimeString("es-AR", { hour: "2-digit", minute: "2-digit", second: "2-digit", timeZone: tz })}
        </div>
        <div className="live-clock__date" style={{ textTransform: "capitalize" }} suppressHydrationWarning>
          {time.toLocaleDateString("es-AR", { weekday: "long", day: "numeric", month: "long", timeZone: tz })}
        </div>
      </div>
    </div>
  );
}

function WeeklyChart({ data, ready }: { data: WeeklyPoint[]; ready: boolean }) {
  const displayData = data.length > 0 ? data : 
    [{ day: "lun", ventas: 0 }, { day: "mar", ventas: 0 }, { day: "mié", ventas: 0 },
     { day: "jue", ventas: 0 }, { day: "vie", ventas: 0 }, { day: "sáb", ventas: 0 }, { day: "dom", ventas: 0 }];

  return (
    <div className="card animate-in animate-in-delay-3">
      <div className="card__header">
        <div>
          <div className="card__title">Ventas Semanales</div>
          <div className="card__subtitle">Últimos 7 días</div>
        </div>
      </div>
      {ready && (
        <MeasuredChart height={280}>
          {({ width, height }) => (
            <AreaChart width={width} height={height} data={displayData} margin={{ top: 5, right: 10, left: -10, bottom: 0 }}>
              <defs>
                <linearGradient id="weekGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#3B82F6" stopOpacity={0.3} />
                  <stop offset="100%" stopColor="#3B82F6" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border-light)" vertical={false} />
              <XAxis
                dataKey="day"
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
                stroke="#3B82F6"
                strokeWidth={2.5}
                fill="url(#weekGradient)"
                dot={false}
                activeDot={{ r: 5, stroke: "#3B82F6", strokeWidth: 2, fill: "var(--bg-card)" }}
              />
            </AreaChart>
          )}
        </MeasuredChart>
      )}
    </div>
  );
}

function SalesChart({ data, ready }: { data: ChartPoint[]; ready: boolean }) {
  const displayData = data.length > 0 ? data : [{ hour: "08:00", ventas: 0 }, { hour: "20:00", ventas: 0 }];

  return (
    <div className="card animate-in animate-in-delay-2">
      <div className="card__header">
        <div>
          <div className="card__title">Ventas Hoy</div>
          <div className="card__subtitle">Evolución por hora</div>
        </div>
      </div>
      {ready && (
        <MeasuredChart height={280}>
          {({ width, height }) => (
            <AreaChart width={width} height={height} data={displayData} margin={{ top: 5, right: 10, left: -10, bottom: 0 }}>
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
          )}
        </MeasuredChart>
      )}
    </div>
  );
}

function RightPanel({ paymentData, ready }: { paymentData: PaymentSlice[]; ready: boolean }) {
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
        {ready && (
          <MeasuredChart height={130}>
            {({ width, height }) => (
              <PieChart width={width} height={height}>
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
            )}
          </MeasuredChart>
        )}
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

function RecentSalesCard({ sales }: { sales: RecentSale[] }) {
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
    <div className="card dashboard-list-card animate-in animate-in-delay-3">
      <div className="card__header">
        <div>
          <div className="card__title">Productos más vendidos</div>
          <div className="card__subtitle">Ranking real del día por facturación</div>
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
    <div className="card dashboard-list-card animate-in animate-in-delay-4">
      <div className="card__header">
        <div>
          <div className="card__title">Alertas operativas</div>
          <div className="card__subtitle">Stock bajo, sin stock y sin movimiento</div>
        </div>
      </div>
      <div className="dashboard-alert-stack">
        {alerts.length === 0 ? (
          <div className="dashboard-empty-line">
            <Package size={18} /> No hay productos bajo mínimo
          </div>
        ) : alerts.slice(0, 5).map((item) => (
          <div key={item.productId} className={`dashboard-alert-row dashboard-alert-row--${item.status}`}>
            <div className="dashboard-alert-row__main">
              <span>{item.emoji}</span>
              <div>
                <strong>{item.product}</strong>
                <p>{item.status === "out" ? "Sin stock disponible" : `Mínimo sugerido ${formatNumber(item.threshold)} ${item.unit}`}</p>
              </div>
            </div>
            <strong>{formatNumber(item.stock)} {item.unit}</strong>
          </div>
        ))}
        {slowMovers.length > 0 && (
          <div className="dashboard-slow-box">
            <div className="dashboard-slow-box__title">
              <Activity size={16} /> Sin ventas en 30 días
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
    <div className="card dashboard-list-card animate-in animate-in-delay-5">
      <div className="card__header">
        <div>
          <div className="card__title">Caja del día</div>
          <div className="card__subtitle">Control teórico por medio de pago</div>
        </div>
      </div>
      {!data.cajaToday.isOpen ? (
        <div className="dashboard-empty-line dashboard-empty-line--danger">
          <AlertTriangle size={18} /> Caja cerrada — el POS no puede vender
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

function FirstRunGuide({ userName, hasOpenCaja }: { userName: string; hasOpenCaja: boolean }) {
  const router = useRouter();
  const steps = [
    {
      icon: <Package size={22} />,
      cls: "pos",
      title: "Cargá tus productos",
      desc: "Sumá tus cortes y precios. Es lo primero para poder vender.",
      action: "Ir a Productos",
      href: "/productos",
      done: false,
    },
    {
      icon: <Boxes size={22} />,
      cls: "client",
      title: "Cargá el stock (opcional)",
      desc: "Registrá una entrada de mercadería para llevar el control de inventario.",
      action: "Ir a Inventario",
      href: "/inventario",
      done: false,
    },
    {
      icon: <Wallet size={22} />,
      cls: "pos",
      title: "Abrí la caja del día",
      desc: "Ingresá el efectivo inicial para poder cobrar en el punto de venta.",
      action: hasOpenCaja ? "Caja abierta" : "Ir a Caja",
      href: "/caja",
      done: hasOpenCaja,
    },
    {
      icon: <ShoppingCart size={22} />,
      cls: "client",
      title: "Empezá a vender",
      desc: "Cobrá tu primera venta. El tablero se va a llenar de datos automáticamente.",
      action: "Ir al Punto de Venta",
      href: "/pos",
      done: false,
    },
  ];

  return (
    <div className="page-container">
      <div className="page-header animate-in">
        <div className="page-header__left">
          <div className="page-header__greeting">Hola, {userName}</div>
          <h1 className="page-header__title">
            Configurá tu <span>carnicería</span>
          </h1>
        </div>
      </div>

      <div
        className="card animate-in animate-in-delay-1"
        style={{ marginBottom: 20, display: "flex", gap: 14, alignItems: "flex-start" }}
      >
        <div style={{ padding: 12, borderRadius: 12, background: "var(--primary-soft)", color: "var(--primary)", flexShrink: 0 }}>
          <Activity size={22} />
        </div>
        <div>
          <div style={{ fontWeight: 700, color: "var(--text-primary)", marginBottom: 2 }}>
            Tu tablero todavía está vacío — es normal
          </div>
          <div style={{ fontSize: "0.88rem", color: "var(--text-secondary)", lineHeight: 1.5 }}>
            Seguí estos pasos y las ventas, reportes y alertas van a aparecer solas a medida que uses el sistema.
          </div>
        </div>
      </div>

      <div className="dashboard-firstrun-grid" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: 16 }}>
        {steps.map((step, i) => (
          <div key={step.title} className={`card animate-in animate-in-delay-${i + 2}`} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <div className={`quick-action__icon quick-action__icon--${step.cls}`}>{step.icon}</div>
              <span style={{ fontSize: "0.78rem", fontWeight: 800, color: "var(--text-muted)", fontFamily: "var(--font-mono)" }}>
                Paso {i + 1}
              </span>
            </div>
            <div>
              <div style={{ fontWeight: 700, color: "var(--text-primary)", marginBottom: 4 }}>{step.title}</div>
              <div style={{ fontSize: "0.85rem", color: "var(--text-secondary)", lineHeight: 1.5 }}>{step.desc}</div>
            </div>
            <button
              className={`btn ${step.done ? "btn--success" : "btn--primary"} btn--sm`}
              style={{ marginTop: "auto", justifyContent: "center" }}
              onClick={() => router.push(step.href)}
              disabled={step.done}
            >
              {step.done ? "✓ " : ""}{step.action}
              {!step.done && <ArrowUpRight size={14} />}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function DashboardContent() {
  const router = useRouter();
  const { hydrate } = useCajaStore();
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);
  const [chartsReady, setChartsReady] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const loadSession = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const s = await getCurrentSession();
      if (s) hydrate(mapDbSessionToStore(s), []);
      else hydrate(null, []);
      const stats = await getDashboardStats();
      setDashboardData(stats as DashboardData);
    } catch (error) {
      setLoadError(error instanceof Error ? error.message : "No se pudo cargar el dashboard.");
    } finally {
      setLoading(false);
    }
  }, [hydrate]);

  useEffect(() => { void loadSession(); }, [loadSession]);
  useEffect(() => {
    const frame = requestAnimationFrame(() => setChartsReady(true));
    return () => cancelAnimationFrame(frame);
  }, []);

  const { data: session } = useSession();

  const greeting = () => {
    const h = new Date().getHours();
    if (h < 12) return "Buenos días";
    if (h < 18) return "Buenas tardes";
    return "Buenas noches";
  };

  const userName = session?.user?.name?.split(" ")[0] || "Usuario";

  const realData = dashboardData ?? {
    revenue: 0, orders: 0, productCount: 0, ticket: 0, clients: 0,
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
    return (
      <div className="page-container">
        <div className="dashboard-loading">
          <RefreshCw size={22} className="animate-spin" />
          <span>Cargando tablero operativo...</span>
        </div>
      </div>
    );
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

  if (dashboardData && realData.productCount === 0) {
    return <FirstRunGuide userName={userName} hasOpenCaja={realData.hasOpenCaja} />;
  }

  return (
    <div className="page-container">
      {/* Header */}
      <div className="page-header animate-in">
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
        <StatCard stat={{ label: "Ventas del Día", value: realData.revenue, trend: 0, trendDirection: "up" }} type="revenue" delay={1} />
        <StatCard stat={{ label: "Transacciones", value: realData.orders, trend: 0, trendDirection: "up" }} type="orders" delay={2} />
        <StatCard stat={{ label: "Ticket Promedio", value: realData.ticket, trend: 0, trendDirection: "up" }} type="ticket" delay={3} />
        <StatCard stat={{ label: "Clientes Atendidos", value: realData.clients, trend: 0, trendDirection: "up" }} type="clients" delay={4} />
      </div>

      {/* Left: Charts | Right: Quick Actions + Payment + Weekly */}
      <div className="dashboard-grid">
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <SalesChart data={realData.hourlySales} ready={chartsReady} />
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <RightPanel paymentData={realData.paymentBreakdown} ready={chartsReady} />
          <WeeklyChart data={realData.weeklySales} ready={chartsReady} />
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
