import { requirePageAccess } from "@/lib/permissions";
import Sidebar from "@/components/layout/Sidebar";
import CostosContent from "@/components/costos/CostosContent";

export default async function CostosPage() {
  await requirePageAccess("costos");

  return (
    <div className="app-layout">
      <Sidebar />
      <main className="main-content">
        <CostosContent />
      </main>
    </div>
  );
}
