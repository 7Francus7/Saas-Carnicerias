import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import Sidebar from "@/components/layout/Sidebar";
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

  if (!member || (member.role !== "owner" && member.role !== "admin")) {
    redirect("/");
  }

  return (
    <div className="app-layout">
      <Sidebar />
      <main className="main-content">
        <EmpleadosContent />
      </main>
    </div>
  );
}
