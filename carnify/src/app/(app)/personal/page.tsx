import { requirePageAccess } from "@/lib/permissions";
import PersonalContent from "@/components/personal/PersonalContent";

export default async function PersonalPage() {
  await requirePageAccess("personal");
  return <PersonalContent />;
}
