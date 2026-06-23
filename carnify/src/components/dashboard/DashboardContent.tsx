"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  DollarSign, ShoppingBag, Receipt, Users,
  TrendingUp, TrendingDown, ShoppingCart,
  Clock, AlertTriangle, Wallet
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
        {Array.from({ length: 2 }).map((_, i) => (
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
        {Array.from({ length: 2 }).map((_, i) => (
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

      {/* Stats — solo lo esencial */}
      <div className="stats-grid">
        <StatCard stat={{ label: "Ventas del Día", value: realData.revenue, trend: 0, trendDirection: "up" }} type="revenue" />
        <StatCard stat={{ label: "Transacciones", value: realData.orders, trend: 0, trendDirection: "up" }} type="orders" />
      </div>

    </div>
  );
}
