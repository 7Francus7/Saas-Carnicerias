import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import Sidebar from "@/components/layout/Sidebar";
import DashboardContent from "@/components/dashboard/DashboardContent";

export default async function Home() {
  const session = await auth.api.getSession({ headers: await headers() });

  if (!session) redirect("/login");

  if (session.user.role === "admin" && !session.session.activeOrganizationId) {
    redirect("/super-admin");
  }

  if (!session.session.activeOrganizationId) {
    const membership = await prisma.member.findFirst({
      where: { userId: session.user.id },
      orderBy: { createdAt: "asc" },
    });

    if (membership) {
      await prisma.session.update({
        where: { id: session.session.id },
        data: { activeOrganizationId: membership.organizationId },
      });
      redirect("/");
    } else {
      redirect("/onboarding");
    }
  }

  return (
    <div className="app-layout">
      <Sidebar />
      <main className="main-content">
        <DashboardContent />
      </main>
    </div>
  );
}
