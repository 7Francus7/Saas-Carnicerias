import { requirePageAccess } from "@/lib/permissions";
import CajaContent from "@/components/caja/CajaContent";

export default async function CajaPage() {
  await requirePageAccess("caja");
  return <CajaContent />;
}
