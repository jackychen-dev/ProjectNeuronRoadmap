// @ts-nocheck
"use server";

import { prisma } from "@/lib/prisma";
import { featureGroupSchema } from "@/lib/validations";
import { revalidatePath } from "next/cache";

export async function getFeatureGroups(themeId?: string) {
  return prisma.featureGroup.findMany({
    where: {
      archivedAt: null,
      ...(themeId ? { themeId } : {}),
    },
    include: { features: { where: { archivedAt: null } }, children: true },
    orderBy: { sortOrder: "asc" },
  });
}

export async function createFeatureGroup(data: unknown) {
  const parsed = featureGroupSchema.parse(data);
  const fg = await prisma.featureGroup.create({ data: parsed });
  revalidatePath("/roadmap");
  return fg;
}

export async function updateFeatureGroup(id: string, data: unknown) {
  const parsed = featureGroupSchema.parse(data);
  const fg = await prisma.featureGroup.update({ where: { id }, data: parsed });
  revalidatePath("/roadmap");
  return fg;
}

export async function archiveFeatureGroup(id: string) {
  await prisma.featureGroup.update({
    where: { id },
    data: { archivedAt: new Date() },
  });
  revalidatePath("/roadmap");
}


