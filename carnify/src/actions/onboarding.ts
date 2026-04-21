"use server";

import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { seedDefaultProducts } from "./products";

export async function createOrganizationWithDefaults(name: string) {
  const hdrs = await headers();
  const session = await auth.api.getSession({ headers: hdrs });
  if (!session?.user) return { error: "No autenticado" };

  const slug = name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");

  const result = await auth.api.createOrganization({
    body: { name, slug, userId: session.user.id },
    headers: hdrs,
  });

  if (!result?.id) return { error: "Error al crear la organización" };

  await auth.api.setActiveOrganization({
    body: { organizationId: result.id },
    headers: hdrs,
  });

  await seedDefaultProducts(result.id);

  return { data: result };
}