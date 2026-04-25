// ── Navigation Items ──
export interface NavItem {
  label: string;
  icon: string;
  href: string;
  badge: string | null;
  sectionKey: string;
}

export interface NavSection {
  section: string;
  items: NavItem[];
}

export const NAV_ITEMS: NavSection[] = [
  {
    section: "Principal",
    items: [
      { label: "Dashboard",      icon: "LayoutDashboard", href: "/",         badge: null,  sectionKey: "dashboard" },
      { label: "Punto de Venta", icon: "ShoppingCart",    href: "/pos",      badge: "POS", sectionKey: "pos" },
    ],
  },
  {
    section: "Gestión",
    items: [
      { label: "Productos", icon: "Beef",       href: "/productos", badge: null, sectionKey: "productos" },
      { label: "Costos",    icon: "Calculator", href: "/costos",    badge: null, sectionKey: "costos" },
    ],
  },
  {
    section: "Personas",
    items: [
      { label: "Clientes",  icon: "Users",   href: "/clientes",  badge: null, sectionKey: "clientes" },
      { label: "Personal",  icon: "UserCog", href: "/personal",  badge: null, sectionKey: "personal" },
    ],
  },
  {
    section: "Finanzas",
    items: [
      { label: "Caja",      icon: "Wallet",   href: "/caja",      badge: null, sectionKey: "caja" },
      { label: "Reportes",  icon: "BarChart3", href: "/reportes", badge: null, sectionKey: "reportes" },
    ],
  },
  {
    section: "Sistema",
    items: [
      { label: "Empleados", icon: "Users2", href: "/empleados", badge: null, sectionKey: "empleados" },
    ],
  },
];

// ── Categorías de productos ──
export const PRODUCT_CATEGORIES = [
  { id: "vacuno", label: "Vacuno", emoji: "🐄" },
  { id: "cerdo", label: "Cerdo", emoji: "🐷" },
  { id: "pollo", label: "Pollo", emoji: "🐔" },
  { id: "achuras", label: "Achuras", emoji: "🫀" },
  { id: "embutidos", label: "Embutidos", emoji: "🌭" },
  { id: "elaborados", label: "Elaborados", emoji: "🍔" },
  { id: "otros", label: "Otros", emoji: "📦" },
];

// ── Mock data for Dashboard ──
export const MOCK_STATS = {
  revenue: { value: 0, trend: 0, trendDirection: "up" as const, label: "Ventas del Día" },
  orders: { value: 0, trend: 0, trendDirection: "up" as const, label: "Transacciones" },
  avgTicket: { value: 0, trend: 0, trendDirection: "down" as const, label: "Ticket Promedio" },
  clients: { value: 0, trend: 0, trendDirection: "up" as const, label: "Clientes Atendidos" },
};

export const MOCK_HOURLY_SALES: Array<Record<string, never>> = [];
export const MOCK_WEEKLY_SALES: Array<Record<string, never>> = [];
export const MOCK_TOP_PRODUCTS: Array<Record<string, never>> = [];
export const MOCK_STOCK_ALERTS: Array<Record<string, never>> = [];
export const MOCK_RECENT_SALES: Array<Record<string, never>> = [];
export const MOCK_ACTIVITY: Array<Record<string, never>> = [];
export const MOCK_PAYMENT_BREAKDOWN: Array<Record<string, never>> = [];
export const MOCK_STOCK_LEVELS: Array<Record<string, never>> = [];

export const POS_PRODUCTS = [
  // Vacuno
  { id: 'v1', plu: '00001', name: "Vacío",            category: "Vacuno",    emoji: "🥩", price: 9500,  unit: "kg" },
  { id: 'v2', plu: '00002', name: "Asado de tira",    category: "Vacuno",    emoji: "🥩", price: 8200,  unit: "kg" },
  { id: 'v3', plu: '00003', name: "Entraña",          category: "Vacuno",    emoji: "🥩", price: 12500, unit: "kg" },
  { id: 'v4', plu: '00004', name: "Matambre",         category: "Vacuno",    emoji: "🥩", price: 8900,  unit: "kg" },
  { id: 'v5', plu: '00005', name: "Bola de lomo",     category: "Vacuno",    emoji: "🥩", price: 7800,  unit: "kg" },
  { id: 'v6', plu: '00006', name: "Cuadril",          category: "Vacuno",    emoji: "🥩", price: 9200,  unit: "kg" },
  { id: 'v7', plu: '00007', name: "Peceto",           category: "Vacuno",    emoji: "🥩", price: 10500, unit: "kg" },
  { id: 'v8', plu: '00008', name: "Lomo",             category: "Vacuno",    emoji: "🥩", price: 14000, unit: "kg" },
  // Pollo
  { id: 'p1', plu: '00010', name: "Pollo entero",     category: "Pollo",     emoji: "🍗", price: 4200,  unit: "un" },
  { id: 'p2', plu: '00011', name: "Pechuga",          category: "Pollo",     emoji: "🍗", price: 6500,  unit: "kg" },
  { id: 'p3', plu: '00012', name: "Pata y muslo",     category: "Pollo",     emoji: "🍗", price: 3800,  unit: "kg" },
  // Cerdo
  { id: 'c1', plu: '00020', name: "Bondiola",         category: "Cerdo",     emoji: "🐷", price: 7500,  unit: "kg" },
  { id: 'c2', plu: '00021', name: "Pechito de cerdo", category: "Cerdo",     emoji: "🐷", price: 6800,  unit: "kg" },
  { id: 'c3', plu: '00022', name: "Carré",            category: "Cerdo",     emoji: "🐷", price: 6200,  unit: "kg" },
  // Embutidos
  { id: 'e1', plu: '00030', name: "Chorizo parrillero",category: "Embutidos",emoji: "🌭", price: 4500,  unit: "kg" },
  { id: 'e2', plu: '00031', name: "Morcilla bombon",  category: "Embutidos", emoji: "🌭", price: 4200,  unit: "kg" },
  { id: 'e3', plu: '00032', name: "Chorizo colorado", category: "Embutidos", emoji: "🌭", price: 5500,  unit: "kg" },
  // Elaborados
  { id: 'l1', plu: '00040', name: "Hamburguesas x4",  category: "Elaborados",emoji: "🍔", price: 3200,  unit: "un" },
  { id: 'l2', plu: '00041', name: "Milanesas de carne",category: "Elaborados",emoji: "🍖", price: 5800,  unit: "kg" },
  { id: 'l3', plu: '00042', name: "Milanesas de pollo",category: "Elaborados",emoji: "🍗", price: 5200,  unit: "kg" },
];

export const PAYMENT_METHODS = [
  { id: 'cash', label: 'Efectivo', icon: 'Wallet', color: '#22C55E' },
  { id: 'transfer', label: 'Transferencia', icon: 'Smartphone', color: '#3B82F6' },
  { id: 'card', label: 'Tarjeta', icon: 'CreditCard', color: '#F59E0B' },
  { id: 'link', label: 'QR / Link', icon: 'QrCode', color: '#A855F7' },
  { id: 'fiado', label: 'Cuenta Cte.', icon: 'UserPlus', color: '#EF4444' },
];

// ── Formatters ──
export function formatCurrency(value: number): string {
  return new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: "ARS",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}

export function formatNumber(value: number): string {
  return new Intl.NumberFormat("es-AR").format(value);
}
