"use server";

import { prisma } from "@/lib/db";
import { requireTenantAndSection } from "./_helpers";
import { revalidatePath } from "next/cache";
import { z } from "zod";

const ProductSchema = z.object({
  plu: z.string().min(1),
  name: z.string().min(1),
  category: z.string().min(1),
  emoji: z.string().min(1),
  price: z.number().positive(),
  unit: z.enum(["kg", "un", "lt"]),
  baseUnit: z.enum(["kg", "un", "lt"]).optional(),
  conversionFactor: z.number().positive().optional(),
  productType: z.enum(["raw", "processed", "resale"]).optional(),
  discountPercent: z.number().min(0).max(100).optional(),
  discountEndDate: z.string().datetime().nullable().optional(),
});

export async function getProducts() {
  const { tenantId } = await requireTenantAndSection("productos");
  return prisma.product.findMany({
    where: { organizationId: tenantId, active: true },
    orderBy: { name: "asc" },
  });
}

export async function getProductsWithCost() {
  const { tenantId } = await requireTenantAndSection("productos");
  return prisma.product.findMany({
    where: { organizationId: tenantId, active: true },
    include: { cost: true },
    orderBy: { name: "asc" },
  });
}

export async function createProduct(data: z.infer<typeof ProductSchema>) {
  const { tenantId } = await requireTenantAndSection("productos");
  const parsed = ProductSchema.parse(data);

  // PLU opción (b): la unicidad [organizationId, plu] cuenta inactivos, así que un
  // producto soft-deleted con el mismo PLU bloquearía el alta. Si existe, lo
  // reactivamos y sobreescribimos con los datos nuevos en vez de crear un duplicado.
  const inactiveSamePlu = await prisma.product.findFirst({
    where: { organizationId: tenantId, plu: parsed.plu, active: false },
    select: { id: true },
  });
  if (inactiveSamePlu) {
    const product = await prisma.product.update({
      where: { id: inactiveSamePlu.id },
      data: { ...parsed, active: true },
      include: { cost: true },
    });
    revalidatePath("/productos");
    revalidatePath("/costos");
    revalidatePath("/pos");
    return product;
  }

  const product = await prisma.product.create({
    data: { ...parsed, organizationId: tenantId },
    include: { cost: true },
  });
  revalidatePath("/productos");
  revalidatePath("/costos");
  return product;
}

export async function updateProduct(id: string, data: Partial<z.infer<typeof ProductSchema>>) {
  const { tenantId } = await requireTenantAndSection("productos");
  const parsed = ProductSchema.partial().parse(data);
  const product = await prisma.product.updateMany({
    where: { id, organizationId: tenantId },
    data: parsed,
  });
  revalidatePath("/productos");
  revalidatePath("/pos");
  return product;
}

export async function deleteProduct(id: string) {
  const { tenantId } = await requireTenantAndSection("productos");
  // Soft-delete: marcar inactivo en vez de borrar. Preserva el vínculo con el
  // historial (SaleItem/StockMovement/PurchaseItem) y evita el fallo FK Restrict
  // de PurchaseItem.product al borrar un producto ya comprado.
  await prisma.product.updateMany({
    where: { id, organizationId: tenantId },
    data: { active: false },
  });
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
