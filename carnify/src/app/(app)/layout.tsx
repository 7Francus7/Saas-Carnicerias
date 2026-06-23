import Sidebar from "@/components/layout/Sidebar";

// Layout compartido de las rutas internas. El Sidebar se monta una sola vez
// aca y App Router lo preserva entre navegaciones del grupo (POS, Caja,
// Clientes, etc.), eliminando el remount/refetch que ocurria cuando cada
// pagina renderizaba su propio <Sidebar/>. El guard de acceso sigue en cada
// page.tsx (requirePageAccess); este layout no toca permisos.
export default function AppLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <div className="app-layout">
      <Sidebar />
      <main className="main-content">{children}</main>
    </div>
  );
}
