import Sidebar from "@/components/layout/Sidebar";
import CajaContent from "@/components/caja/CajaContent";

export default function CajaPage() {
  return (
    <div className="app-layout">
      <Sidebar />
      <main className="main-content">
        <CajaContent />
      </main>
    </div>
  );
}
