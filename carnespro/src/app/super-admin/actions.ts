"use server";

import { prisma } from "@/lib/db";
import { revalidatePath } from "next/cache";

export async function toggleUserBan(userId: string, currentlyBanned: boolean) {
  await prisma.user.update({
    where: { id: userId },
    data: { banned: !currentlyBanned },
  });
  revalidatePath("/super-admin");
}