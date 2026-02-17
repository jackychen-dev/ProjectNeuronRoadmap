"use server";

import { prisma } from "@/lib/prisma";
import { openIssueSchema, issueCommentSchema } from "@/lib/validations";
import { revalidatePath } from "next/cache";

export async function getOpenIssues(workstreamId?: string) {
  return prisma.openIssue.findMany({
    where: {
      ...(workstreamId ? { workstreamId } : {}),
      resolvedAt: null,
    },
    include: {
      workstream: { select: { id: true, name: true, slug: true } },
      subTask: { select: { id: true, name: true, initiative: { select: { id: true, name: true } } } },
    },
    orderBy: { createdAt: "desc" },
  });
}

export async function getAllIssues(workstreamId?: string, includeResolved = false) {
  return prisma.openIssue.findMany({
    where: {
      ...(workstreamId ? { workstreamId } : {}),
      ...(includeResolved ? {} : { resolvedAt: null }),
    },
    include: {
      workstream: { select: { id: true, name: true, slug: true } },
      subTask: { select: { id: true, name: true, initiative: { select: { id: true, name: true } } } },
    },
    orderBy: { createdAt: "desc" },
  });
}

export async function createOpenIssue(data: unknown) {
  const parsed = openIssueSchema.parse(data);
  const issue = await prisma.openIssue.create({
    data: {
      workstreamId: parsed.workstreamId,
      subTaskId: parsed.subTaskId || null,
      title: parsed.title,
      description: parsed.description || null,
      severity: parsed.severity || "NOT_A_CONCERN",
      screenshotUrl: parsed.screenshotUrl || null,
    },
  });
  revalidatePath("/open-issues");
  revalidatePath("/workstreams");
  return issue;
}

export async function updateOpenIssue(
  id: string,
  data: Partial<{
    title: string;
    description: string | null;
    severity: string;
    screenshotUrl: string | null;
    subTaskId: string | null;
  }>
) {
  const issue = await prisma.openIssue.update({
    where: { id },
    data,
  });
  revalidatePath("/open-issues");
  revalidatePath("/workstreams");
  return issue;
}

export async function resolveOpenIssue(id: string) {
  const issue = await prisma.openIssue.update({
    where: { id },
    data: { resolvedAt: new Date() },
  });
  revalidatePath("/open-issues");
  revalidatePath("/workstreams");
  return issue;
}

export async function reopenIssue(id: string) {
  const issue = await prisma.openIssue.update({
    where: { id },
    data: { resolvedAt: null },
  });
  revalidatePath("/open-issues");
  revalidatePath("/workstreams");
  return issue;
}

export async function deleteOpenIssue(id: string) {
  await prisma.openIssue.delete({ where: { id } });
  revalidatePath("/open-issues");
  revalidatePath("/workstreams");
}

/* ─── Comments ─────────────────────────────────── */

export async function getIssueComments(issueId: string) {
  return prisma.issueComment.findMany({
    where: { issueId },
    orderBy: { createdAt: "asc" },
  });
}

export async function addIssueComment(data: unknown) {
  const parsed = issueCommentSchema.parse(data);
  const comment = await prisma.issueComment.create({
    data: {
      issueId: parsed.issueId,
      body: parsed.body,
      authorName: parsed.authorName || null,
    },
  });
  revalidatePath("/open-issues");
  return comment;
}

export async function deleteIssueComment(id: string) {
  await prisma.issueComment.delete({ where: { id } });
  revalidatePath("/open-issues");
}

/** Count open issues per workstream */
export async function countOpenIssuesByWorkstream() {
  const issues = await prisma.openIssue.groupBy({
    by: ["workstreamId", "severity"],
    where: { resolvedAt: null },
    _count: true,
  });
  // Transform into a map: workstreamId → { total, stopping, slowing, notAConcern }
  const result: Record<string, { total: number; stopping: number; slowing: number; notAConcern: number }> = {};
  for (const row of issues) {
    if (!result[row.workstreamId]) {
      result[row.workstreamId] = { total: 0, stopping: 0, slowing: 0, notAConcern: 0 };
    }
    result[row.workstreamId].total += row._count;
    if (row.severity === "STOPPING") result[row.workstreamId].stopping += row._count;
    else if (row.severity === "SLOWING") result[row.workstreamId].slowing += row._count;
    else result[row.workstreamId].notAConcern += row._count;
  }
  return result;
}

