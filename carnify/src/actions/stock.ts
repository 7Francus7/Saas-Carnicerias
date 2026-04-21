"use server";

import { prisma } from "@/lib/db";
import { requireTenant } from "./_helpers";
import { revalidatePath } from "next/cache";
import { z } from "zod";

const MovementSchema = z.object({
  type: z.enum(["entry", "exit", "adjustment"]),
  productName: z.string().min(1),
  quantity: z.number().positive(),
  unit: z.string(),
  supplier: z.string().optional(),
  note: z.string().optional(),
});

export async function getStockMovements() {
  const { tenantId } = await requireTenant();
  return prisma.stockMovement.findMany({
    where: { organizationId: tenantId },
    orderBy: { date: "desc" },
    take: 200,
  });
}

export async function addStockMovement(data: z.infer<typeof MovementSchema>) {
  const { tenantId } = await requireTenant();
  const parsed = MovementSchema.parse(data);
  const movement = await prisma.stockMovement.create({
    data: { ...parsed, organizationId: tenantId },
  });
  revalidatePath("/inventario");
  return movement;
}
