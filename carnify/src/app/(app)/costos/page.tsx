import { requirePageAccess } from "@/lib/permissions";
import CostosContent from "@/components/costos/CostosContent";

export default async function CostosPage() {
  await requirePageAccess("costos");
  return <CostosContent />;
}
