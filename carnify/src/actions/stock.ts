"use server";

import { prisma } from "@/lib/db";
import { requireTenantAndSection } from "./_helpers";
import { revalidatePath } from "next/cache";
import { z } from "zod";

const MovementSchema = z.object({
  type: z.enum(["entry", "exit", "adjustment", "sale", "cancellation"]),
  productName: z.string().min(1),
  quantity: z.number().positive(),
  unit: z.string(),
  supplier: z.string().optional(),
  batch: z.string().optional(),
  origin: z.string().optional(),
  note: z.string().optional(),
  productId: z.string().optional(),
});

export async function getStockMovements(limit = 1000, offset = 0) {
  const { tenantId } = await requireTenantAndSection("inventario");
  return prisma.stockMovement.findMany({
    where: { organizationId: tenantId },
    include: { product: { select: { id: true, name: true, emoji: true } } },
    orderBy: { date: "desc" },
    take: limit,
    skip: offset,
  });
}

export async function getInventory() {
  const { tenantId } = await requireTenantAndSection("inventario");

  const items = await prisma.inventoryItem.findMany({
    where: { organizationId: tenantId },
    include: { product: { select: { id: true, name: true, emoji: true, price: true, unit: true } } },
    orderBy: { product: { name: "asc" } },
  });

  const productIdsWithStock = new Set(items.map((i) => i.productId));
  const products = await prisma.product.findMany({
    where: { organizationId: tenantId, id: { notIn: Array.from(productIdsWithStock) } },
    select: { id: true, name: true, emoji: true, price: true, unit: true },
  });

  for (const p of products) {
    items.push({
      id: `virtual-${p.id}`,
      organizationId: tenantId,
      productId: p.id,
      product: p,
      quantity: 0,
      unit: p.unit,
      updatedAt: new Date(),
    } as typeof items[number]);
  }

  return items.sort((a, b) => a.product.name.localeCompare(b.product.name));
}

export async function getInventoryForPos() {
  const { tenantId } = await requireTenantAndSection("pos");
  return prisma.inventoryItem.findMany({
    where: { organizationId: tenantId },
    select: {
      productId: true,
      quantity: true,
      unit: true,
    },
  });
}

export async function addStockMovement(data: z.infer<typeof MovementSchema>) {
  const { tenantId } = await requireTenantAndSection("inventario");
  const parsed = MovementSchema.parse(data);

  const movement = await prisma.$transaction(async (tx) => {
    const mov = await tx.stockMovement.create({
      data: {
        organizationId: tenantId,
        type: parsed.type,
        productId: parsed.productId ?? null,
        productName: parsed.productName,
        quantity: parsed.quantity,
        unit: parsed.unit,
        supplier: parsed.supplier,
        batch: parsed.batch,
        origin: parsed.origin,
        note: parsed.note,
      },
    });

    if (parsed.productId) {
      const sign = parsed.type === "exit" || parsed.type === "sale" ? -1 : 1;
      const existingInventory = await tx.inventoryItem.findUnique({
        where: { productId: parsed.productId },
      });

      if (sign < 0 && (!existingInventory || existingInventory.quantity < parsed.quantity)) {
        const available = existingInventory?.quantity ?? 0;
        throw new Error(
          `Stock insuficiente para ${parsed.productName}. Disponible: ${available.toFixed(parsed.unit === "kg" ? 3 : 0)} ${existingInventory?.unit ?? parsed.unit}.`
        );
      }

      await tx.inventoryItem.upsert({
        where: { productId: parsed.productId },
        create: {
          organizationId: tenantId,
          productId: parsed.productId,
          quantity: parsed.quantity * sign,
          unit: parsed.unit,
        },
        update: {
          quantity: { increment: parsed.quantity * sign },
          unit: parsed.unit,
        },
      });
    }

    return mov;
  });

  revalidatePath("/inventario");
  revalidatePath("/");
  return movement;
}
