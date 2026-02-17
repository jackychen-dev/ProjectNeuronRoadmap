"use server";

import { prisma } from "@/lib/prisma";
import { programSchema } from "@/lib/validations";
import { revalidatePath } from "next/cache";

export async function getProgram() {
  return prisma.program.findFirst({
    include: { workstreams: { orderBy: { sortOrder: "asc" } } },
  });
}

export async function updateProgram(id: string, data: unknown) {
  const parsed = programSchema.parse(data);
  const program = await prisma.program.update({ where: { id }, data: parsed });
  revalidatePath("/strategy");
  revalidatePath("/dashboard");
  return program;
}

