"use server";

import { prisma } from "@/lib/db";
import { requireTenantAndSection } from "./_helpers";
import { revalidatePath } from "next/cache";
import { z } from "zod";

const ClientSchema = z.object({
  name: z.string().min(1),
  dni: z.string().default(""),
  phone: z.string().default(""),
  address: z.string().default(""),
  email: z.string().default(""),
  notes: z.string().default(""),
  creditLimit: z.number().default(0),
  status: z.enum(["active", "overdue", "blocked"]).default("active"),
});

// Update parcial: campos opcionales SIN default, para no blanquear los que no se
// envían. Excluye balance/active/organizationId/createdAt (no editables por este path).
const ClientUpdateSchema = z.object({
  name: z.string().min(1).optional(),
  dni: z.string().optional(),
  phone: z.string().optional(),
  address: z.string().optional(),
  email: z.string().optional(),
  notes: z.string().optional(),
  creditLimit: z.number().optional(),
  status: z.enum(["active", "overdue", "blocked"]).optional(),
});

export async function getClients() {
  const { tenantId } = await requireTenantAndSection("clientes");
  return prisma.client.findMany({
    where: { organizationId: tenantId, active: true },
    include: {
      movements: { orderBy: { date: "desc" }, take: 100 },
      periods: { orderBy: { closedAt: "desc" } },
    },
    orderBy: { name: "asc" },
  });
}

export async function getClientMovements(clientId: string, offset = 0, limit = 50) {
  const { tenantId } = await requireTenantAndSection("clientes");
  return prisma.clientMovement.findMany({
    where: { clientId, client: { organizationId: tenantId } },
    orderBy: { date: "desc" },
    skip: offset,
    take: limit,
  });
}

export async function getClientsForPos() {
  const { tenantId } = await requireTenantAndSection("pos");
  return prisma.client.findMany({
    where: { organizationId: tenantId, active: true },
    select: {
      id: true,
      name: true,
      dni: true,
      phone: true,
      address: true,
      email: true,
      notes: true,
      creditLimit: true,
      balance: true,
      status: true,
      createdAt: true,
    },
    orderBy: { name: "asc" },
  });
}

export async function createClient(data: z.infer<typeof ClientSchema>) {
  const { tenantId } = await requireTenantAndSection("clientes");
  const parsed = ClientSchema.parse(data);
  const client = await prisma.client.create({
    data: { ...parsed, organizationId: tenantId },
    include: { movements: true, periods: true },
  });
  revalidatePath("/clientes");
  return client;
}

export async function updateClient(id: string, data: Partial<z.infer<typeof ClientSchema>>) {
  const { tenantId } = await requireTenantAndSection("clientes");
  // Validar contra el schema: solo campos editables. Evita mass-assignment de
  // balance/active/organizationId/createdAt vía DevTools o llamada cruda — el
  // balance solo se mueve por addPayment/recordSale, nunca por edición directa.
  const parsed = ClientUpdateSchema.parse(data);
  await prisma.client.updateMany({ where: { id, organizationId: tenantId }, data: parsed });
  revalidatePath("/clientes");
}

export async function deleteClient(id: string) {
  const { tenantId } = await requireTenantAndSection("clientes");
  const client = await prisma.client.findFirst({ where: { id, organizationId: tenantId } });
  if (!client) return;
  // Bloquear si hay plata en juego (deuda o saldo a favor): regularizar antes de archivar.
  if (client.balance !== 0) {
    throw new Error(
      client.balance > 0
        ? `Este cliente tiene deuda pendiente de $${client.balance.toFixed(2)}. Saldá la cuenta antes de desactivar.`
        : `Este cliente tiene saldo a favor de $${Math.abs(client.balance).toFixed(2)}. Regularizá la cuenta antes de desactivar.`
    );
  }
  // Soft-delete: marcar inactivo. NO se borra historial de ventas, pagos,
  // movimientos ni períodos; el cliente sigue resolviendo en vistas históricas.
  await prisma.client.updateMany({
    where: { id, organizationId: tenantId },
    data: { active: false },
  });
  revalidatePath("/clientes");
}

