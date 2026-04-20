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

  const [orgs, users] = await Promise.all([
    prisma.organization.findMany({
      include: {
        members: {
          where: { role: "owner" },
          include: { user: true },
        },
        _count: {
          select: { members: true, products: true, cajaSessions: true },
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
        _count: { select: { sessions: true, members: true } },
      },
      orderBy: { createdAt: "desc" },
    }),
  ]);

  const data = orgs.map((org) => ({
    id: org.id,
    name: org.name,
    slug: org.slug,
    createdAt: org.createdAt.toISOString(),
    owner: org.members[0]
      ? {
          name: org.members[0].user.name,
          email: org.members[0].user.email,
        }
      : null,
    memberCount: org._count.members,
    productCount: org._count.products,
    sessionCount: org._count.cajaSessions,
  }));

  const usersData = users.map((u) => ({
    id: u.id,
    name: u.name,
    email: u.email,
    banned: u.banned ?? false,
    memberCount: u._count.members,
    createdAt: u.createdAt.toISOString(),
  }));

  return <SuperAdminView orgs={data} users={usersData} />;
}
