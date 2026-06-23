import { requirePageAccess } from "@/lib/permissions";
import InventoryContent from "@/components/inventory/InventoryContent";

export default async function InventoryPage() {
  await requirePageAccess("inventario");
  return <InventoryContent />;
}
