import { requirePageAccess } from "@/lib/permissions";
import Sidebar from "@/components/layout/Sidebar";
import POSContent from "@/components/pos/POSContent";

export default async function POSPage() {
  await requirePageAccess("pos");

  return (
    <div className="app-layout">
      {/* Simplified Sidebar for POS */}
      <Sidebar />
      <main className="main-content">
        <POSContent />
      </main>
    </div>
  );
}
