"use server";

import { prisma } from "@/lib/db";
import { requireTenant } from "./_helpers";
import { revalidatePath } from "next/cache";

export async function getCostos() {
  const { tenantId } = await requireTenant();
  return prisma.productCost.findMany({
    where: { organizationId: tenantId },
    include: { product: true },
  });
}

export async function upsertCosto(productId: string, cost: number) {
  const { tenantId } = await requireTenant();
  // Verify product belongs to tenant
  const product = await prisma.product.findFirst({ where: { id: productId, organizationId: tenantId } });
  if (!product) throw new Error("Producto no encontrado");

  await prisma.productCost.upsert({
    where: { productId },
    create: { productId, organizationId: tenantId, cost },
    update: { cost },
  });
  revalidatePath("/costos");
}

export async function deleteCosto(productId: string) {
  const { tenantId } = await requireTenant();
  await prisma.productCost.deleteMany({ where: { productId, organizationId: tenantId } });
  revalidatePath("/costos");
}
