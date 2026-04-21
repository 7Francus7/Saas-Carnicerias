"use server";

import { prisma } from "@/lib/db";
import { requireAdmin } from "@/actions/_helpers";
import { revalidatePath } from "next/cache";

export async function toggleUserBan(userId: string, currentlyBanned: boolean) {
  await requireAdmin();
  await prisma.user.update({
    where: { id: userId },
    data: { banned: !currentlyBanned },
  });
  revalidatePath("/super-admin");
}

export async function deleteUser(userId: string) {
  await requireAdmin();
  await prisma.user.delete({ where: { id: userId } });
  revalidatePath("/super-admin");
}

export async function deleteOrg(orgId: string) {
  await requireAdmin();
  await prisma.organization.delete({ where: { id: orgId } });
  revalidatePath("/super-admin");
}

export async function toggleUserRole(userId: string, currentRole: string) {
  await requireAdmin();
  await prisma.user.update({
    where: { id: userId },
    data: { role: currentRole === "admin" ? "user" : "admin" },
  });
  revalidatePath("/super-admin");
}

export async function revokeUserSessions(userId: string) {
  await requireAdmin();
  await prisma.session.deleteMany({ where: { userId } });
  revalidatePath("/super-admin");
}
