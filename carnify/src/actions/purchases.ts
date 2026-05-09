"use server";

import { prisma } from "@/lib/db";
import { requireTenantAndSection } from "./_helpers";
import { revalidatePath } from "next/cache";
import { z } from "zod";

const SupplierSchema = z.object({
  name: z.string().min(1),
  contactName: z.string().default(""),
  phone: z.string().default(""),
  email: z.string().default(""),
  address: z.string().default(""),
  cuit: z.string().default(""),
  notes: z.string().default(""),
});

const PurchaseItemInputSchema = z.object({
  productId: z.string().min(1),
  quantity: z.number().positive(),
  unit: z.string(),
  unitCost: z.number().positive(),
});

const PurchaseSchema = z.object({
  supplierId: z.string().min(1),
  date: z.coerce.date().optional(),
  paymentMethod: z.string().default("cash"),
  notes: z.string().default(""),
  items: z.array(PurchaseItemInputSchema).min(1),
});

// ─── Suppliers ──────────────────────────────────────────────────────────────

export async function getSuppliers() {
  const { tenantId } = await requireTenantAndSection("compras");
  return prisma.supplier.findMany({
    where: { organizationId: tenantId },
    orderBy: { name: "asc" },
  });
}

export async function createSupplier(data: z.infer<typeof SupplierSchema>) {
  const { tenantId } = await requireTenantAndSection("compras");
  const parsed = SupplierSchema.parse(data);
  const supplier = await prisma.supplier.create({
    data: { ...parsed, organizationId: tenantId },
  });
  revalidatePath("/compras");
  return supplier;
}

export async function updateSupplier(id: string, data: Partial<z.infer<typeof SupplierSchema>>) {
  const { tenantId } = await requireTenantAndSection("compras");
  await prisma.supplier.updateMany({ where: { id, organizationId: tenantId }, data });
  revalidatePath("/compras");
}

export async function deleteSupplier(id: string) {
  const { tenantId } = await requireTenantAndSection("compras");
  await prisma.supplier.deleteMany({ where: { id, organizationId: tenantId } });
  revalidatePath("/compras");
}

// ─── Purchases ──────────────────────────────────────────────────────────────

export async function getPurchases() {
  const { tenantId } = await requireTenantAndSection("compras");
  return prisma.purchase.findMany({
    where: { organizationId: tenantId },
    include: {
      supplier: { select: { id: true, name: true } },
      items: { include: { product: { select: { id: true, name: true, emoji: true } } } },
    },
    orderBy: { date: "desc" },
  });
}

export async function createPurchase(data: z.infer<typeof PurchaseSchema>) {
  const { tenantId } = await requireTenantAndSection("compras");
  const parsed = PurchaseSchema.parse(data);

  const total = parsed.items.reduce((acc, i) => acc + i.unitCost * i.quantity, 0);

  const purchase = await prisma.$transaction(async (tx) => {
    const p = await tx.purchase.create({
      data: {
        organizationId: tenantId,
        supplierId: parsed.supplierId,
        date: parsed.date ?? new Date(),
        total,
        paymentMethod: parsed.paymentMethod,
        status: "completed",
        notes: parsed.notes,
        items: {
          create: parsed.items.map((i) => ({
            productId: i.productId,
            quantity: i.quantity,
            unit: i.unit,
            unitCost: i.unitCost,
            totalCost: i.unitCost * i.quantity,
          })),
        },
      },
      include: { items: true },
    });

    for (const item of parsed.items) {
      await tx.inventoryItem.upsert({
        where: { productId: item.productId },
        create: {
          organizationId: tenantId,
          productId: item.productId,
          quantity: item.quantity,
          unit: item.unit,
        },
        update: {
          quantity: { increment: item.quantity },
          unit: item.unit,
        },
      });

      await tx.stockMovement.create({
        data: {
          organizationId: tenantId,
          type: "entry",
          productId: item.productId,
          productName: item.productId,
          quantity: item.quantity,
          unit: item.unit,
          supplier: parsed.supplierId,
          note: `Compra #${p.id.slice(-6)}`,
        },
      });

      await tx.productCost.upsert({
        where: { productId: item.productId },
        create: { productId: item.productId, organizationId: tenantId, cost: item.unitCost },
        update: { cost: item.unitCost },
      });
    }

    return p;
  });

  revalidatePath("/compras");
  revalidatePath("/inventario");
  revalidatePath("/costos");
  return purchase;
}

export async function deletePurchase(id: string) {
  const { tenantId } = await requireTenantAndSection("compras");
  await prisma.purchase.deleteMany({ where: { id, organizationId: tenantId } });
  revalidatePath("/compras");
}
