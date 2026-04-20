import Sidebar from "@/components/layout/Sidebar";
import ReportesContent from "@/components/reportes/ReportesContent";

export default function ReportesPage() {
  return (
    <div className="app-layout">
      <Sidebar />
      <main className="main-content">
        <ReportesContent />
      </main>
    </div>
  );
}
