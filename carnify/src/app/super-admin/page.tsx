import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import SuperAdminView from "./SuperAdminView";

export default async function SuperAdminPage() {
  const session = await auth.api.getSession({ headers: await headers() });

  if (!session || session.user.role !== "admin") {
    redirect("/");
  }

  const [orgs, users, sessionTotals] = await Promise.all([
    prisma.organization.findMany({
      include: {
        members: {
          where: { role: "owner" },
          include: { user: true },
        },
        cajaSessions: {
          orderBy: { openedAt: "desc" },
          take: 1,
          select: { openedAt: true },
        },
        _count: {
          select: { members: true, products: true, cajaSessions: true, clients: true, staff: true },
        },
      },
      orderBy: { createdAt: "desc" },
    }),
    prisma.user.findMany({
      select: {
        id: true,
        name: true,
        email: true,
        createdAt: true,
        banned: true,
        role: true,
        _count: { select: { sessions: true, members: true } },
      },
      orderBy: { createdAt: "desc" },
    }),
    prisma.cajaSession.findMany({
      select: {
        organizationId: true,
        sales: { select: { total: true } },
      },
    }),
  ]);

  const revenueByOrg = sessionTotals.reduce<Record<string, number>>((acc, s) => {
    const rev = s.sales.reduce((sum, sale) => sum + sale.total, 0);
    acc[s.organizationId] = (acc[s.organizationId] ?? 0) + rev;
    return acc;
  }, {});

  const orgsData = orgs.map((org) => ({
    id: org.id,
    name: org.name,
    slug: org.slug,
    createdAt: org.createdAt.toISOString(),
    lastSessionAt: org.cajaSessions[0]?.openedAt.toISOString() ?? null,
    owner: org.members[0]
      ? { name: org.members[0].user.name, email: org.members[0].user.email }
      : null,
    memberCount: org._count.members,
    productCount: org._count.products,
    sessionCount: org._count.cajaSessions,
    clientCount: org._count.clients,
    staffCount: org._count.staff,
    revenue: revenueByOrg[org.id] ?? 0,
  }));

  const usersData = users.map((u) => ({
    id: u.id,
    name: u.name,
    email: u.email,
    banned: u.banned ?? false,
    role: u.role ?? "user",
    memberCount: u._count.members,
    sessionCount: u._count.sessions,
    createdAt: u.createdAt.toISOString(),
  }));

  const totalRevenue = Object.values(revenueByOrg).reduce((a, b) => a + b, 0);

  return <SuperAdminView orgs={orgsData} users={usersData} totalRevenue={totalRevenue} />;
}
