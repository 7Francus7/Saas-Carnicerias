"use server";

import { prisma } from "@/lib/db";
import { requireTenantAndSection } from "./_helpers";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { startOfDay, addDays, getARTHour, getARTDayOfWeek } from "@/lib/dateUtils";

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
  const { tenantId } = await requireTenantAndSection("caja");
  return prisma.cajaSession.findFirst({
    where: { organizationId: tenantId, closedAt: null },
    include: {
      sales: { include: { splits: true } },
      transactions: true,
    },
    orderBy: { openedAt: "desc" },
  });
}

export async function getSessionHistory(limit = 30) {
  const { tenantId } = await requireTenantAndSection("caja");
  return prisma.cajaSession.findMany({
    where: { organizationId: tenantId, closedAt: { not: null } },
    include: {
      sales: { include: { splits: true } },
      transactions: true,
    },
    orderBy: { openedAt: "desc" },
    take: limit,
  });
}

export async function getSessionDetail(id: string) {
  const { tenantId } = await requireTenantAndSection("caja");
  return prisma.cajaSession.findFirst({
    where: { id, organizationId: tenantId },
    include: {
      sales: {
        include: {
          splits: true,
          items: {
            include: {
              product: { select: { id: true, name: true, category: true, emoji: true, unit: true } },
            },
          },
        },
      },
      transactions: true,
    },
  });
}

