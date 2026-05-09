import { requirePageAccess } from "@/lib/permissions";
import Sidebar from "@/components/layout/Sidebar";
import PersonalContent from "@/components/personal/PersonalContent";

export default async function PersonalPage() {
  await requirePageAccess("personal");

  return (
    <div className="app-layout">
      <Sidebar />
      <main className="main-content">
        <PersonalContent />
      </main>
    </div>
  );
}
