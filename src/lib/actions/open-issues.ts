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
  const assigneeIds = parsed.assigneeIds ?? [];
  const issue = await prisma.openIssue.create({
    data: {
      workstreamId: parsed.workstreamId,
      subTaskId: parsed.subTaskId || null,
      title: parsed.title,
      description: parsed.description || null,
      severity: parsed.severity || "NOT_A_CONCERN",
      screenshotUrl: parsed.screenshotUrl || null,
      assignees: assigneeIds.length
        ? { create: assigneeIds.map((personId) => ({ personId })) }
        : undefined,
    },
  });
  revalidatePath("/open-issues");
  revalidatePath("/workstreams");
  revalidatePath("/my-dashboard");
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
  revalidatePath("/my-dashboard");
  return issue;
}

/** Set full list of assignees for an issue (replaces existing). */
export async function setIssueAssignees(issueId: string, personIds: string[]) {
  await prisma.openIssueAssignee.deleteMany({ where: { issueId } });
  if (personIds.length > 0) {
    await prisma.openIssueAssignee.createMany({
      data: personIds.map((personId) => ({ issueId, personId })),
      skipDuplicates: true,
    });
  }
  revalidatePath("/open-issues");
  revalidatePath("/my-dashboard");
}

export async function resolveOpenIssue(id: string) {
  const issue = await prisma.openIssue.update({
    where: { id },
    data: { resolvedAt: new Date() },
  });
  revalidatePath("/open-issues");
  revalidatePath("/workstreams");
  revalidatePath("/my-dashboard");
  return issue;
}

export async function reopenIssue(id: string) {
  const issue = await prisma.openIssue.update({
    where: { id },
    data: { resolvedAt: null },
  });
  revalidatePath("/open-issues");
  revalidatePath("/workstreams");
  revalidatePath("/my-dashboard");
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

/** Parse @mentions from body: @JC or @John -> match Person by initials or name */
function parseMentionedPersonIds(body: string, people: { id: string; initials: string | null; name: string }[]): string[] {
  const tokens = body.match(/@(\w+)/g) || [];
  const ids = new Set<string>();
  for (const t of tokens) {
    const part = t.slice(1).trim().toUpperCase();
    if (!part) continue;
    for (const p of people) {
      const matchInitials = p.initials && p.initials.toUpperCase() === part;
      const matchName = p.name.toUpperCase().includes(part) || (p.initials && p.name.toUpperCase().startsWith(part));
      if (matchInitials || matchName) ids.add(p.id);
    }
  }
  return [...ids];
}

export type AddCommentResult =
  | { success: true; comment: { id: string; issueId: string; body: string; authorName: string | null; createdAt: Date; parentId: string | null } }
  | { success: false; error: string };

export async function addIssueComment(data: unknown): Promise<AddCommentResult> {
  const parsed = issueCommentSchema.safeParse(data);
  if (!parsed.success) {
    const msg = parsed.error.flatten().formErrors?.[0] || parsed.error.message || "Invalid comment data";
    return { success: false, error: msg };
  }
  const { issueId, parentId, body, authorName } = parsed.data;
  const bodyTrim = typeof body === "string" ? body.trim() : String(body ?? "");
  if (!bodyTrim) return { success: false, error: "Comment cannot be empty" };
  const issueIdStr = typeof issueId === "string" ? issueId : String(issueId ?? "");
  if (!issueIdStr) return { success: false, error: "Issue is required" };

  let people: { id: string; initials: string | null; name: string }[] = [];
  try {
    people = await prisma.person.findMany({ select: { id: true, initials: true, name: true } });
  } catch {
    // Person table may be missing; continue without mentions
  }
  const mentionedIds = parseMentionedPersonIds(bodyTrim, people);

  let comment: { id: string; issueId: string; body: string; authorName: string | null; createdAt: Date; parentId: string | null };
  try {
    comment = await prisma.issueComment.create({
      data: {
        issueId: issueIdStr,
        parentId: parentId && String(parentId).trim() ? String(parentId).trim() : null,
        body: bodyTrim,
        authorName: authorName && String(authorName).trim() ? String(authorName).trim() : null,
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Database error";
    return {
      success: false,
      error: "Could not save comment. If this persists, run database migrations (e.g. npx prisma migrate deploy).",
    };
  }

  try {
    for (const personId of mentionedIds) {
      await prisma.issueCommentMention.upsert({
        where: { commentId_personId: { commentId: comment.id, personId } },
        create: { commentId: comment.id, personId },
        update: {},
      });
      await prisma.issueMention.create({
        data: { issueId: issueIdStr, commentId: comment.id, personId },
      }).catch(() => {});
    }
  } catch {
    // Mention tables may be missing; comment was already created
  }

  try {
    revalidatePath("/open-issues");
    revalidatePath("/my-dashboard");
  } catch {
    // Ignore revalidate errors
  }
  return { success: true, comment };
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

