import { requirePageAccess } from "@/lib/permissions";
import ConfigContent from "@/components/config/ConfigContent";

export default async function ConfigPage() {
  await requirePageAccess("config");
  return <ConfigContent />;
}
