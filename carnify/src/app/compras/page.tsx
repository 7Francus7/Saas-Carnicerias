import { requirePageAccess } from "@/lib/permissions";
import Sidebar from "@/components/layout/Sidebar";
import ComprasContent from "@/components/compras/ComprasContent";

export default async function ComprasPage() {
  await requirePageAccess("compras");

  return (
    <div className="app-layout">
      <Sidebar />
      <main className="main-content">
        <ComprasContent />
      </main>
    </div>
  );
}
