import Sidebar from "@/components/layout/Sidebar";
import ConfigContent from "@/components/config/ConfigContent";

export default function ConfigPage() {
  return (
    <div className="app-layout">
      <Sidebar />
      <main className="main-content">
        <ConfigContent />
      </main>
    </div>
  );
}
