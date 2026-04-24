"use server";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import type { SectionKey } from "@/lib/sections";

async function getSessionOrThrow() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) throw new Error("No autenticado");
  return session;
}

async function requireOwnerOrAdmin() {
  const session = await getSessionOrThrow();
  const tenantId = session.session.activeOrganizationId;
  if (!tenantId) throw new Error("Sin organización activa");

  const member = await prisma.member.findFirst({
    where: { userId: session.user.id, organizationId: tenantId },
  });

  if (!member || (member.role !== "owner" && member.role !== "admin")) {
    throw new Error("Sin permisos para gestionar empleados");
  }

  return { session, tenantId, currentMember: member };
}

// ─── Queries ───────────────────────────────────────────────────────────────

export async function getMyPermissions(): Promise<SectionKey[] | "all"> {
  try {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session) return [];
    const tenantId = session.session.activeOrganizationId;
    if (!tenantId) return [];

    const member = await prisma.member.findFirst({
      where: { userId: session.user.id, organizationId: tenantId },
    });

    if (!member) return [];
    if (member.role === "owner" || member.role === "admin") return "all";

    const perms = await prisma.employeePermissions.findUnique({
      where: { memberId: member.id },
    });

    return (perms?.sections ?? []) as SectionKey[];
  } catch {
    return "all";
  }
}

export async function getOrgMembers() {
  const { tenantId } = await requireOwnerOrAdmin();

  const members = await prisma.member.findMany({
    where: { organizationId: tenantId },
    include: { user: { select: { id: true, name: true, email: true } } },
    orderBy: { createdAt: "asc" },
  });

  const perms = await prisma.employeePermissions.findMany({
    where: { organizationId: tenantId },
  });

  const permsMap = Object.fromEntries(perms.map((p) => [p.memberId, p.sections]));

  return members.map((m) => ({
    id: m.id,
    userId: m.userId,
    role: m.role,
    name: m.user.name,
    email: m.user.email,
    sections:
      m.role === "owner" || m.role === "admin"
        ? ("all" as const)
        : ((permsMap[m.id] ?? []) as SectionKey[]),
    createdAt: m.createdAt,
  }));
}

// ─── Mutations ─────────────────────────────────────────────────────────────

export async function createEmployee(data: {
  name: string;
  email: string;
  password: string;
  sections: SectionKey[];
  dni?: string;
  phone?: string;
  address?: string;
  position?: string;
  salary?: number;
  schedule?: string;
  status?: string;
  notes?: string;
}) {
  const { tenantId } = await requireOwnerOrAdmin();

  const existing = await prisma.user.findUnique({ where: { email: data.email } });
  if (existing) throw new Error("Ya existe un usuario con ese email");

  const result = await auth.api.signUpEmail({
    body: { name: data.name, email: data.email, password: data.password },
  });

  if (!result?.user?.id) throw new Error("No se pudo crear el usuario");

  const memberId = crypto.randomUUID();
  await prisma.member.create({
    data: {
      id: memberId,
      userId: result.user.id,
      organizationId: tenantId,
      role: "cashier",
      dni: data.dni ?? null,
      phone: data.phone ?? null,
      address: data.address ?? null,
      position: data.position ?? null,
      salary: data.salary ?? null,
      schedule: data.schedule ?? null,
      status: data.status ?? null,
      notes: data.notes ?? null,
    },
  });

  await prisma.employeePermissions.create({
    data: { memberId, organizationId: tenantId, sections: data.sections },
  });

  revalidatePath("/empleados");
}

export async function updateEmployeePermissions(
  memberId: string,
  sections: SectionKey[]
) {
  const { tenantId } = await requireOwnerOrAdmin();

  const member = await prisma.member.findFirst({
    where: { id: memberId, organizationId: tenantId },
  });
  if (!member) throw new Error("Miembro no encontrado");

  await prisma.employeePermissions.upsert({
    where: { memberId },
    create: { memberId, organizationId: tenantId, sections },
    update: { sections },
  });

  revalidatePath("/empleados");
}

export async function deleteEmployee(memberId: string) {
  const { tenantId, currentMember } = await requireOwnerOrAdmin();

  const member = await prisma.member.findFirst({
    where: { id: memberId, organizationId: tenantId },
  });

  if (!member) throw new Error("Miembro no encontrado");
  if (member.role === "owner") throw new Error("No se puede eliminar al propietario");
  if (memberId === currentMember.id) throw new Error("No podés eliminarte a vos mismo");

  await prisma.employeePermissions.deleteMany({ where: { memberId } });
  await prisma.member.delete({ where: { id: memberId } });

  revalidatePath("/empleados");
}
