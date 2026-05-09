"use server";

import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { requireSectionAccess } from "@/lib/permissions";
import type { SectionKey } from "@/lib/sections";

export async function requireTenant() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) throw new Error("No autenticado");
  const tenantId = session.session.activeOrganizationId;
  if (!tenantId) throw new Error("Sin carnicería activa");
  return { userId: session.user.id, tenantId };
}

export async function requireTenantAndSection(section: SectionKey) {
  const perms = await requireSectionAccess(section);
  return { userId: perms.userId, tenantId: perms.tenantId, role: perms.role, sections: perms.sections };
}

export async function getSession() {
  return auth.api.getSession({ headers: await headers() });
}

export async function requireAdmin() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) throw new Error("No autenticado");
  if (session.user.role !== "admin") throw new Error("Sin permisos de administrador");
  return session;
}
