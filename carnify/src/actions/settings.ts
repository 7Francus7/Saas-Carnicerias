"use server";

import { prisma } from "@/lib/db";
import { requireTenantAndSection } from "./_helpers";
import { revalidatePath } from "next/cache";

export async function getSettings() {
  const { tenantId } = await requireTenantAndSection("config");
  return prisma.businessSettings.upsert({
    where: { organizationId: tenantId },
    create: { organizationId: tenantId },
    update: {},
  });
}

export async function getPosRuntimeSettings() {
  const { tenantId } = await requireTenantAndSection("pos");
  return prisma.businessSettings.findUnique({
    where: { organizationId: tenantId },
    select: {
      nombre: true,
      defaultPaymentMethod: true,
      stockAlertThreshold: true,
      requireConfirmOnCheckout: true,
    },
  });
}

export async function getInventoryRuntimeSettings() {
  const { tenantId } = await requireTenantAndSection("inventario");
  return prisma.businessSettings.findUnique({
    where: { organizationId: tenantId },
    select: {
      stockAlertThreshold: true,
    },
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
  const { tenantId } = await requireTenantAndSection("config");
  await prisma.businessSettings.upsert({
    where: { organizationId: tenantId },
    create: { organizationId: tenantId, ...data },
    update: data,
  });
  revalidatePath("/config");
  revalidatePath("/");
}
