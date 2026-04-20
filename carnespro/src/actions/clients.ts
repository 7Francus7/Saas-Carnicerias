"use server";

import { prisma } from "@/lib/db";
import { requireTenant } from "./_helpers";
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
  const { tenantId } = await requireTenant();
  return prisma.client.findMany({
    where: { organizationId: tenantId },
    include: { movements: { orderBy: { date: "desc" } }, periods: { orderBy: { closedAt: "desc" } } },
    orderBy: { name: "asc" },
  });
}

export async function createClient(data: z.infer<typeof ClientSchema>) {
  const { tenantId } = await requireTenant();
  const parsed = ClientSchema.parse(data);
  const client = await prisma.client.create({
    data: { ...parsed, organizationId: tenantId },
    include: { movements: true, periods: true },
  });
  revalidatePath("/clientes");
  return client;
}

export async function updateClient(id: string, data: Partial<z.infer<typeof ClientSchema>>) {
  const { tenantId } = await requireTenant();
  await prisma.client.updateMany({ where: { id, organizationId: tenantId }, data });
  revalidatePath("/clientes");
}

export async function deleteClient(id: string) {
  const { tenantId } = await requireTenant();
  await prisma.client.deleteMany({ where: { id, organizationId: tenantId } });
  revalidatePath("/clientes");
}

export async function addPayment(
  clientId: string,
  amount: number,
  note: string,
  method: string,
) {
  const { tenantId } = await requireTenant();
  const client = await prisma.client.findFirst({
    where: { id: clientId, organizationId: tenantId },
  });
  if (!client) throw new Error("Cliente no encontrado");

  const newBalance = Math.max(0, client.balance - amount);

  const movement = await prisma.clientMovement.create({
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

  await prisma.client.update({
    where: { id: clientId },
    data: {
      balance: newBalance,
      status: newBalance === 0 ? "active" : client.status,
      lastActivity: new Date(),
    },
  });

  revalidatePath("/clientes");
  return movement;
}

export async function addSaleToAccount(clientId: string, amount: number, description: string) {
  const { tenantId } = await requireTenant();
  const client = await prisma.client.findFirst({
    where: { id: clientId, organizationId: tenantId },
  });
  if (!client) throw new Error("Cliente no encontrado");

  const newBalance = client.balance + amount;

  await prisma.clientMovement.create({
    data: {
      clientId,
      date: new Date(),
      type: "sale",
      amount,
      balanceAfter: newBalance,
      description,
    },
  });

  await prisma.client.update({
    where: { id: clientId },
    data: {
      balance: newBalance,
      status: newBalance > client.creditLimit ? "overdue" : "active",
      lastActivity: new Date(),
    },
  });

  revalidatePath("/clientes");
}

export async function closePeriod(clientId: string, reason: "settled" | "month_end" | "manual") {
  const { tenantId } = await requireTenant();
  const client = await prisma.client.findFirst({
    where: { id: clientId, organizationId: tenantId },
    include: { movements: { where: { periodId: null } } },
  });
  if (!client) throw new Error("Cliente no encontrado");

  const now = new Date();
  const label = now.toLocaleDateString("es-AR", { month: "long", year: "numeric" });
  const totalSales = client.movements
    .filter((m: { type: string }) => m.type === "sale")
    .reduce((a: number, m: { amount: number }) => a + m.amount, 0);
  const totalPaid = client.movements
    .filter((m: { type: string }) => m.type === "payment")
    .reduce((a: number, m: { amount: number }) => a + m.amount, 0);

  const period = await prisma.clientPeriod.create({
    data: {
      clientId,
      label,
      openedAt: client.createdAt,
      closedAt: now,
      closedReason: reason,
      totalSales,
      totalPaid,
      finalBalance: client.balance,
    },
  });

  await prisma.clientMovement.updateMany({
    where: { clientId, periodId: null },
    data: { periodId: period.id },
  });

  if (reason === "settled") {
    await prisma.client.update({
      where: { id: clientId },
      data: { balance: 0, status: "active" },
    });
  }

  revalidatePath("/clientes");
}
