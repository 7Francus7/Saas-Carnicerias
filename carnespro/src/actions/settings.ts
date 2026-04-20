"use server";

import { prisma } from "@/lib/db";
import { requireTenant } from "./_helpers";
import { revalidatePath } from "next/cache";

export async function getSettings() {
  const { tenantId } = await requireTenant();
  return prisma.businessSettings.upsert({
    where: { organizationId: tenantId },
    create: { organizationId: tenantId },
    update: {},
  });
}

export async function updateSettings(data: {
  nombre?: string;
  iniciales?: string;
  direccion?: string;
  telefono?: string;
  cuit?: string;
  email?: string;
  defaultPaymentMethod?: string;
  stockAlertThreshold?: number;
  requireConfirmOnCheckout?: boolean;
}) {
  const { tenantId } = await requireTenant();
  await prisma.businessSettings.upsert({
    where: { organizationId: tenantId },
    create: { organizationId: tenantId, ...data },
    update: data,
  });
  revalidatePath("/config");
  revalidatePath("/");
}
