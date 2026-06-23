import { requirePageAccess } from "@/lib/permissions";
import ReportesContent from "@/components/reportes/ReportesContent";

export default async function ReportesPage() {
  await requirePageAccess("reportes");
  return <ReportesContent />;
}
