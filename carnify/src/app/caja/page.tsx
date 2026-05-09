import { requirePageAccess } from "@/lib/permissions";
import Sidebar from "@/components/layout/Sidebar";
import CajaContent from "@/components/caja/CajaContent";

export default async function CajaPage() {
  await requirePageAccess("caja");

  return (
    <div className="app-layout">
      <Sidebar />
      <main className="main-content">
        <CajaContent />
      </main>
    </div>
  );
}
