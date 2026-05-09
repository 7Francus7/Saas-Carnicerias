import { requirePageAccess } from "@/lib/permissions";
import Sidebar from "@/components/layout/Sidebar";
import ConfigContent from "@/components/config/ConfigContent";

export default async function ConfigPage() {
  await requirePageAccess("config");

  return (
    <div className="app-layout">
      <Sidebar />
      <main className="main-content">
        <ConfigContent />
      </main>
    </div>
  );
}
