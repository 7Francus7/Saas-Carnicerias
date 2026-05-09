import { requirePageAccess } from "@/lib/permissions";
import Sidebar from "@/components/layout/Sidebar";
import InventoryContent from "@/components/inventory/InventoryContent";

export default async function InventoryPage() {
  await requirePageAccess("inventario");

  return (
    <div className="app-layout">
      <Sidebar />
      <main className="main-content">
        <InventoryContent />
      </main>
    </div>
  );
}
