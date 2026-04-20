import Sidebar from "@/components/layout/Sidebar";
import InventoryContent from "@/components/inventory/InventoryContent";

export default function InventoryPage() {
  return (
    <div className="app-layout">
      <Sidebar />
      <main className="main-content">
        <InventoryContent />
      </main>
    </div>
  );
}
