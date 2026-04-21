import Sidebar from "@/components/layout/Sidebar";
import POSContent from "@/components/pos/POSContent";

export default function POSPage() {
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
