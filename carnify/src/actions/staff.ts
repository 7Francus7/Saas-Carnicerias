"use server";

import { prisma } from "@/lib/db";
import { requireTenantAndSection } from "./_helpers";
import { revalidatePath } from "next/cache";
import { z } from "zod";

const StaffSchema = z.object({
  name: z.string().min(1),
  dni: z.string().default(""),
  phone: z.string().default(""),
  role: z.enum(["carnicero", "cajero", "ayudante", "encargado", "limpieza"]),
  address: z.string().default(""),
  email: z.string().default(""),
  notes: z.string().default(""),
  salary: z.number().default(0),
  schedule: z.string().default(""),
  status: z.enum(["active", "inactive", "vacations", "suspended"]).default("active"),
  hireDate: z.coerce.date(),
});

// Update parcial: opcionales SIN default (no blanquear campos no enviados).
// Excluye organizationId/memberId/createdAt (no editables por este path).
const StaffUpdateSchema = z.object({
  name: z.string().min(1).optional(),
  dni: z.string().optional(),
  phone: z.string().optional(),
  role: z.enum(["carnicero", "cajero", "ayudante", "encargado", "limpieza"]).optional(),
  address: z.string().optional(),
  email: z.string().optional(),
  notes: z.string().optional(),
  salary: z.number().optional(),
  schedule: z.string().optional(),
  status: z.enum(["active", "inactive", "vacations", "suspended"]).optional(),
  hireDate: z.coerce.date().optional(),
});

export async function getStaff() {
  const { tenantId } = await requireTenantAndSection("personal");
  return prisma.staff.findMany({
    where: { organizationId: tenantId },
    include: { member: { select: { id: true, userId: true } } },
    orderBy: { name: "asc" },
  });
}

export async function createStaff(data: z.infer<typeof StaffSchema>) {
  const { tenantId } = await requireTenantAndSection("personal");
  const parsed = StaffSchema.parse(data);
  const staff = await prisma.staff.create({
    data: { ...parsed, organizationId: tenantId },
  });
  revalidatePath("/personal");
  return staff;
}

export async function updateStaff(id: string, data: Partial<z.infer<typeof StaffSchema>>) {
  const { tenantId } = await requireTenantAndSection("personal");
  // Validar: solo campos del schema. Evita mass-assignment de organizationId
  // (mover registro a otro tenant) o memberId (vínculo cruzado) vía llamada cruda.
  const parsed = StaffUpdateSchema.parse(data);
  await prisma.staff.updateMany({ where: { id, organizationId: tenantId }, data: parsed });
  revalidatePath("/personal");
}

export async function deleteStaff(id: string) {
  const { tenantId } = await requireTenantAndSection("personal");
  await prisma.staff.deleteMany({ where: { id, organizationId: tenantId } });
  revalidatePath("/personal");
}

export async function getAvailableMembers(_staffId: string) {
  const { tenantId } = await requireTenantAndSection("personal");
  return prisma.member.findMany({
    where: {
      organizationId: tenantId,
      staff: null,
    },
    select: { id: true, role: true, user: { select: { email: true, name: true } } },
  });
}

export async function linkStaffToMember(staffId: string, memberId: string) {
  const { tenantId } = await requireTenantAndSection("personal");
  await prisma.staff.updateMany({
    where: { id: staffId, organizationId: tenantId },
    data: { memberId },
  });
  revalidatePath("/personal");
}

export async function unlinkStaffMember(staffId: string) {
  const { tenantId } = await requireTenantAndSection("personal");
  await prisma.staff.updateMany({
    where: { id: staffId, organizationId: tenantId },
    data: { memberId: null },
  });
  revalidatePath("/personal");
}
