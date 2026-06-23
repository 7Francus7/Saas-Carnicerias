import { requirePageAccess } from "@/lib/permissions";
import ClientsContent from "@/components/clients/ClientsContent";

export default async function ClientsPage() {
  await requirePageAccess("clientes");
  return <ClientsContent />;
}
