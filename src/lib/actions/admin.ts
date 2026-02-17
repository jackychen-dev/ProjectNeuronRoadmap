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