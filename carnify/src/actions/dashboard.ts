"use server";

import { prisma } from "@/lib/db";
import { requireTenantAndSection } from "./_helpers";
import { addDays, getARTDayOfWeek, getARTHour, startOfDay } from "@/lib/dateUtils";

export async function getDashboardStats() {
  const { tenantId } = await requireTenantAndSection("dashboard");
  const now = new Date();
  const todayStart = startOfDay(now);
  const todayEnd = addDays(todayStart, 1);
  const weekStart = addDays(todayStart, -6);
  const slowMoverStart = addDays(todayStart, -30);

  const [
    activeSession,
    todaySales,
    weekSales,
    products,
    inventoryRows,
    settings,
    recentMovements,
    soldSinceSlowStart,
  ] = await Promise.all([
    prisma.cajaSession.findFirst({
      where: { organizationId: tenantId, closedAt: null },
      include: {
        sales: { where: { status: "active" }, include: { splits: true } },
        transactions: true,
      },
      orderBy: { openedAt: "desc" },
    }),
    prisma.sale.findMany({
      where: {
        session: { organizationId: tenantId },
        timestamp: { gte: todayStart, lt: todayEnd },
        status: "active",
      },
      include: {
        splits: true,
        items: {
          include: {
            product: { select: { id: true, name: true, emoji: true, category: true, unit: true } },
          },
        },
      },
      orderBy: { timestamp: "desc" },
    }),
    prisma.sale.findMany({
      where: {
        session: { organizationId: tenantId },
        timestamp: { gte: weekStart, lt: todayEnd },
        status: "active",
      },
      select: { total: true, timestamp: true },
    }),
    prisma.product.findMany({
      where: { organizationId: tenantId },
      include: { cost: true },
      orderBy: { name: "asc" },
    }),
    prisma.inventoryItem.findMany({
      where: { organizationId: tenantId },
      select: { productId: true, quantity: true, unit: true, updatedAt: true },
    }),
    prisma.businessSettings.findUnique({
      where: { organizationId: tenantId },
      select: { stockAlertThreshold: true },
    }),
    prisma.stockMovement.findMany({
      where: { organizationId: tenantId },
      orderBy: { date: "desc" },
      take: 8,
      include: { product: { select: { emoji: true } } },
    }),
    prisma.saleItem.findMany({
      where: {
        productId: { not: null },
        sale: {
          session: { organizationId: tenantId },
          timestamp: { gte: slowMoverStart, lt: todayEnd },
          status: "active",
        },
      },
      select: { productId: true },
      distinct: ["productId"],
    }),
  ]);

  const inventoryByProduct = new Map(inventoryRows.map((item) => [item.productId, item]));
  const stockAlertThreshold = settings?.stockAlertThreshold ?? 10;
  const revenue = todaySales.reduce((acc, sale) => acc + sale.total, 0);
  const orders = todaySales.length;
  const clients = new Set(todaySales.flatMap((sale) => (sale.clientId ? [sale.clientId] : [])));
  const hourlyMap: Record<string, number> = {};
  const paymentMap: Record<string, number> = {};
  let revenueWithKnownCost = 0;
  let totalCost = 0;
  const productMap = new Map<string, {
    productId: string;
    name: string;
    emoji: string | null;
    category: string | null;
    unit: string;
    quantity: number;
    revenue: number;
    cost: number;
    tickets: number;
  }>();

  for (const sale of todaySales) {
    const hour = `${getARTHour(sale.timestamp).toString().padStart(2, "0")}:00`;
    hourlyMap[hour] = (hourlyMap[hour] ?? 0) + sale.total;

    if (sale.splits.length > 0) {
      sale.splits.forEach((split) => {
        paymentMap[split.method] = (paymentMap[split.method] ?? 0) + split.amount;
      });
    } else {
      paymentMap[sale.method] = (paymentMap[sale.method] ?? 0) + sale.total;
    }

    for (const item of sale.items) {
      const itemRevenue = item.price * item.quantity;
      if (item.unitCost != null) {
        revenueWithKnownCost += itemRevenue;
        totalCost += item.unitCost * item.quantity;
      }

      const key = item.productId ?? item.name;
      const current = productMap.get(key) ?? {
        productId: item.productId ?? "",
        name: item.product?.name ?? item.name,
        emoji: item.product?.emoji ?? item.emoji ?? null,
        category: item.product?.category ?? null,
        unit: item.product?.unit ?? item.unit,
        quantity: 0,
        revenue: 0,
        cost: 0,
        tickets: 0,
      };
      current.quantity += item.quantity;
      current.revenue += itemRevenue;
      current.cost += (item.unitCost ?? 0) * item.quantity;
      current.tickets += 1;
      productMap.set(key, current);
    }
  }

  const dayLabels = ["dom", "lun", "mar", "mie", "jue", "vie", "sab"];
  const weeklySales = Array.from({ length: 7 }, (_, index) => {
    const dayStart = addDays(weekStart, index);
    const dayEnd = addDays(dayStart, 1);
    const day = dayLabels[getARTDayOfWeek(dayStart)];
    const ventas = weekSales
      .filter((sale) => sale.timestamp >= dayStart && sale.timestamp < dayEnd)
      .reduce((acc, sale) => acc + sale.total, 0);
    return { day, ventas };
  });

  const stockAlerts = products
    .map((product) => {
      const stock = inventoryByProduct.get(product.id);
      const quantity = stock?.quantity ?? 0;
      return {
        productId: product.id,
        product: product.name,
        emoji: product.emoji,
        stock: quantity,
        unit: stock?.unit ?? product.unit,
        threshold: stockAlertThreshold,
        status: quantity <= 0 ? "out" : quantity <= stockAlertThreshold ? "low" : "ok",
      };
    })
    .filter((item) => item.stock <= stockAlertThreshold)
    .sort((a, b) => a.stock - b.stock)
    .slice(0, 8);

  const soldProductIds = new Set(soldSinceSlowStart.flatMap((item) => (item.productId ? [item.productId] : [])));
  const slowMovers = products
    .filter((product) => !soldProductIds.has(product.id))
    .slice(0, 6)
    .map((product) => {
      const stock = inventoryByProduct.get(product.id);
      return {
        productId: product.id,
        product: product.name,
        emoji: product.emoji,
        stock: stock?.quantity ?? 0,
        unit: stock?.unit ?? product.unit,
        daysWithoutSales: 30,
      };
    });

  const stockValue = products.reduce((acc, product) => {
    const quantity = inventoryByProduct.get(product.id)?.quantity ?? 0;
    return acc + Math.max(0, quantity) * product.price;
  }, 0);

  const cajaByMethod: Record<string, number> = {};
  if (activeSession) {
    cajaByMethod.cash = activeSession.startingCash;
    for (const sale of activeSession.sales) {
      if (sale.splits.length > 0) {
        sale.splits.forEach((split) => {
          if (split.method === "fiado") return;
          cajaByMethod[split.method] = (cajaByMethod[split.method] ?? 0) + split.amount;
        });
      } else if (sale.method !== "fiado") {
        cajaByMethod[sale.method] = (cajaByMethod[sale.method] ?? 0) + sale.total;
      }
    }
    for (const transaction of activeSession.transactions) {
      cajaByMethod.cash = (cajaByMethod.cash ?? 0) + (transaction.type === "in" ? transaction.amount : -transaction.amount);
    }
  }

  const paymentColors: Record<string, string> = {
    cash: "#22C55E",
    transfer: "#3B82F6",
    card: "#F59E0B",
    link: "#A855F7",
    fiado: "#EF4444",
    mixed: "#8B5CF6",
  };
  const profit = revenueWithKnownCost - totalCost;

  return {
    revenue,
    orders,
    ticket: orders > 0 ? Math.round(revenue / orders) : 0,
    clients: Math.max(clients.size, orders > 0 ? 1 : 0),
    hasOpenCaja: activeSession !== null,
    profit,
    margin: revenueWithKnownCost > 0 ? parseFloat(((profit / revenueWithKnownCost) * 100).toFixed(1)) : 0,
    costCoverage: revenue > 0 ? parseFloat(((revenueWithKnownCost / revenue) * 100).toFixed(1)) : 0,
    stockValue,
    cajaToday: {
      isOpen: activeSession !== null,
      openedAt: activeSession?.openedAt ?? null,
      totalExpected: Object.values(cajaByMethod).reduce((acc, amount) => acc + amount, 0),
      byMethod: Object.entries(cajaByMethod)
        .map(([method, amount]) => ({ method, amount }))
        .sort((a, b) => b.amount - a.amount),
    },
    hourlySales: Object.entries(hourlyMap)
      .map(([hour, ventas]) => ({ hour, ventas }))
      .sort((a, b) => a.hour.localeCompare(b.hour)),
    weeklySales,
    paymentBreakdown: Object.entries(paymentMap)
      .map(([method, amount]) => ({
        method,
        amount,
        percentage: revenue > 0 ? parseFloat(((amount / revenue) * 100).toFixed(1)) : 0,
        color: paymentColors[method] ?? "#888",
      }))
      .sort((a, b) => b.amount - a.amount),
    recentSales: todaySales.slice(0, 6).map((sale) => ({
      id: `TK-${sale.id.substring(0, 4).toUpperCase()}`,
      time: new Date(sale.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      items: sale.itemCount || sale.items.length || 1,
      total: sale.total,
      payment: sale.method,
      client: sale.clientName || null,
    })),
    stockAlerts,
    slowMovers,
    topProducts: Array.from(productMap.values())
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 8)
      .map((item) => ({
        productId: item.productId,
        name: item.name,
        emoji: item.emoji,
        category: item.category,
        quantity: parseFloat(item.quantity.toFixed(3)),
        unit: item.unit,
        revenue: item.revenue,
        margin: item.revenue > 0 && item.cost > 0
          ? parseFloat((((item.revenue - item.cost) / item.revenue) * 100).toFixed(1))
          : null,
        tickets: item.tickets,
      })),
    recentMovements: recentMovements.map((movement) => ({
      id: movement.id,
      type: movement.type,
      product: movement.productName,
      emoji: movement.product?.emoji ?? null,
      quantity: movement.quantity,
      unit: movement.unit,
      date: movement.date,
      reason: movement.note ?? movement.supplier ?? null,
    })),
  };
}
