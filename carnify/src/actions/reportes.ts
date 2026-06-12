"use server";

import { prisma } from "@/lib/db";
import { requireTenantAndSection } from "./_helpers";
import { startOfDay, addDays, startOfMonth, startOfNextMonth, getARTHour } from "@/lib/dateUtils";

type Period = "hoy" | "semana" | "mes" | "custom";

export type TimelinePoint = { t: string; v: number };

export type AggregatedReportData = {
  current: { ventas: number; tx: number; avgTicket: number; margen: number };
  previous: { ventas: number; tx: number; avgTicket: number; margen: number };
  timeline: TimelinePoint[];
  paymentMap: Record<string, number>;
  categories: { name: string; emoji: string; v: number; color: string }[];
  topProducts: { name: string; emoji: string; cat: string; sold: number; unit: string; rev: number; margin: number }[];
  weeklyByDay: { day: string; v: number; tx: number; today: boolean }[];
};

const CATEGORY_COLORS = [
  "#DC2626", "#F97316", "#16A34A", "#2563EB",
  "#A855F7", "#0F766E", "#D97706",
];

function getDateRange(period: Period, customDate?: string) {
  const now = new Date();
  let currentStart: Date;
  let currentEnd: Date;
  let previousStart: Date;
  let previousEnd: Date;

  switch (period) {
    case "hoy": {
      currentStart = startOfDay(now);
      currentEnd = startOfDay(addDays(now, 1));
      previousStart = startOfDay(addDays(now, -1));
      previousEnd = currentStart;
      break;
    }
    case "semana": {
      // Last 7 days (today + 6 previous)
      currentStart = startOfDay(addDays(now, -6));
      currentEnd = startOfDay(addDays(now, 1));
      previousStart = startOfDay(addDays(now, -13));
      previousEnd = currentStart;
      break;
    }
    case "mes": {
      currentStart = startOfMonth(now);
      currentEnd = startOfNextMonth(now);
      previousStart = startOfMonth(addDays(startOfMonth(now), -1));
      previousEnd = currentStart;
      break;
    }
    case "custom": {
      if (!customDate) {
        currentStart = startOfDay(now);
        currentEnd = addDays(currentStart, 1);
      } else {
        // Parse YYYY-MM-DD as ART day: 00:00 ART = 03:00 UTC
        const [y, m, d] = customDate.split("-").map(Number);
        currentStart = new Date(Date.UTC(y, m - 1, d, 3, 0, 0, 0));
        currentEnd = addDays(currentStart, 1);
      }
      previousStart = addDays(currentStart, -1);
      previousEnd = currentStart;
      break;
    }
  }

  return { currentStart, currentEnd, previousStart, previousEnd };
}

async function queryPeriod(
  tenantId: string,
  start: Date,
  end: Date,
): Promise<{
  sales: { id: string; total: number; method: string; timestamp: Date; splits: { method: string; amount: number }[] }[];
  items: { saleId: string; name: string; category: string; emoji: string; unit: string; quantity: number; revenue: number; unitCost: number | null }[];
}> {
  const sessions = await prisma.cajaSession.findMany({
    where: {
      organizationId: tenantId,
      openedAt: { lt: end },
      OR: [
        { closedAt: null },
        { closedAt: { gte: start } },
      ],
    },
    include: {
      sales: {
        where: { timestamp: { gte: start, lt: end }, status: "active" },
        include: {
          splits: true,
          items: {
            include: {
              product: {
                select: { name: true, category: true, emoji: true, unit: true },
              },
            },
          },
        },
      },
    },
    orderBy: { openedAt: "asc" },
  });

  const sales: {
    id: string; total: number; method: string;
    timestamp: Date; splits: { method: string; amount: number }[];
  }[] = [];

  const items: {
    saleId: string; name: string; category: string;
    emoji: string; unit: string; quantity: number;
    revenue: number; unitCost: number | null;
  }[] = [];

  for (const session of sessions) {
    for (const sale of session.sales) {
      sales.push({
        id: sale.id,
        total: sale.total,
        method: sale.method,
        timestamp: sale.timestamp,
        splits: sale.splits.map((s) => ({ method: s.method, amount: s.amount })),
      });
      for (const item of sale.items) {
        items.push({
          saleId: sale.id,
          name: item.product?.name ?? item.name,
          category: item.product?.category ?? "Sin categoria",
          emoji: item.product?.emoji ?? item.emoji ?? "📦",
          unit: item.product?.unit ?? item.unit,
          quantity: item.quantity,
          revenue: item.price * item.quantity,
          unitCost: item.unitCost,
        });
      }
    }
  }

  return { sales, items };
}

