import { requirePageAccess } from "@/lib/permissions";
import POSContent from "@/components/pos/POSContent";

export default async function POSPage() {
  await requirePageAccess("pos");
  return <POSContent />;
}
