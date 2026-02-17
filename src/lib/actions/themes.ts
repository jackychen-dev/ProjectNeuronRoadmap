// @ts-nocheck
"use server";

import { prisma } from "@/lib/prisma";
import { themeSchema } from "@/lib/validations";
import { revalidatePath } from "next/cache";

export async function getThemes(includeArchived = false) {
  return prisma.roadmapTheme.findMany({
    where: includeArchived ? {} : { archivedAt: null },
    include: {
      featureGroups: {
        where: includeArchived ? {} : { archivedAt: null },
        include: { features: { where: includeArchived ? {} : { archivedAt: null } } },
      },
      features: { where: includeArchived ? {} : { archivedAt: null } },
    },
    orderBy: { sortOrder: "asc" },
  });
}

export async function createTheme(data: unknown) {
  const parsed = themeSchema.parse(data);
  const theme = await prisma.roadmapTheme.create({ data: parsed });
  revalidatePath("/roadmap");
  return theme;
}

export async function updateTheme(id: string, data: unknown) {
  const parsed = themeSchema.parse(data);
  const theme = await prisma.roadmapTheme.update({ where: { id }, data: parsed });
  revalidatePath("/roadmap");
  return theme;
}

export async function archiveTheme(id: string) {
  await prisma.roadmapTheme.update({
    where: { id },
    data: { archivedAt: new Date() },
  });
  revalidatePath("/roadmap");
}

export async function unarchiveTheme(id: string) {
  await prisma.roadmapTheme.update({
    where: { id },
    data: { archivedAt: null },
  });
  revalidatePath("/roadmap");
}


