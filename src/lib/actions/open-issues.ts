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

  // Parse @mentions from comment body (e.g. @John Doe or @JD)
  const mentionPattern = /@([A-Za-z][A-Za-z\s]*?)(?=\s@|[.,!?\s]*$|[.,!?]\s)/g;
  const mentionNames: string[] = [];
  let match;
  while ((match = mentionPattern.exec(parsed.body)) !== null) {
    mentionNames.push(match[1].trim());
  }

  if (mentionNames.length > 0) {
    // Find people matching mentioned names (case-insensitive) or initials
    const allPeople = await prisma.person.findMany({
      select: { id: true, name: true, initials: true },
    });

    const mentionedPeople = new Set<string>();
    for (const mName of mentionNames) {
      const lower = mName.toLowerCase();
      for (const p of allPeople) {
        if (
          p.name.toLowerCase() === lower ||
          p.initials?.toLowerCase() === lower ||
          p.name.toLowerCase().startsWith(lower)
        ) {
          mentionedPeople.add(p.id);
        }
      }
    }

    // Create mention records
    for (const personId of mentionedPeople) {
      await prisma.issueMention.create({
        data: {
          issueId: parsed.issueId,
          commentId: comment.id,
          personId,
        },
      });
    }
  }

  revalidatePath("/open-issues");
  revalidatePath("/my-dashboard");
  return comment;
}

/** Get mentions for a person (for My Dashboard) */
export async function getMentionsForPerson(personId: string) {
  return prisma.issueMention.findMany({
    where: { personId },
    include: {
      issue: {
        include: {
          workstream: { select: { id: true, name: true, slug: true } },
          subTask: { select: { id: true, name: true } },
          comments: { orderBy: { createdAt: "desc" }, take: 3 },
        },
      },
      comment: { select: { id: true, body: true, authorName: true, createdAt: true } },
    },
    orderBy: { createdAt: "desc" },
  });
}

/** Mark a mention as seen */
export async function markMentionSeen(mentionId: string) {
  await prisma.issueMention.update({
    where: { id: mentionId },
    data: { seenAt: new Date() },
  });
  revalidatePath("/my-dashboard");
}

export async function deleteIssueComment(id: string) {
  await prisma.issueComment.delete({ where: { id } });
  revalidatePath("/open-issues");
}

/* ─── Notification tracking ─────────────────── */

export async function markIssueSeen(userId: string, issueId: string) {
  await prisma.userIssueSeen.upsert({
    where: { userId_issueId: { userId, issueId } },
    create: { userId, issueId, lastSeenAt: new Date() },
    update: { lastSeenAt: new Date() },
  });
}

export async function getUnseenReplyCount(userId: string) {
  const seen = await prisma.userIssueSeen.findMany({
    where: { userId },
    select: { issueId: true, lastSeenAt: true },
  });
  const seenMap = new Map(seen.map((s) => [s.issueId, s.lastSeenAt]));

  const issues = await prisma.openIssue.findMany({
    where: { resolvedAt: null },
    select: {
      id: true,
      comments: { select: { createdAt: true }, orderBy: { createdAt: "desc" }, take: 1 },
    },
  });

  let count = 0;
  for (const issue of issues) {
    if (issue.comments.length === 0) continue;
    const lastComment = issue.comments[0].createdAt;
    const lastSeen = seenMap.get(issue.id);
    if (!lastSeen || lastComment > lastSeen) {
      count++;
    }
  }
  return count;
}

export async function getIssuesWithNewReplies(userId: string) {
  const seen = await prisma.userIssueSeen.findMany({
    where: { userId },
    select: { issueId: true, lastSeenAt: true },
  });
  const seenMap = new Map(seen.map((s) => [s.issueId, s.lastSeenAt]));

  const issues = await prisma.openIssue.findMany({
    where: { resolvedAt: null },
    include: {
      workstream: { select: { id: true, name: true } },
      subTask: { select: { id: true, name: true, initiative: { select: { id: true, name: true, ownerId: true } } } },
      comments: { orderBy: { createdAt: "desc" }, take: 3 },
    },
    orderBy: { updatedAt: "desc" },
  });

  return issues.filter((issue) => {
    if (issue.comments.length === 0) return false;
    const lastComment = issue.comments[0].createdAt;
    const lastSeen = seenMap.get(issue.id);
    return !lastSeen || lastComment > lastSeen;
  });
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

