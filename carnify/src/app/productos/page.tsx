import Sidebar from "@/components/layout/Sidebar";
import ProductosContent from "@/components/productos/ProductosContent";

export default function ProductosPage() {
  return (
    <div className="app-layout">
      <Sidebar />
      <main className="main-content">
        <ProductosContent />
      </main>
    </div>
  );
}
