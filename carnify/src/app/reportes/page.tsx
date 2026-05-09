import { requirePageAccess } from "@/lib/permissions";
import Sidebar from "@/components/layout/Sidebar";
import ReportesContent from "@/components/reportes/ReportesContent";

export default async function ReportesPage() {
  await requirePageAccess("reportes");

  return (
    <div className="app-layout">
      <Sidebar />
      <main className="main-content">
        <ReportesContent />
      </main>
    </div>
  );
}
