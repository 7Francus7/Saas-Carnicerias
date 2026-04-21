import Sidebar from "@/components/layout/Sidebar";
import ClientsContent from "@/components/clients/ClientsContent";

export default function ClientsPage() {
  return (
    <div className="app-layout">
      <Sidebar />
      <main className="main-content">
        <ClientsContent />
      </main>
    </div>
  );
}