export async function openCaja(startingCash: number) {
  const { tenantId, userId } = await requireTenantAndSection("caja");
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
  const { tenantId, userId } = await requireTenantAndSection("caja");

  const session = await prisma.cajaSession.findFirst({
    where: { organizationId: tenantId, closedAt: null },
    include: {
      sales: { where: { status: "active" }, include: { splits: true } },
      transactions: true,
    },
  });
  if (!session) throw new Error("No hay caja abierta");

  // Calculate teorico and diff.
  // Fiado (cuenta corriente) is NOT a reconcilable amount — it never lands in caja
  // nor in a bank account, so it must be excluded from the theoretical totals.
  // Including it produced a false "faltante" equal to the fiado total on every close.
  const tericoByMethod: Record<string, number> = { cash: session.startingCash };
  session.sales.forEach((sale: { method: string; total: number; splits: { method: string; amount: number }[] }) => {
    if (sale.splits.length > 0) {
      sale.splits.forEach((sp: { method: string; amount: number }) => {
        if (sp.method === "fiado") return;
        tericoByMethod[sp.method] = (tericoByMethod[sp.method] ?? 0) + sp.amount;
      });
    } else {
      if (sale.method === "fiado") return;
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
    diffTotal += real - teorico;
  });
  diffTotal = Math.round(diffTotal * 100) / 100;

  await prisma.$transaction(async (tx) => {
    const current = await tx.cajaSession.findFirst({
      where: { id: session.id, closedAt: null },
    });
    if (!current) throw new Error("La caja ya fue cerrada por otro usuario");

    await tx.cajaSession.update({
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
  const { tenantId } = await requireTenantAndSection("pos");
  const parsedSplits = z.array(SplitSchema).parse(splits);
  const parsedItems = z.array(CartItemSchema).parse(items);
  if (parsedSplits.length === 0) throw new Error("La venta debe tener al menos un medio de pago");

  const totalInCents = Math.round(total * 100);
  const splitTotalInCents = Math.round(
    parsedSplits.reduce((acc, split) => acc + split.amount, 0) * 100
  );
  if (Math.abs(totalInCents - splitTotalInCents) > 1) {
    throw new Error("La suma de los medios de pago no coincide con el total");
  }

  const [session, settings] = await Promise.all([
    prisma.cajaSession.findFirst({ where: { organizationId: tenantId, closedAt: null } }),
    prisma.businessSettings.findUnique({ where: { organizationId: tenantId }, select: { enforceStock: true } }),
  ]);
  if (!session) throw new Error("No hay caja abierta");
  const enforceStock = settings?.enforceStock ?? true;

  const method = parsedSplits.length > 1 ? "mixed" : parsedSplits[0]?.method ?? "cash";
  const fiadoAmount = parsedSplits
    .filter((s) => s.method === "fiado")
    .reduce((acc, s) => acc + s.amount, 0);
  if (fiadoAmount > 0 && !clientId) {
    throw new Error("Selecciona un cliente para registrar una venta fiada");
  }

  const sale = await prisma.$transaction(async (tx) => {
    const costMap = new Map<string, number>();
    const costs = await tx.productCost.findMany({
      where: { organizationId: tenantId },
      select: { productId: true, cost: true },
    });
    for (const c of costs) costMap.set(c.productId, c.cost);

    const newSale = await tx.sale.create({
      data: {
        sessionId: session.id,
        total,
        method,
        itemCount: items.length,
        clientId: clientId ?? null,
        clientName: clientName ?? null,
        splits: {
          create: parsedSplits.map((s) => ({ method: s.method, amount: s.amount })),
        },
        items: {
          create: parsedItems.map((i) => ({
            productId: i.productId ?? null,
            name: i.name,
            price: i.price,
            unitCost: i.productId ? (costMap.get(i.productId) ?? null) : null,
            quantity: i.quantity,
            unit: i.unit,
            emoji: i.emoji ?? null,
          })),
        },
      },
      include: { splits: true, items: true },
    });

    if (fiadoAmount > 0 && clientId) {
      const client = await tx.client.findFirst({
        where: { id: clientId, organizationId: tenantId },
      });
      if (!client) {
        throw new Error("El cliente seleccionado no existe o fue eliminado. Cancelá la venta y seleccioná un cliente válido.");
      }
      const newBalance = client.balance + fiadoAmount;
      await tx.clientMovement.create({
        data: {
          clientId,
          date: new Date(),
          type: "sale",
          amount: fiadoAmount,
          balanceAfter: newBalance,
          description: `Venta #${newSale.id.slice(-6)}`,
          ticketId: newSale.id,
        },
      });
      await tx.client.update({
        where: { id: clientId },
        data: {
          balance: newBalance,
          status: newBalance > client.creditLimit ? "overdue" : "active",
          lastActivity: new Date(),
        },
      });
    }

    for (const item of parsedItems) {
      if (item.productId) {
        const existingInventory = await tx.inventoryItem.findUnique({
          where: { productId: item.productId },
        });

        if (enforceStock && existingInventory) {
          if (existingInventory.quantity < item.quantity) {
            throw new Error(
              `Stock insuficiente para ${item.name}. Disponible: ${existingInventory.quantity.toFixed(item.unit === "kg" ? 3 : 0)} ${existingInventory.unit}.`
            );
          }
          await tx.inventoryItem.update({
            where: { productId: item.productId },
            data: { quantity: { decrement: item.quantity }, unit: item.unit },
          });
          await tx.stockMovement.create({
            data: {
              organizationId: tenantId,
              type: "sale",
              productId: item.productId,
              productName: item.name,
              quantity: item.quantity,
              unit: item.unit,
              note: `Venta #${newSale.id.slice(-6)}`,
            },
          });
        }
      }
    }

    return newSale;
  });

  revalidatePath("/caja");
  revalidatePath("/inventario");
  revalidatePath("/reportes");
  revalidatePath("/clientes");
  return sale;
}

export async function getDashboardStats() {
  const { tenantId } = await requireTenantAndSection("dashboard");
  const now = new Date();
  const todayStart = startOfDay(now);
  const todayEnd = addDays(todayStart, 1);

  const sessions = await prisma.cajaSession.findMany({
    where: {
      organizationId: tenantId,
      closedAt: null,
    },
    include: {
      sales: { where: { status: "active" }, include: { splits: true } },
      transactions: true,
    },
    orderBy: { openedAt: "desc" },
    take: 1,
  });

  const closedToday = await prisma.cajaSession.findMany({
    where: {
      organizationId: tenantId,
      closedAt: { gte: todayStart, lt: todayEnd },
    },
    include: {
      sales: { where: { status: "active" }, include: { splits: true } },
    },
  });

  let totalRevenue = 0;
  let totalOrders = 0;
  const clientIds = new Set<string>();
  const hourlyMap: Record<string, number> = {};
  const paymentMap: Record<string, number> = {};

  const processSales = (sales: typeof sessions[0]['sales']) => {
    for (const sale of sales) {
      // Filter by actual sale timestamp — prevents showing yesterday's sales if caja was left open
      const ts = new Date(sale.timestamp);
      if (ts < todayStart || ts >= todayEnd) continue;

      totalRevenue += sale.total;
      totalOrders += 1;
      if (sale.clientId) clientIds.add(sale.clientId);

      const h = getARTHour(ts).toString().padStart(2, "0") + ":00";
      hourlyMap[h] = (hourlyMap[h] ?? 0) + sale.total;

      if (sale.splits.length > 0) {
        sale.splits.forEach((sp) => { paymentMap[sp.method] = (paymentMap[sp.method] ?? 0) + sp.amount; });
      } else {
        paymentMap[sale.method] = (paymentMap[sale.method] ?? 0) + sale.total;
      }
    }
  };

  const activeSession = sessions[0] ?? null;
  if (activeSession) processSales(activeSession.sales);
  for (const s of closedToday) processSales(s.sales);

  // Weekly data (last 7 days)
  const weekStart = addDays(todayStart, -6);
  const weekSessions = await prisma.cajaSession.findMany({
    where: {
      organizationId: tenantId,
      openedAt: { gte: weekStart },
    },
    include: { sales: { where: { status: "active" } } },
  });

  const dayMap: Record<string, number> = {};
  const dayLabels = ["dom", "lun", "mar", "mié", "jue", "vie", "sáb"];
  for (let i = 0; i < 7; i++) {
    const dayStart = addDays(weekStart, i);
    const dayEnd = addDays(dayStart, 1);
    const dow = getARTDayOfWeek(dayStart);
    dayMap[dayLabels[dow]] = 0;
    for (const s of weekSessions) {
      for (const sale of s.sales) {
        const saleTs = new Date(sale.timestamp);
        if (saleTs >= dayStart && saleTs < dayEnd) {
          dayMap[dayLabels[dow]] += sale.total;
        }
      }
    }
  }

  const paymentColors: Record<string, string> = {
    cash: "#22C55E", transfer: "#3B82F6", card: "#F59E0B",
    link: "#A855F7", fiado: "#EF4444", mixed: "#8B5CF6",
  };

  return {
    revenue: totalRevenue,
    orders: totalOrders,
    ticket: totalOrders > 0 ? Math.round(totalRevenue / totalOrders) : 0,
    clients: Math.max(clientIds.size, totalOrders > 0 ? 1 : 0),
    hasOpenCaja: activeSession !== null,
    hourlySales: Object.entries(hourlyMap)
      .map(([hour, val]) => ({ hour, ventas: val }))
      .sort((a, b) => a.hour.localeCompare(b.hour)),
    weeklySales: Object.entries(dayMap).map(([day, ventas]) => ({ day, ventas })),
    paymentBreakdown: Object.entries(paymentMap)
      .map(([method, amount]) => ({ method, amount, percentage: totalRevenue > 0 ? parseFloat(((amount / totalRevenue) * 100).toFixed(1)) : 0, color: paymentColors[method] ?? "#888" }))
      .sort((a, b) => b.amount - a.amount),
    recentSales: (activeSession?.sales ?? [])
      .filter((v) => {
        const ts = new Date(v.timestamp);
        return ts >= todayStart && ts < todayEnd;
      })
      .slice(-5).reverse()
      .map((v) => ({
        id: `TK-${v.id.substring(0, 4).toUpperCase()}`,
        time: new Date(v.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        items: v.itemCount || 1,
        total: v.total,
        payment: v.method,
        client: v.clientName || null,
      })),
    stockAlerts: [],
    topProducts: [],
  };
}

export async function getSalesForPeriod(start: Date, end: Date) {
  const { tenantId } = await requireTenantAndSection("caja");
  return prisma.sale.findMany({
    where: {
      session: { organizationId: tenantId },
      timestamp: { gte: start, lte: end },
      status: "active",
    },
    include: {
      items: true,
      splits: true,
      client: { select: { id: true, name: true } },
    },
    orderBy: { timestamp: "desc" },
  });
}

export async function getSalesWithMargins(start: Date, end: Date) {
  const { tenantId } = await requireTenantAndSection("caja");
  const sales = await prisma.sale.findMany({
    where: {
      session: { organizationId: tenantId },
      timestamp: { gte: start, lte: end },
      status: "active",
    },
    include: {
      items: { where: { productId: { not: null } } },
      session: { select: { id: true, openedAt: true } },
    },
    orderBy: { timestamp: "desc" },
  });

  let totalRevenue = 0;
  let totalCost = 0;
  let totalItems = 0;
  const productMap = new Map<string, { name: string; revenue: number; cost: number; qty: number }>();

  for (const sale of sales) {
    totalRevenue += sale.total;
    for (const item of sale.items) {
      totalItems += item.quantity;
      const cost = item.unitCost ?? 0;
      totalCost += cost * item.quantity;
      if (item.productId) {
        const existing = productMap.get(item.productId) ?? { name: item.name, revenue: 0, cost: 0, qty: 0 };
        existing.revenue += item.price * item.quantity;
        existing.cost += cost * item.quantity;
        existing.qty += item.quantity;
        productMap.set(item.productId, existing);
      }
    }
  }

  const margin = totalRevenue > 0 ? ((totalRevenue - totalCost) / totalRevenue) * 100 : 0;

  return {
    totalRevenue,
    totalCost,
    grossMargin: margin,
    itemCount: totalItems,
    saleCount: sales.length,
    byProduct: Array.from(productMap.entries()).map(([id, p]) => ({
      productId: id,
      productName: p.name,
      revenue: p.revenue,
      cost: p.cost,
      margin: p.revenue > 0 ? ((p.revenue - p.cost) / p.revenue) * 100 : 0,
      qty: p.qty,
    })),
  };
}

export async function getSalesByProduct(start: Date, end: Date) {
  const { tenantId } = await requireTenantAndSection("caja");
  const items = await prisma.saleItem.findMany({
    where: {
      sale: {
        session: { organizationId: tenantId },
        timestamp: { gte: start, lte: end },
        status: "active",
      },
    },
    include: { product: { select: { id: true, name: true, emoji: true, category: true } } },
  });

  const grouped = new Map<string, {
    productId: string;
    productName: string;
    emoji: string | null;
    category: string | null;
    qty: number;
    revenue: number;
    cost: number;
    count: number;
  }>();

  for (const i of items) {
    const key = i.productId ?? i.name;
    const g = grouped.get(key) ?? {
      productId: i.productId ?? "",
      productName: i.product?.name ?? i.name,
      emoji: i.product?.emoji ?? null,
      category: i.product?.category ?? null,
      qty: 0,
      revenue: 0,
      cost: 0,
      count: 0,
    };
    g.qty += i.quantity;
    g.revenue += i.price * i.quantity;
    g.cost += (i.unitCost ?? 0) * i.quantity;
    g.count += 1;
    grouped.set(key, g);
  }

  return Array.from(grouped.values()).sort((a, b) => b.revenue - a.revenue);
}

export async function cancelSale(saleId: string, reason: string) {
  const { tenantId, userId } = await requireTenantAndSection("caja");

  if (!reason?.trim()) throw new Error("El motivo de anulación es obligatorio");

  await prisma.$transaction(async (tx) => {
    // Load sale with all related data, verify tenant ownership via session
    const sale = await tx.sale.findFirst({
      where: {
        id: saleId,
        session: { organizationId: tenantId, closedAt: null },
      },
      include: {
        splits: true,
        items: true,
        session: { select: { id: true, organizationId: true } },
      },
    });

    if (!sale) throw new Error("Venta no encontrada, no pertenece a esta organización, o la sesión ya fue cerrada");
    if (sale.status === "cancelled") throw new Error("Esta venta ya fue anulada");

    // Mark sale as cancelled
    await tx.sale.update({
      where: { id: saleId },
      data: {
        status: "cancelled",
        cancelledAt: new Date(),
        cancelledById: userId,
        cancelReason: reason.trim(),
      },
    });

    // Restore stock for each item that has a productId
    for (const item of sale.items) {
      if (!item.productId) continue;

      await tx.inventoryItem.update({
        where: { productId: item.productId },
        data: { quantity: { increment: item.quantity } },
      });

      await tx.stockMovement.create({
        data: {
          organizationId: tenantId,
          type: "cancellation",
          productId: item.productId,
          productName: item.name,
          quantity: item.quantity,
          unit: item.unit,
          note: `Anulación venta #${saleId.slice(-6)} — ${reason.trim()}`,
        },
      });
    }

    // Revert fiado debt if applicable
    const fiadoSplit = sale.splits.find((s) => s.method === "fiado");
    if (fiadoSplit && sale.clientId) {
      const client = await tx.client.findUnique({ where: { id: sale.clientId } });
      if (client) {
        const newBalance = client.balance - fiadoSplit.amount;
        await tx.clientMovement.create({
          data: {
            clientId: sale.clientId,
            date: new Date(),
            type: "cancellation",
            amount: -fiadoSplit.amount,
            balanceAfter: newBalance,
            description: `Anulación venta #${saleId.slice(-6)} — ${reason.trim()}`,
            ticketId: saleId,
          },
        });
        await tx.client.update({
          where: { id: sale.clientId },
          data: {
            balance: newBalance,
            status: newBalance > client.creditLimit ? "overdue" : "active",
            lastActivity: new Date(),
          },
        });
      }
    }

  });

  revalidatePath("/caja");
  revalidatePath("/inventario");
  revalidatePath("/reportes");
  revalidatePath("/clientes");
}

export async function addCashTransaction(type: "in" | "out", amount: number, reason: string) {
  const { tenantId } = await requireTenantAndSection("caja");
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
