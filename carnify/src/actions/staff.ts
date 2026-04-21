"use server";

import { prisma } from "@/lib/db";
import { requireTenant } from "./_helpers";
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

export async function getStaff() {
  const { tenantId } = await requireTenant();
  return prisma.staff.findMany({
    where: { organizationId: tenantId },
    orderBy: { name: "asc" },
  });
}

export async function createStaff(data: z.infer<typeof StaffSchema>) {
  const { tenantId } = await requireTenant();
  const parsed = StaffSchema.parse(data);
  const staff = await prisma.staff.create({
    data: { ...parsed, organizationId: tenantId },
  });
  revalidatePath("/personal");
  return staff;
}

export async function updateStaff(id: string, data: Partial<z.infer<typeof StaffSchema>>) {
  const { tenantId } = await requireTenant();
  await prisma.staff.updateMany({ where: { id, organizationId: tenantId }, data });
  revalidatePath("/personal");
}

export async function deleteStaff(id: string) {
  const { tenantId } = await requireTenant();
  await prisma.staff.deleteMany({ where: { id, organizationId: tenantId } });
  revalidatePath("/personal");
}
