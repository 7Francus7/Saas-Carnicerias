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

export async function getClients() {
  const { tenantId } = await requireTenantAndSection("clientes");
  return prisma.client.findMany({
    where: { organizationId: tenantId },
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
    where: { organizationId: tenantId },
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
  await prisma.client.updateMany({ where: { id, organizationId: tenantId }, data });
  revalidatePath("/clientes");
}

export async function deleteClient(id: string) {
  const { tenantId } = await requireTenantAndSection("clientes");
  const client = await prisma.client.findFirst({ where: { id, organizationId: tenantId } });
  if (!client) return;
  if (client.balance > 0) {
    throw new Error(
      `Este cliente tiene deuda pendiente de $${client.balance.toFixed(2)}. Saldá la cuenta antes de eliminar.`
    );
  }
  await prisma.client.deleteMany({ where: { id, organizationId: tenantId } });
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
    // Read balance inside transaction to prevent race condition
    const client = await tx.client.findFirst({
      where: { id: clientId, organizationId: tenantId },
    });
    if (!client) throw new Error("Cliente no encontrado");

    // Allow saldo a favor (negative balance = credit)
    const newBalance = client.balance - amount;
    const newStatus = newBalance <= 0 ? "active"
      : newBalance <= client.creditLimit ? "active"
      : "overdue";

    const mov = await tx.clientMovement.create({
      data: {
        clientId,
        date: new Date(),
        type: "payment",
        amount,
        balanceAfter: newBalance,
        description: note || "Pago",
        paymentMethod: method,
      },
    });

    await tx.client.update({
      where: { id: clientId },
      data: {
        balance: newBalance,
        status: newStatus,
        lastActivity: new Date(),
      },
    });

    return mov;
  });

  revalidatePath("/clientes");
  return movement;
}

export async function addSaleToAccount(clientId: string, amount: number, description: string) {
  const { tenantId } = await requireTenantAndSection("clientes");

  await prisma.$transaction(async (tx) => {
    const client = await tx.client.findFirst({
      where: { id: clientId, organizationId: tenantId },
    });
    if (!client) throw new Error("Cliente no encontrado");

    const newBalance = client.balance + amount;

    await tx.clientMovement.create({
      data: {
        clientId,
        date: new Date(),
        type: "sale",
        amount,
        balanceAfter: newBalance,
        description,
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

    if (reason === "settled") {
      await tx.client.update({
        where: { id: clientId },
        data: { balance: 0, status: "active" },
      });
    }
  });

  revalidatePath("/clientes");
}
