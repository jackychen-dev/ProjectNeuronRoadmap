"use server";

import { prisma } from "@/lib/prisma";
import { userSchema } from "@/lib/validations";
import { revalidatePath } from "next/cache";
import bcrypt from "bcryptjs";

export async function getUsers() {
  return prisma.user.findMany({
    orderBy: { createdAt: "desc" },
    select: { id: true, email: true, name: true, role: true, createdAt: true },
  });
}

export async function createUser(data: unknown) {
  const parsed = userSchema.parse(data);
  const hash = parsed.password ? await bcrypt.hash(parsed.password, 10) : undefined;
  await prisma.user.create({
    data: {
      email: parsed.email,
      name: parsed.name,
      passwordHash: hash,
      role: parsed.role || "MEMBER",
    },
  });
  revalidatePath("/admin");
}

export async function updateUserRole(id: string, role: string) {
  await prisma.user.update({ where: { id }, data: { role } });
  revalidatePath("/admin");
}

export async function deleteUser(id: string) {
  await prisma.user.delete({ where: { id } });
  revalidatePath("/admin");
}

/**
 * Link a Person to a User account.
 * Passing personId=null unlinks.
 */
export async function linkPersonToUser(userId: string, personId: string | null) {
  // First, unlink any Person currently linked to this user
  await prisma.person.updateMany({
    where: { userId },
    data: { userId: null },
  });

  // If a new personId is provided, link it
  if (personId) {
    // Also unlink this person from any other user (1:1 relationship)
    await prisma.person.update({
      where: { id: personId },
      data: { userId },
    });
  }

  revalidatePath("/admin");
  revalidatePath("/my-dashboard");
}