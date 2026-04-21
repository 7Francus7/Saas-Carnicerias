import Sidebar from "@/components/layout/Sidebar";
import PersonalContent from "@/components/personal/PersonalContent";

export default function PersonalPage() {
  return (
    <div className="app-layout">
      <Sidebar />
      <main className="main-content">
        <PersonalContent />
      </main>
    </div>
  );
}