export async function getAggregatedReportData(
  period: Period,
  customDate?: string,
): Promise<AggregatedReportData> {
  const { tenantId } = await requireTenantAndSection("reportes");
  const { currentStart, currentEnd, previousStart, previousEnd } = getDateRange(period, customDate);

  const now = new Date();
  const weeklyStart = startOfDay(addDays(now, -6));
  const weeklyEnd = startOfDay(addDays(now, 1));

  const [currentData, previousData, weeklyData] = await Promise.all([
    queryPeriod(tenantId, currentStart, currentEnd),
    queryPeriod(tenantId, previousStart, previousEnd),
    period === "semana" ? Promise.resolve(null) : queryPeriod(tenantId, weeklyStart, weeklyEnd),
  ]);

  // Compute aggregates
  const ventas = currentData.sales.reduce((s, sale) => s + sale.total, 0);
  const tx = currentData.sales.length;
  const avgTicket = tx > 0 ? Math.round(ventas / tx) : 0;

  const previousVentas = previousData.sales.reduce((s, sale) => s + sale.total, 0);
  const previousTx = previousData.sales.length;
  const previousAvgTicket = previousTx > 0 ? previousVentas / previousTx : 0;

  let revenueWithCost = 0;
  let totalCost = 0;
  for (const item of currentData.items) {
    if (item.unitCost != null) {
      revenueWithCost += item.revenue;
      totalCost += item.unitCost * item.quantity;
    }
  }
  const margen = revenueWithCost > 0
    ? parseFloat((((revenueWithCost - totalCost) / revenueWithCost) * 100).toFixed(1))
    : 0;

  let prevRevenueWithCost = 0;
  let prevTotalCost = 0;
  for (const item of previousData.items) {
    if (item.unitCost != null) {
      prevRevenueWithCost += item.revenue;
      prevTotalCost += item.unitCost * item.quantity;
    }
  }
  const previousMargen = prevRevenueWithCost > 0
    ? ((prevRevenueWithCost - prevTotalCost) / prevRevenueWithCost) * 100
    : 0;

  // Timeline (hourly for hoy, daily for semana, weekly for mes)
  const timeline = buildTimeline(currentData.sales, period);

  // Payment map
  const paymentMap: Record<string, number> = {};
  currentData.sales.forEach((sale) => {
    if (sale.splits.length > 0) {
      sale.splits.forEach((split) => {
        paymentMap[split.method] = (paymentMap[split.method] ?? 0) + split.amount;
      });
    } else {
      paymentMap[sale.method] = (paymentMap[sale.method] ?? 0) + sale.total;
    }
  });

  // Categories
  const catMap = new Map<string, { name: string; emoji: string; v: number }>();
  let catIdx = 0;
  for (const item of currentData.items) {
    const existing = catMap.get(item.category);
    if (existing) {
      existing.v += item.revenue;
    } else {
      catMap.set(item.category, {
        name: item.category,
        emoji: item.emoji,
        v: item.revenue,
      });
    }
  }
  const categories = [...catMap.values()]
    .sort((a, b) => b.v - a.v)
    .map((c) => ({ ...c, color: CATEGORY_COLORS[catIdx++ % CATEGORY_COLORS.length] }));

  // Top products
  const productMap = new Map<string, {
    name: string; emoji: string; cat: string;
    sold: number; unit: string; rev: number;
    cost: number; knownCostRev: number;
  }>();
  for (const item of currentData.items) {
    const key = `${item.category}:${item.name}`;
    const current = productMap.get(key) ?? {
      name: item.name, emoji: item.emoji, cat: item.category,
      sold: 0, unit: item.unit, rev: 0, cost: 0, knownCostRev: 0,
    };
    current.sold += item.quantity;
    current.rev += item.revenue;
    if (item.unitCost != null) {
      current.cost += item.unitCost * item.quantity;
      current.knownCostRev += item.revenue;
    }
    productMap.set(key, current);
  }
  const topProducts = [...productMap.values()]
    .sort((a, b) => b.rev - a.rev)
    .slice(0, 20)
    .map((p) => ({
      name: p.name, emoji: p.emoji, cat: p.cat,
      sold: parseFloat(p.sold.toFixed(3)), unit: p.unit, rev: p.rev,
      margin: p.knownCostRev > 0
        ? parseFloat((((p.knownCostRev - p.cost) / p.knownCostRev) * 100).toFixed(1))
        : 0,
    }));

  const weeklyByDay = buildWeeklyByDay(
    period === "semana" ? currentData.sales : weeklyData!.sales,
  );

  return {
    current: { ventas, tx, avgTicket, margen },
    previous: { ventas: previousVentas, tx: previousTx, avgTicket: Math.round(previousAvgTicket), margen: parseFloat(previousMargen.toFixed(1)) },
    timeline,
    paymentMap,
    categories,
    topProducts,
    weeklyByDay,
  };
}

