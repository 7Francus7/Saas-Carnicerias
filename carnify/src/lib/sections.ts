export const AVAILABLE_SECTIONS = [
  { key: "dashboard", label: "Dashboard",      href: "/" },
  { key: "pos",       label: "Punto de Venta", href: "/pos" },
  { key: "productos", label: "Productos",       href: "/productos" },
  { key: "costos",    label: "Costos",          href: "/costos" },
  { key: "clientes",  label: "Clientes",        href: "/clientes" },
  { key: "personal",  label: "Personal",        href: "/personal" },
  { key: "caja",      label: "Caja",            href: "/caja" },
  { key: "reportes",  label: "Reportes",        href: "/reportes" },
  { key: "inventario", label: "Inventario",     href: "/inventario" },
  { key: "compras",    label: "Compras",         href: "/compras" },
  { key: "config",     label: "Configuración",  href: "/config" },
] as const;

export type SectionKey = (typeof AVAILABLE_SECTIONS)[number]["key"];