export async function addPayment(
  clientId: string,
  amount: number,
  note: string,
  method: string,
) {
  const { tenantId } = await requireTenantAndSection("clientes");

  const movement = await prisma.$transaction(async (tx) => {
    // Validar existencia/tenant antes de tocar el balance
    const client = await tx.client.findFirst({
      where: { id: clientId, organizationId: tenantId },
      select: { id: true, name: true },
    });
    if (!client) throw new Error("Cliente no encontrado");

    // Decremento atómico para evitar lost update bajo concurrencia (cobro + venta simultáneos).
    // Allow saldo a favor (negative balance = credit)
    const updatedClient = await tx.client.update({
      where: { id: clientId },
      data: { balance: { decrement: amount }, lastActivity: new Date() },
    });
    // creditLimit 0 = sin límite
    const newStatus = updatedClient.balance <= 0 ? "active"
      : updatedClient.creditLimit <= 0 || updatedClient.balance <= updatedClient.creditLimit ? "active"
      : "overdue";

    const mov = await tx.clientMovement.create({
      data: {
        clientId,
        date: new Date(),
        type: "payment",
        amount,
        balanceAfter: updatedClient.balance,
        description: note || "Pago",
        paymentMethod: method,
      },
    });

    if (updatedClient.status !== newStatus) {
      await tx.client.update({ where: { id: clientId }, data: { status: newStatus } });
    }

    // C1: un cobro en efectivo entra al cajón físico. Registrar ingreso de caja
    // en la sesión abierta para que el teórico de cierre lo contemple.
    if (method === "cash") {
      const openSession = await tx.cajaSession.findFirst({
        where: { organizationId: tenantId, closedAt: null },
      });
      if (openSession) {
        await tx.cashTransaction.create({
          data: {
            organizationId: tenantId,
            sessionId: openSession.id,
            type: "in",
            amount,
            reason: `Cobro cta. cte. ${client.name}`,
          },
        });
      }
    }

    return mov;
  });

  revalidatePath("/clientes");
  return movement;
}

export async function addSaleToAccount(clientId: string, amount: number, description: string) {
  const { tenantId } = await requireTenantAndSection("clientes");

  await prisma.$transaction(async (tx) => {
    const client = await tx.client.findFirst({
      where: { id: clientId, organizationId: tenantId, active: true },
      select: { id: true },
    });
    if (!client) throw new Error("Cliente no encontrado");

    // Incremento atómico para evitar lost update bajo concurrencia.
    const updatedClient = await tx.client.update({
      where: { id: clientId },
      data: { balance: { increment: amount }, lastActivity: new Date() },
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
        amount,
        balanceAfter: updatedClient.balance,
        description,
      },
    });

    if (updatedClient.status !== newStatus) {
      await tx.client.update({ where: { id: clientId }, data: { status: newStatus } });
    }
  });

  revalidatePath("/clientes");
}

export async function closePeriod(clientId: string, reason: "settled" | "month_end" | "manual") {
  const { tenantId } = await requireTenantAndSection("clientes");

  await prisma.$transaction(async (tx) => {
    const client = await tx.client.findFirst({
      where: { id: clientId, organizationId: tenantId },
      include: {
        movements: {
          where: { periodId: null },
          orderBy: { date: "asc" },
        },
      },
    });
    if (!client) throw new Error("Cliente no encontrado");
    if (client.movements.length === 0) throw new Error("No hay movimientos pendientes para cerrar");

    const now = new Date();
    const label = now.toLocaleDateString("es-AR", { month: "long", year: "numeric" });

    const totalSales = client.movements
      .filter((m) => m.type === "sale" || m.type === "cancellation")
      .reduce((a, m) => a + m.amount, 0);
    const totalPaid = client.movements
      .filter((m) => m.type === "payment")
      .reduce((a, m) => a + m.amount, 0);

    // Use date of first unassigned movement, not client creation date
    const periodOpenedAt = new Date(client.movements[0].date);

    const period = await tx.clientPeriod.create({
      data: {
        clientId,
        label,
        openedAt: periodOpenedAt,
        closedAt: now,
        closedReason: reason,
        totalSales,
        totalPaid,
        finalBalance: client.balance,
      },
    });

    await tx.clientMovement.updateMany({
      where: { clientId, periodId: null },
      data: { periodId: period.id },
    });
    // C3: cerrar período archiva movimientos pero NUNCA pone balance en 0 sin un
    // cobro real. La única forma de saldar es registrar pagos vía addPayment.
  });

  revalidatePath("/clientes");
}
