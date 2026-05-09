import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import type { SectionKey } from "@/lib/sections";

export type PermissionResult = {
  userId: string;
  tenantId: string;
  role: string;
  sections: SectionKey[] | "all";
};

export async function getUserPermissions(): Promise<PermissionResult | null> {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.session.activeOrganizationId) return null;

  const tenantId = session.session.activeOrganizationId;
  const member = await prisma.member.findFirst({
    where: { userId: session.user.id, organizationId: tenantId },
  });

  if (!member) return null;

  let sections: SectionKey[] | "all";
  if (member.role === "owner" || member.role === "admin") {
    sections = "all";
  } else {
    const perms = await prisma.employeePermissions.findUnique({
      where: { memberId: member.id },
    });
    sections = (perms?.sections ?? []) as SectionKey[];
  }

  return { userId: session.user.id, tenantId, role: member.role, sections };
}

export async function requireSectionAccess(
  section: SectionKey
): Promise<PermissionResult> {
  const perms = await getUserPermissions();
  if (!perms) throw new Error("No autenticado o sin carnicería activa");
  if (perms.sections !== "all" && !perms.sections.includes(section)) {
    throw new Error(`Sin permisos para acceder a: ${section}`);
  }
  return perms;
}

export async function requirePageAccess(
  section: SectionKey
): Promise<PermissionResult> {
  const perms = await getUserPermissions();
  if (!perms) redirect("/");
  if (perms.sections !== "all" && !perms.sections.includes(section)) {
    redirect("/");
  }
  return perms;
}

export async function requireRole(...roles: string[]): Promise<PermissionResult> {
  const perms = await getUserPermissions();
  if (!perms) throw new Error("No autenticado");
  if (!roles.includes(perms.role)) throw new Error("Sin permisos de rol requerido");
  return perms;
}

export async function requirePageRole(...roles: string[]): Promise<PermissionResult> {
  const perms = await getUserPermissions();
  if (!perms) redirect("/");
  if (!roles.includes(perms.role)) redirect("/");
  return perms;
}
