"use server";

import { prisma } from "@/lib/db";
import { requireTenant } from "./_helpers";
import { revalidatePath } from "next/cache";
import { z } from "zod";

const SplitSchema = z.object({ method: z.string(), amount: z.number() });
const CartItemSchema = z.object({
  productId: z.string().optional(),
  name: z.string(),
  price: z.number(),
  quantity: z.number(),
  unit: z.string(),
  emoji: z.string().optional(),
});

export async function getCurrentSession() {
  const { tenantId } = await requireTenant();
  return prisma.cajaSession.findFirst({
    where: { organizationId: tenantId, closedAt: null },
    include: {
      sales: { include: { splits: true, items: true } },
      transactions: true,
    },
    orderBy: { openedAt: "desc" },
  });
}

export async function getSessionHistory() {
  const { tenantId } = await requireTenant();
  return prisma.cajaSession.findMany({
    where: { organizationId: tenantId, closedAt: { not: null } },
    include: {
      sales: { include: { splits: true } },
      transactions: true,
    },
    orderBy: { openedAt: "desc" },
    take: 30,
  });
}

export async function openCaja(startingCash: number) {
  const { tenantId, userId } = await requireTenant();
  const existing = await prisma.cajaSession.findFirst({
    where: { organizationId: tenantId, closedAt: null },
  });
  if (existing) throw new Error("Ya hay una caja abierta");

  const session = await prisma.cajaSession.create({
    data: { organizationId: tenantId, startingCash, openedById: userId },
    include: { sales: true, transactions: true },
  });
  revalidatePath("/caja");
  return session;
}

export async function closeCaja(realAmounts: Record<string, number>) {
  const { tenantId, userId } = await requireTenant();
  const session = await prisma.cajaSession.findFirst({
    where: { organizationId: tenantId, closedAt: null },
    include: { sales: { include: { splits: true } }, transactions: true },
  });
  if (!session) throw new Error("No hay caja abierta");

  // Calculate teorico and diff
  const tericoByMethod: Record<string, number> = { cash: session.startingCash };
  session.sales.forEach((sale: { method: string; total: number; splits: { method: string; amount: number }[] }) => {
    if (sale.splits.length > 0) {
      sale.splits.forEach((sp: { method: string; amount: number }) => {
        tericoByMethod[sp.method] = (tericoByMethod[sp.method] ?? 0) + sp.amount;
      });
    } else {
      tericoByMethod[sale.method] = (tericoByMethod[sale.method] ?? 0) + sale.total;
    }
  });
  session.transactions.forEach((t: { type: string; amount: number }) => {
    tericoByMethod["cash"] = (tericoByMethod["cash"] ?? 0) + (t.type === "in" ? t.amount : -t.amount);
  });

  const diffByMethod: Record<string, number> = {};
  let diffTotal = 0;
  Object.keys({ ...tericoByMethod, ...realAmounts }).forEach((k) => {
    const real = realAmounts[k] ?? 0;
    const teorico = tericoByMethod[k] ?? 0;
    diffByMethod[k] = real - teorico;
    if (k === "cash") diffTotal += real - teorico;
  });

  await prisma.cajaSession.update({
    where: { id: session.id },
    data: {
      closedAt: new Date(),
      closedById: userId,
      realAmounts,
      tericoByMethod,
      diffByMethod,
      diffAmount: diffTotal,
    },
  });
  revalidatePath("/caja");
  revalidatePath("/reportes");
}

export async function recordSale(
  total: number,
  splits: z.infer<typeof SplitSchema>[],
  items: z.infer<typeof CartItemSchema>[],
  clientId?: string,
  clientName?: string,
) {
  const { tenantId } = await requireTenant();
  const session = await prisma.cajaSession.findFirst({
    where: { organizationId: tenantId, closedAt: null },
  });
  if (!session) throw new Error("No hay caja abierta");

  const method = splits.length > 1 ? "mixed" : splits[0]?.method ?? "cash";

  const sale = await prisma.sale.create({
    data: {
      sessionId: session.id,
      total,
      method,
      itemCount: items.length,
      clientId: clientId ?? null,
      clientName: clientName ?? null,
      splits: {
        create: splits.map((s) => ({ method: s.method, amount: s.amount })),
      },
      items: {
        create: items.map((i) => ({
          productId: i.productId ?? null,
          name: i.name,
          price: i.price,
          quantity: i.quantity,
          unit: i.unit,
          emoji: i.emoji ?? null,
        })),
      },
    },
    include: { splits: true, items: true },
  });
  revalidatePath("/caja");
  revalidatePath("/reportes");
  return sale;
}

export async function addCashTransaction(type: "in" | "out", amount: number, reason: string) {
  const { tenantId } = await requireTenant();
  const session = await prisma.cajaSession.findFirst({
    where: { organizationId: tenantId, closedAt: null },
  });
  if (!session) throw new Error("No hay caja abierta");

  const tx = await prisma.cashTransaction.create({
    data: { organizationId: tenantId, sessionId: session.id, type, amount, reason },
  });
  revalidatePath("/caja");
  return tx;
}
