import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import EmpleadosContent from "@/components/empleados/EmpleadosContent";
import { prisma } from "@/lib/db";

export default async function EmpleadosPage() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.session.activeOrganizationId) redirect("/");

  const member = await prisma.member.findFirst({
    where: {
      userId: session.user.id,
      organizationId: session.session.activeOrganizationId,
    },
  });

  // Solo la cuenta oficial (owner) gestiona empleados.
  if (!member || member.role !== "owner") {
    redirect("/");
  }

  return <EmpleadosContent />;
}
