"use server";

import { prisma } from "@/lib/db";
import { requireTenantAndSection } from "./_helpers";
import { revalidatePath } from "next/cache";
import { z } from "zod";

const SplitSchema = z.object({ method: z.string(), amount: z.number().finite().nonnegative() });
const CartItemSchema = z.object({
  productId: z.string().optional(),
  name: z.string().min(1),
  price: z.number().finite().nonnegative(),
  quantity: z.number().finite().positive(),
  unit: z.string(),
  emoji: z.string().optional(),
});
const RecordSaleSchema = z.object({
  total: z.number().finite().nonnegative(),
  splits: z.array(SplitSchema).min(1),
  items: z.array(CartItemSchema).min(1),
  clientId: z.string().optional(),
  clientName: z.string().optional(),
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

  const session = await prisma.$transaction(async (tx) => {
    const existing = await tx.cajaSession.findFirst({
      where: { organizationId: tenantId, closedAt: null },
    });
    if (existing) throw new Error("Ya hay una caja abierta");

    return tx.cajaSession.create({
      data: { organizationId: tenantId, startingCash, openedById: userId },
      include: { sales: true, transactions: true },
    });
  }, { isolationLevel: "Serializable" });

  revalidatePath("/caja");
  revalidatePath("/");
  return session;
}

export async function closeCaja(realAmounts: Record<string, number>) {
  const { tenantId, userId } = await requireTenantAndSection("caja");

  await prisma.$transaction(async (tx) => {
    // M3: leer la sesión + ventas + movimientos DENTRO de la transacción de cierre,
    // para que el teórico refleje exactamente el estado al momento de cerrar. Antes
    // se calculaba sobre una lectura previa a la $transaction y una venta concurrente
    // que entrara entre el cálculo y el cierre quedaba fuera del teórico persistido.
    // Esta misma lectura (closedAt: null) cubre el doble-cierre: si otra caja ya cerró,
    // devuelve null → "No hay caja abierta".
    const session = await tx.cajaSession.findFirst({
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
  revalidatePath("/");
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
  const parsedSale = RecordSaleSchema.parse({ total, splits, items, clientId, clientName });
  const parsedSplits = parsedSale.splits;
  const parsedItems = parsedSale.items;
  if (parsedItems.some((item) => !item.productId)) {
    throw new Error("Todos los items de la venta deben estar asociados a un producto vigente");
  }

  const totalInCents = Math.round(parsedSale.total * 100);
  const splitTotalInCents = Math.round(
    parsedSplits.reduce((acc, split) => acc + split.amount, 0) * 100
  );
  if (Math.abs(totalInCents - splitTotalInCents) > 1) {
    throw new Error("La suma de los medios de pago no coincide con el total");
  }
  const itemsTotalInCents = Math.round(
    parsedItems.reduce((acc, item) => acc + item.price * item.quantity, 0) * 100
  );
  if (Math.abs(totalInCents - itemsTotalInCents) > 1) {
    throw new Error("El total no coincide con los productos del carrito");
  }

  // No confiar en precios del cliente: validar contra el precio vigente del producto
  const productIds = [...new Set(parsedItems.flatMap((i) => (i.productId ? [i.productId] : [])))];
  if (productIds.length > 0) {
    const dbProducts = await prisma.product.findMany({
      where: { id: { in: productIds }, organizationId: tenantId },
      select: { id: true, price: true, discountPercent: true, discountEndDate: true },
    });
    const productById = new Map(dbProducts.map((p) => [p.id, p]));
    const now = new Date();
    for (const item of parsedItems) {
      if (!item.productId) continue;
      const product = productById.get(item.productId);
      if (!product) {
        throw new Error(`El producto ${item.name} ya no existe. Quitalo del carrito y volvé a intentar.`);
      }
      const discountActive =
        product.discountPercent > 0 && (!product.discountEndDate || product.discountEndDate >= now);
      const serverPrice = discountActive
        ? product.price * (1 - product.discountPercent / 100)
        : product.price;
      if (Math.abs(item.price - serverPrice) > 0.01) {
        throw new Error(
          `El precio de ${item.name} cambió. Quitalo del carrito y volvé a agregarlo para tomar el precio vigente.`
        );
      }
    }
  }

  const method = parsedSplits.length > 1 ? "mixed" : parsedSplits[0]?.method ?? "cash";
  const fiadoAmount = parsedSplits
    .filter((s) => s.method === "fiado")
    .reduce((acc, s) => acc + s.amount, 0);
  if (fiadoAmount > 0 && !clientId) {
    throw new Error("Selecciona un cliente para registrar una venta fiada");
  }

  const sale = await prisma.$transaction(async (tx) => {
    const [txSession, txSettings] = await Promise.all([
      tx.cajaSession.findFirst({ where: { organizationId: tenantId, closedAt: null } }),
      tx.businessSettings.findUnique({ where: { organizationId: tenantId }, select: { enforceStock: true } }),
    ]);
    if (!txSession) throw new Error("No hay caja abierta");
    const txEnforceStock = txSettings?.enforceStock ?? true;

    const txProducts = await tx.product.findMany({
      where: { id: { in: productIds }, organizationId: tenantId },
      select: { id: true, price: true, discountPercent: true, discountEndDate: true },
    });
    const txProductById = new Map(txProducts.map((product) => [product.id, product]));
    const txNow = new Date();
    const stockItems = Array.from(parsedItems.reduce((acc, item) => {
      if (!item.productId) return acc;
      const key = `${item.productId}:${item.unit}`;
      const current = acc.get(key);
      if (current) {
        current.quantity += item.quantity;
      } else {
        acc.set(key, { ...item });
      }
      return acc;
    }, new Map<string, z.infer<typeof CartItemSchema>>()).values());

    for (const item of stockItems) {
      if (!item.productId) continue;
      const product = txProductById.get(item.productId);
      if (!product) {
        throw new Error(`El producto ${item.name} ya no existe. Quitalo del carrito y volve a intentar.`);
      }
      const discountActive =
        product.discountPercent > 0 && (!product.discountEndDate || product.discountEndDate >= txNow);
      const serverPrice = discountActive
        ? product.price * (1 - product.discountPercent / 100)
        : product.price;
      if (Math.abs(item.price - serverPrice) > 0.01) {
        throw new Error(
          `El precio de ${item.name} cambio. Quitalo del carrito y volve a agregarlo para tomar el precio vigente.`
        );
      }
    }

    const costMap = new Map<string, number>();
    const costs = await tx.productCost.findMany({
      where: { organizationId: tenantId },
      select: { productId: true, cost: true },
    });
    for (const c of costs) costMap.set(c.productId, c.cost);

    const newSale = await tx.sale.create({
      data: {
        sessionId: txSession.id,
        total: parsedSale.total,
        method,
        itemCount: parsedItems.length,
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
        select: { id: true },
      });
      if (!client) {
        throw new Error("El cliente seleccionado no existe o fue eliminado. Cancelá la venta y seleccioná un cliente válido.");
      }
      // Incremento atómico para evitar lost update bajo concurrencia (2 cajas / retry).
      const updatedClient = await tx.client.update({
        where: { id: clientId },
        data: { balance: { increment: fiadoAmount }, lastActivity: new Date() },
      });
      const newStatus =
        updatedClient.creditLimit > 0 && updatedClient.balance > updatedClient.creditLimit
          ? "overdue"
          : "active";
      await tx.clientMovement.create({
        data: {
          clientId,
          date: new Date(),
          type: "sale",
          amount: fiadoAmount,
          balanceAfter: updatedClient.balance,
          description: `Venta #${newSale.id.slice(-6)}`,
          ticketId: newSale.id,
        },
      });
      if (updatedClient.status !== newStatus) {
        await tx.client.update({ where: { id: clientId }, data: { status: newStatus } });
      }
    }

    for (const item of parsedItems) {
      if (!item.productId) continue;

      const existingInventory = await tx.inventoryItem.findUnique({
        where: { productId: item.productId },
      });

      if (txEnforceStock) {
        if (!existingInventory || existingInventory.quantity < item.quantity) {
          const available = existingInventory?.quantity ?? 0;
          throw new Error(
            `Stock insuficiente para ${item.name}. Disponible: ${available.toFixed(item.unit === "kg" ? 3 : 0)} ${existingInventory?.unit ?? item.unit}.`
          );
        }

        const updated = await tx.inventoryItem.updateMany({
          where: { productId: item.productId, quantity: { gte: item.quantity } },
          data: { quantity: { decrement: item.quantity }, unit: item.unit },
        });
        if (updated.count === 0) {
          throw new Error(`Stock insuficiente para ${item.name}. Volve a intentar con el stock actualizado.`);
        }
      } else {
        await tx.inventoryItem.upsert({
          where: { productId: item.productId },
          create: {
            organizationId: tenantId,
            productId: item.productId,
            quantity: -item.quantity,
            unit: item.unit,
          },
          update: {
            quantity: { decrement: item.quantity },
            unit: item.unit,
          },
        });
      }

      await tx.stockMovement.create({
        data: {
          organizationId: tenantId,
          type: "sale",
          productId: item.productId,
          productName: item.name,
          quantity: item.quantity,
          unit: item.unit,
          note: `Venta #${newSale.id.slice(-6)} - descuento automatico por POS`,
        },
      });
    }

    return newSale;
  });

  revalidatePath("/caja");
  revalidatePath("/");
  revalidatePath("/inventario");
  revalidatePath("/reportes");
  revalidatePath("/clientes");
  return sale;
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

      // updateMany: no falla si el producto no tiene item de inventario (venta registrada sin stock)
      await tx.inventoryItem.updateMany({
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
      const client = await tx.client.findUnique({ where: { id: sale.clientId }, select: { id: true } });
      if (client) {
        // Decremento atómico para evitar lost update bajo concurrencia.
        const updatedClient = await tx.client.update({
          where: { id: sale.clientId },
          data: { balance: { decrement: fiadoSplit.amount }, lastActivity: new Date() },
        });
        const newStatus =
          updatedClient.creditLimit > 0 && updatedClient.balance > updatedClient.creditLimit
            ? "overdue"
            : "active";
        await tx.clientMovement.create({
          data: {
            clientId: sale.clientId,
            date: new Date(),
            type: "cancellation",
            amount: -fiadoSplit.amount,
            balanceAfter: updatedClient.balance,
            description: `Anulación venta #${saleId.slice(-6)} — ${reason.trim()}`,
            ticketId: saleId,
          },
        });
        if (updatedClient.status !== newStatus) {
          await tx.client.update({ where: { id: sale.clientId }, data: { status: newStatus } });
        }
      }
    }

  });

  revalidatePath("/caja");
  revalidatePath("/");
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
