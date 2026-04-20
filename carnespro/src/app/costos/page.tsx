import Sidebar from "@/components/layout/Sidebar";
import CostosContent from "@/components/costos/CostosContent";

export default function CostosPage() {
  return (
    <div className="app-layout">
      <Sidebar />
      <main className="main-content">
        <CostosContent />
      </main>
    </div>
  );
}
