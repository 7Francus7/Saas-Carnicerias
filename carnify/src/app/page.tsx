import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { requirePageAccess } from "@/lib/permissions";
import Sidebar from "@/components/layout/Sidebar";
import DashboardContent from "@/components/dashboard/DashboardContent";
import MarketingLanding from "@/components/marketing/MarketingLanding";

export default async function Home() {
  // disableCookieCache: el branch de abajo actualiza la sesión en DB y
  // redirige a "/"; con el cache de cookie la relectura vería el valor viejo
  // y entraría en loop infinito de redirects
  const session = await auth.api.getSession({
    headers: await headers(),
    query: { disableCookieCache: true },
  });

  if (!session) {
    return <MarketingLanding />;
  }

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

  await requirePageAccess("dashboard");

  return (
    <div className="app-layout">
      <Sidebar />
      <main className="main-content">
        <DashboardContent />
      </main>
    </div>
  );
}
