"use server";

import { auth } from "@/lib/auth";
import { headers } from "next/headers";

export async function requireTenant() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) throw new Error("No autenticado");
  const tenantId = session.session.activeOrganizationId;
  if (!tenantId) throw new Error("Sin carnicería activa");
  return { userId: session.user.id, tenantId };
}

export async function getSession() {
  return auth.api.getSession({ headers: await headers() });
}