function buildWeeklyByDay(sales: { total: number; timestamp: Date }[]): { day: string; v: number; tx: number; today: boolean }[] {
  const now = new Date();
  return Array.from({ length: 7 }, (_, i) => {
    const day = addDays(startOfDay(now), i - 6);
    const nextDay = addDays(day, 1);
    const daySales = sales.filter((s) => s.timestamp >= day && s.timestamp < nextDay);
    const v = daySales.reduce((a, s) => a + s.total, 0);
    const isToday = day.toDateString() === startOfDay(now).toDateString();
    const label = isToday
      ? "Hoy"
      : day.toLocaleDateString("es-AR", { weekday: "short" }).replace(".", "");
    return { day: label.charAt(0).toUpperCase() + label.slice(1), v, tx: daySales.length, today: isToday };
  });
}

function buildTimeline(sales: { total: number; timestamp: Date }[], period: Period): TimelinePoint[] {
  if (sales.length === 0) return period === "hoy" ? [{ t: "08:00", v: 0 }, { t: "12:00", v: 0 }, { t: "16:00", v: 0 }, { t: "20:00", v: 0 }] : [];

  if (period === "hoy") {
    const hourMap = new Map<string, number>();
    sales.forEach((sale) => {
      const h = `${getARTHour(sale.timestamp).toString().padStart(2, "0")}:00`;
      hourMap.set(h, (hourMap.get(h) ?? 0) + sale.total);
    });
    return [...hourMap.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([t, v]) => ({ t, v }));
  }

  if (period === "semana") {
    const EMPTY_WEEKLY = [
      { t: "Lun", v: 0 }, { t: "Mar", v: 0 }, { t: "Mie", v: 0 },
      { t: "Jue", v: 0 }, { t: "Vie", v: 0 }, { t: "Sab", v: 0 }, { t: "Hoy", v: 0 },
    ];
    const now = new Date();
    const rows = Array.from({ length: 7 }, (_, i) => {
      const day = addDays(startOfDay(now), i - 6);
      const nextDay = addDays(day, 1);
      const total = sales.filter(
        (s) => s.timestamp >= day && s.timestamp < nextDay,
      ).reduce((a, s) => a + s.total, 0);
      const isToday = day.toDateString() === startOfDay(now).toDateString();
      const label = isToday ? "Hoy" : day.toLocaleDateString("es-AR", { weekday: "short" }).replace(".", "");
      return { t: label.charAt(0).toUpperCase() + label.slice(1), v: total };
    });
    return rows.some((r) => r.v > 0) ? rows : EMPTY_WEEKLY;
  }

  // Monthly — group by week
  const now = new Date();
  const monthStart = startOfMonth(now);
  const nextMonth = startOfNextMonth(now);
  const weekCount = Math.max(4, Math.ceil((nextMonth.getTime() - monthStart.getTime()) / (7 * 86400000)));
  const rows = Array.from({ length: weekCount }, (_, i) => {
    const s = addDays(monthStart, i * 7);
    const e = i === weekCount - 1 ? nextMonth : addDays(s, 7);
    const total = sales.filter((sale) => sale.timestamp >= s && sale.timestamp < e)
      .reduce((a, sale) => a + sale.total, 0);
    return { t: `Sem ${i + 1}`, v: total };
  });
  return rows.some((r) => r.v > 0) ? rows : [];
}
