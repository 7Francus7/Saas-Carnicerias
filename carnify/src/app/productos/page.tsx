import { requirePageAccess } from "@/lib/permissions";
import Sidebar from "@/components/layout/Sidebar";
import ProductosContent from "@/components/productos/ProductosContent";

export default async function ProductosPage() {
  await requirePageAccess("productos");

  return (
    <div className="app-layout">
      <Sidebar />
      <main className="main-content">
        <ProductosContent />
      </main>
    </div>
  );
}
