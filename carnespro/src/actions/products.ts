"use server";

import { prisma } from "@/lib/db";
import { requireTenant } from "./_helpers";
import { revalidatePath } from "next/cache";
import { z } from "zod";

const ProductSchema = z.object({
  plu: z.string().min(1),
  name: z.string().min(1),
  category: z.string().min(1),
  emoji: z.string().min(1),
  price: z.number().positive(),
  unit: z.enum(["kg", "un"]),
});

export async function getProducts() {
  const { tenantId } = await requireTenant();
  return prisma.product.findMany({
    where: { organizationId: tenantId },
    include: { cost: true },
    orderBy: { name: "asc" },
  });
}

export async function createProduct(data: z.infer<typeof ProductSchema>) {
  const { tenantId } = await requireTenant();
  const parsed = ProductSchema.parse(data);
  const product = await prisma.product.create({
    data: { ...parsed, organizationId: tenantId },
    include: { cost: true },
  });
  revalidatePath("/productos");
  revalidatePath("/costos");
  return product;
}

export async function updateProduct(id: string, data: Partial<z.infer<typeof ProductSchema>>) {
  const { tenantId } = await requireTenant();
  const product = await prisma.product.updateMany({
    where: { id, organizationId: tenantId },
    data,
  });
  revalidatePath("/productos");
  revalidatePath("/pos");
  return product;
}

export async function deleteProduct(id: string) {
  const { tenantId } = await requireTenant();
  await prisma.product.deleteMany({ where: { id, organizationId: tenantId } });
  revalidatePath("/productos");
  revalidatePath("/pos");
}
