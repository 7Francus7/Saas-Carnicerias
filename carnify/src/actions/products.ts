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
  unit: z.enum(["kg", "un", "lt"]),
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

const DEFAULT_PRODUCTS = [
  { plu: "001", name: "Carne Molida", category: "Vacuno", emoji: "🥩", price: 2500, unit: "kg" as const },
  { plu: "002", name: "Bife Ancho", category: "Vacuno", emoji: "🥩", price: 3200, unit: "kg" as const },
  { plu: "003", name: "Costilla", category: "Vacuno", emoji: "🥩", price: 1800, unit: "kg" as const },
  { plu: "004", name: "Chorizo", category: "Embutidos", emoji: "🌭", price: 2200, unit: "kg" as const },
  { plu: "005", name: "Morcilla", category: "Embutidos", emoji: "🌭", price: 1900, unit: "kg" as const },
  { plu: "006", name: "Salchicha", category: "Embutidos", emoji: "🌭", price: 1500, unit: "kg" as const },
  { plu: "007", name: "Pollo Entero", category: "Pollo", emoji: "🍗", price: 1400, unit: "kg" as const },
  { plu: "008", name: "Pechuga", category: "Pollo", emoji: "🍗", price: 1800, unit: "kg" as const },
  { plu: "009", name: "Alas", category: "Pollo", emoji: "🍗", price: 900, unit: "kg" as const },
  { plu: "010", name: "Patas", category: "Pollo", emoji: "🍗", price: 600, unit: "kg" as const },
  { plu: "011", name: "Hueso", category: "Pollo", emoji: "🍗", price: 400, unit: "kg" as const },
];

export async function seedDefaultProducts(tenantId: string) {
  await prisma.product.createMany({
    data: DEFAULT_PRODUCTS.map((p) => ({ ...p, organizationId: tenantId })),
  });
}
