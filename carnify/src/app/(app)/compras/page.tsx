import { requirePageAccess } from "@/lib/permissions";
import ComprasContent from "@/components/compras/ComprasContent";

export default async function ComprasPage() {
  await requirePageAccess("compras");
  return <ComprasContent />;
}
