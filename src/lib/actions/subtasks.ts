"use server";

import { prisma } from "@/lib/prisma";
import { subTaskSchema } from "@/lib/validations";
import { revalidatePath } from "next/cache";

export async function getSubTasks(initiativeId: string) {
  return prisma.subTask.findMany({
    where: { initiativeId },
    orderBy: { sortOrder: "asc" },
  });
}

export async function createSubTask(data: unknown) {
  const parsed = subTaskSchema.parse(data);
  const subTask = await prisma.subTask.create({
    data: {
      initiativeId: parsed.initiativeId,
      name: parsed.name,
      description: parsed.description || null,
      points: parsed.points || 0,
      completionPercent: parsed.completionPercent || 0,
      status: parsed.status || "NOT_STARTED",
      sortOrder: parsed.sortOrder || 0,
      estimatedDays: parsed.estimatedDays ?? null,
      unknowns: parsed.unknowns || null,
      integration: parsed.integration || null,
      ...(typeof parsed.assignedOrganization !== "undefined" && {
        assignedOrganization: parsed.assignedOrganization ?? null,
      }),
    } as Parameters<typeof prisma.subTask.create>[0]["data"],
  });
  revalidatePath("/workstreams");
  return subTask;
}

export async function updateSubTask(id: string, data: Partial<{
  name: string;
  description: string | null;
  points: number;
  completionPercent: number;
  status: string;
  sortOrder: number;
  estimatedDays: number | null;
  unknowns: string | null;
  integration: string | null;
  assignedOrganization: string | null;
}>) {
  try {
    const subTask = await prisma.subTask.update({
      where: { id },
      data,
    });
    revalidatePath("/workstreams");
    return subTask;
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    if (msg.includes("Unknown arg") && msg.includes("assignedOrganization")) {
      throw new Error(
        "Assigned organization not in Prisma client. In project root run: npx prisma generate"
      );
    }
    if ((msg.includes("assignedOrganization") || msg.includes("column")) && msg.includes("exist")) {
      throw new Error(
        "Assigned organization column missing in DB. Run: npx prisma db push"
      );
    }
    throw err;
  }
}

export async function updateSubTaskCompletion(id: string, completionPercent: number) {
  const clamped = Math.max(0, Math.min(100, completionPercent));
  const status = clamped === 100 ? "DONE" : clamped > 0 ? "IN_PROGRESS" : "NOT_STARTED";
  const subTask = await prisma.subTask.update({
    where: { id },
    data: { completionPercent: clamped, status },
  });
  revalidatePath("/workstreams");
  return subTask;
}

export async function updateSubTaskEstimation(
  id: string,
  data: {
    estimatedDays?: number | null;
    unknowns?: string | null;
    integration?: string | null;
    points?: number;
  }
) {
  const subTask = await prisma.subTask.update({
    where: { id },
    data,
  });
  revalidatePath("/workstreams");
  return subTask;
}

export async function toggleSubTaskAddedScope(id: string, isAddedScope: boolean) {
  const subTask = await prisma.subTask.update({
    where: { id },
    data: { isAddedScope },
  });
  revalidatePath("/workstreams");
  revalidatePath("/burndown");
  return subTask;
}

export async function updateSubTaskAssignee(id: string, assigneeId: string | null) {
  const subTask = await prisma.subTask.update({
    where: { id },
    data: { assigneeId },
  });
  revalidatePath("/workstreams");
  revalidatePath("/my-dashboard");
  return subTask;
}

export async function deleteSubTask(id: string) {
  await prisma.subTask.delete({ where: { id } });
  revalidatePath("/workstreams");
}
