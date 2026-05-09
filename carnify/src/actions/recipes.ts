"use server";

import { prisma } from "@/lib/db";
import { requireTenantAndSection } from "./_helpers";
import { revalidatePath } from "next/cache";
import { z } from "zod";

const RecipeItemSchema = z.object({
  outputId: z.string().min(1),
  inputId: z.string().min(1),
  quantity: z.number().positive(),
  unit: z.string(),
  yieldFactor: z.number().positive().default(1),
});

export async function getRecipes(tenantId?: string) {
  const { tenantId: tid } = tenantId ? { tenantId } : await requireTenantAndSection("productos");
  const id = tenantId ?? tid;

  const items = await prisma.recipeItem.findMany({
    where: { organizationId: id },
    include: {
      output: { select: { id: true, name: true, emoji: true, unit: true } },
      input: { select: { id: true, name: true, emoji: true, unit: true, price: true } },
    },
    orderBy: [{ outputId: "asc" }],
  });

  const grouped: Record<string, typeof items> = {};
  for (const item of items) {
    if (!grouped[item.outputId]) grouped[item.outputId] = [];
    grouped[item.outputId].push(item);
  }

  return grouped;
}

export async function upsertRecipeItem(data: z.infer<typeof RecipeItemSchema>) {
  const { tenantId } = await requireTenantAndSection("productos");
  const parsed = RecipeItemSchema.parse(data);

  const existing = await prisma.recipeItem.findFirst({
    where: {
      organizationId: tenantId,
      outputId: parsed.outputId,
      inputId: parsed.inputId,
    },
  });

  if (existing) {
    await prisma.recipeItem.update({
      where: { id: existing.id },
      data: { quantity: parsed.quantity, unit: parsed.unit, yieldFactor: parsed.yieldFactor },
    });
  } else {
    await prisma.recipeItem.create({
      data: { ...parsed, organizationId: tenantId },
    });
  }

  revalidatePath("/productos");
  revalidatePath("/costos");
}

export async function deleteRecipeItem(outputId: string, inputId: string) {
  const { tenantId } = await requireTenantAndSection("productos");

  await prisma.recipeItem.deleteMany({
    where: { organizationId: tenantId, outputId, inputId },
  });

  revalidatePath("/productos");
  revalidatePath("/costos");
}
