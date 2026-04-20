// ── Navigation Items ──
export const NAV_ITEMS = [
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
  revenue: {
    value: 847520,
    trend: 12.5,
    trendDirection: "up" as const,
    label: "Ventas del Día",
  },
  orders: {
    value: 64,
    trend: 8.3,
    trendDirection: "up" as const,
    label: "Transacciones",
  },
  avgTicket: {
    value: 13242,
    trend: -2.1,
    trendDirection: "down" as const,
    label: "Ticket Promedio",
  },
  clients: {
    value: 38,
    trend: 15.2,
    trendDirection: "up" as const,
    label: "Clientes Atendidos",
  },
};

export const MOCK_HOURLY_SALES = [
  { hour: "08:00", ventas: 45200, transacciones: 4 },
  { hour: "09:00", ventas: 78300, transacciones: 7 },
  { hour: "10:00", ventas: 125400, transacciones: 12 },
  { hour: "11:00", ventas: 156800, transacciones: 15 },
  { hour: "12:00", ventas: 189200, transacciones: 18 },
  { hour: "13:00", ventas: 142600, transacciones: 14 },
  { hour: "14:00", ventas: 98500, transacciones: 9 },
  { hour: "15:00", ventas: 67300, transacciones: 6 },
  { hour: "16:00", ventas: 112400, transacciones: 11 },
  { hour: "17:00", ventas: 134700, transacciones: 13 },
  { hour: "18:00", ventas: 167800, transacciones: 16 },
  { hour: "19:00", ventas: 89400, transacciones: 8 },
];

export const MOCK_WEEKLY_SALES = [
  { day: "Lun", ventas: 680000, cantidad: 58 },
  { day: "Mar", ventas: 720000, cantidad: 62 },
  { day: "Mié", ventas: 590000, cantidad: 51 },
  { day: "Jue", ventas: 810000, cantidad: 70 },
  { day: "Vie", ventas: 950000, cantidad: 82 },
  { day: "Sáb", ventas: 1250000, cantidad: 108 },
  { day: "Dom", ventas: 430000, cantidad: 37 },
];

export const MOCK_TOP_PRODUCTS = [
  { id: 1, name: "Vacío", category: "Vacuno", emoji: "🥩", sold: 42.5, unit: "kg", revenue: 382500, margin: 35 },
  { id: 2, name: "Asado de tira", category: "Vacuno", emoji: "🥩", sold: 38.2, unit: "kg", revenue: 305600, margin: 32 },
  { id: 3, name: "Entraña", category: "Vacuno", emoji: "🥩", sold: 18.7, unit: "kg", revenue: 224400, margin: 42 },
  { id: 4, name: "Pollo entero", category: "Pollo", emoji: "🍗", sold: 25.0, unit: "un", revenue: 125000, margin: 28 },
  { id: 5, name: "Hamburguesas x4", category: "Elaborados", emoji: "🍔", sold: 35.0, unit: "un", revenue: 105000, margin: 55 },
  { id: 6, name: "Chorizo parrillero", category: "Embutidos", emoji: "🌭", sold: 22.3, unit: "kg", revenue: 89200, margin: 38 },
  { id: 7, name: "Matambre", category: "Vacuno", emoji: "🥩", sold: 12.8, unit: "kg", revenue: 83200, margin: 40 },
  { id: 8, name: "Milanesa", category: "Elaborados", emoji: "🍖", sold: 28.5, unit: "kg", revenue: 76950, margin: 48 },
];

export const MOCK_STOCK_ALERTS = [
  { product: "Pollo entero", current: 8, min: 15, status: "critical" as const },
  { product: "Chorizo parrillero", current: 5.2, min: 10, status: "critical" as const },
  { product: "Vacío", current: 12, min: 15, status: "warning" as const },
  { product: "Bondiola", current: 7.5, min: 8, status: "warning" as const },
];

export const MOCK_RECENT_SALES = [
  { id: "V-0064", time: "19:32", items: 4, total: 18750, payment: "Efectivo", client: "Juan Pérez" },
  { id: "V-0063", time: "19:15", items: 2, total: 12400, payment: "Transferencia", client: null },
  { id: "V-0062", time: "18:58", items: 6, total: 34200, payment: "Tarjeta", client: "María García" },
  { id: "V-0061", time: "18:41", items: 3, total: 9800, payment: "Efectivo", client: null },
  { id: "V-0060", time: "18:23", items: 5, total: 22600, payment: "Cuenta Corriente", client: "Carlos López" },
  { id: "V-0059", time: "18:05", items: 1, total: 5400, payment: "Efectivo", client: null },
];

export const MOCK_ACTIVITY = [
  { type: "sale" as const, text: '<strong>Venta #V-0064</strong> — Juan Pérez — $18.750', time: "Hace 5 min" },
  { type: "stock" as const, text: 'Ingreso de stock: <strong>120kg media res</strong> (Prov. Martínez)', time: "Hace 28 min" },
  { type: "alert" as const, text: '<strong>Stock bajo:</strong> Pollo entero (8 un. restantes)', time: "Hace 45 min" },
  { type: "sale" as const, text: '<strong>Venta #V-0063</strong> — Consumidor final — $12.400', time: "Hace 1 hora" },
  { type: "stock" as const, text: 'Desposte completado: <strong>Media res #47</strong> — Rinde 68.5%', time: "Hace 1.5 horas" },
  { type: "sale" as const, text: '<strong>Venta #V-0062</strong> — María García — $34.200', time: "Hace 2 horas" },
];

export const MOCK_PAYMENT_BREAKDOWN = [
  { method: "Efectivo", amount: 425300, percentage: 50.2, color: "#22C55E" },
  { method: "Transferencia", amount: 228800, percentage: 27.0, color: "#3B82F6" },
  { method: "Tarjeta", amount: 135400, percentage: 16.0, color: "#F59E0B" },
  { method: "Cuenta Cte.", amount: 58020, percentage: 6.8, color: "#A855F7" },
];

export const MOCK_STOCK_LEVELS = [
  { name: "Vacío", current: 12, max: 25, unit: "kg", percentage: 48 },
  { name: "Asado de tira", current: 18, max: 30, unit: "kg", percentage: 60 },
  { name: "Entraña", current: 6.5, max: 15, unit: "kg", percentage: 43 },
  { name: "Pollo entero", current: 8, max: 30, unit: "un", percentage: 27 },
  { name: "Chorizo", current: 5.2, max: 15, unit: "kg", percentage: 35 },
  { name: "Hamburguesas", current: 45, max: 60, unit: "un", percentage: 75 },
  { name: "Matambre", current: 4.8, max: 10, unit: "kg", percentage: 48 },
  { name: "Milanesas", current: 15, max: 20, unit: "kg", percentage: 75 },
];

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
