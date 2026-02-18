"use client";

import { useState, useTransition, useRef, useMemo } from "react";
import { useRouter } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  addIssueComment,
  markMentionSeen,
} from "@/lib/actions/open-issues";
import { useTrackedSave } from "@/hooks/use-autosave";

/* ─── Types ─────────────────────────────────────────── */

interface MentionComment {
  id: string;
  body: string;
  authorName: string | null;
  createdAt: string;
}

interface MentionIssue {
  id: string;
  title: string;
  description: string | null;
  severity: string;
  resolvedAt: string | null;
  workstream: { id: string; name: string; slug: string };
  subTask: { id: string; name: string } | null;
  comments: MentionComment[];
}

interface MentionData {
  id: string;
  issueId: string;
  commentId: string;
  personId: string;
  createdAt: string;
  seenAt: string | null;
  issue: MentionIssue;
  comment: MentionComment;
}

interface PersonRef {
  id: string;
  name: string;
  initials: string | null;
}

const SEVERITY_DOT: Record<string, string> = {
  STOPPING: "bg-red-500",
  SLOWING: "bg-yellow-500",
  NOT_A_CONCERN: "bg-green-500",
};

/* ─── Helpers ────────────────────────────────────────── */

function renderCommentBody(body: string) {
  const parts = body.split(/(@[A-Za-z][A-Za-z\s]*?)(?=\s@|[.,!?\s]*$|[.,!?]\s|\s)/g);
  return parts.map((part, i) =>
    part.startsWith("@") ? (
      <span key={i} className="text-blue-600 dark:text-blue-400 font-semibold">{part}</span>
    ) : (
      <span key={i}>{part}</span>
    )
  );
}

/* ─── Component ──────────────────────────────────────── */

export default function MyMentions({
  mentions,
  people,
}: {
  mentions: MentionData[];
  people: PersonRef[];
}) {
  const [isPending, startTransition] = useTransition();
  const router = useRouter();
  const trackedSave = useTrackedSave();

  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [replyText, setReplyText] = useState("");
  const [replyAuthor, setReplyAuthor] = useState("");

  // Mention dropdown state for reply
  const [showMentionDropdown, setShowMentionDropdown] = useState(false);
  const [mentionFilter, setMentionFilter] = useState("");
  const [mentionCursorPos, setMentionCursorPos] = useState(0);
  const replyTextareaRef = useRef<HTMLTextAreaElement>(null);

  const filteredPeople = useMemo(() => {
    if (!mentionFilter) return people;
    const lower = mentionFilter.toLowerCase();
    return people.filter(
      (p) =>
        p.name.toLowerCase().includes(lower) ||
        p.initials?.toLowerCase().includes(lower)
    );
  }, [people, mentionFilter]);

  function handleReplyKeyUp(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    const textarea = e.currentTarget;
    const pos = textarea.selectionStart;
    const textBefore = textarea.value.substring(0, pos);
    const atMatch = textBefore.match(/@([A-Za-z]*)$/);
    if (atMatch) {
      setShowMentionDropdown(true);
      setMentionFilter(atMatch[1]);
      setMentionCursorPos(pos);
    } else {
      setShowMentionDropdown(false);
      setMentionFilter("");
    }
  }

  function insertMention(person: PersonRef) {
    const textarea = replyTextareaRef.current;
    if (!textarea) return;
    const textBefore = replyText.substring(0, mentionCursorPos);
    const textAfter = replyText.substring(mentionCursorPos);
    const atIdx = textBefore.lastIndexOf("@");
    const newText = textBefore.substring(0, atIdx) + `@${person.name} ` + textAfter;
    setReplyText(newText);
    setShowMentionDropdown(false);
    setMentionFilter("");
    setTimeout(() => {
      textarea.focus();
      const newPos = atIdx + person.name.length + 2;
      textarea.setSelectionRange(newPos, newPos);
    }, 0);
  }

  const unseenCount = mentions.filter((m) => !m.seenAt).length;

  // Group mentions by issue for cleaner display
  const byIssue = useMemo(() => {
    const map = new Map<string, { issue: MentionIssue; mentions: MentionData[] }>();
    for (const m of mentions) {
      const existing = map.get(m.issueId);
      if (existing) {
        existing.mentions.push(m);
      } else {
        map.set(m.issueId, { issue: m.issue, mentions: [m] });
      }
    }
    return [...map.values()];
  }, [mentions]);

  function handleReply(issueId: string) {
    if (!replyText.trim()) return;
    startTransition(async () => {
      await trackedSave(() =>
        addIssueComment({
          issueId,
          body: replyText.trim(),
          authorName: replyAuthor.trim() || null,
        })
      );
      setReplyText("");
      setReplyingTo(null);
      router.refresh();
    });
  }

  function handleMarkSeen(mentionId: string) {
    startTransition(async () => {
      await markMentionSeen(mentionId);
      router.refresh();
    });
  }

  function handleMarkAllSeen() {
    startTransition(async () => {
      for (const m of mentions.filter((m) => !m.seenAt)) {
        await markMentionSeen(m.id);
      }
      router.refresh();
    });
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CardTitle>Mentions</CardTitle>
            {unseenCount > 0 && (
              <Badge variant="destructive" className="text-[10px]">
                {unseenCount} new
              </Badge>
            )}
          </div>
          {unseenCount > 0 && (
            <Button
              size="sm"
              variant="ghost"
              className="text-xs"
              disabled={isPending}
              onClick={handleMarkAllSeen}
            >
              Mark all read
            </Button>
          )}
        </div>
        <p className="text-xs text-muted-foreground">
          Issues where you were @mentioned. Reply directly from here.
        </p>
      </CardHeader>
      <CardContent>
        {byIssue.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-8">
            No mentions yet. Others can @mention you in open issue comments.
          </p>
        ) : (
          <div className="space-y-4">
            {byIssue.map(({ issue, mentions: issueMentions }) => {
              const hasUnseen = issueMentions.some((m) => !m.seenAt);
              const isReplying = replyingTo === issue.id;

              return (
                <div
                  key={issue.id}
                  className={`border rounded-lg p-4 space-y-3 ${
                    hasUnseen
                      ? "border-blue-300 dark:border-blue-700 bg-blue-50/50 dark:bg-blue-950/20"
                      : ""
                  }`}
                >
                  {/* Issue header */}
                  <div className="flex items-start gap-2">
                    <span
                      className={`w-2.5 h-2.5 rounded-full mt-1.5 shrink-0 ${
                        SEVERITY_DOT[issue.severity] || "bg-gray-400"
                      }`}
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-0.5">
                        <h4 className="font-semibold text-sm truncate">
                          {issue.title}
                        </h4>
                        {hasUnseen && (
                          <Badge variant="secondary" className="text-[9px]">
                            New
                          </Badge>
                        )}
                        {issue.resolvedAt && (
                          <Badge
                            variant="outline"
                            className="text-[10px] text-green-600"
                          >
                            Resolved
                          </Badge>
                        )}
                      </div>
                      <div className="text-[10px] text-muted-foreground">
                        {issue.workstream.name}
                        {issue.subTask && ` · ${issue.subTask.name}`}
                      </div>
                    </div>
                  </div>

                  {/* The mentions/comments that tagged you */}
                  <div className="space-y-2 ml-4">
                    {issueMentions.map((m) => (
                      <div
                        key={m.id}
                        className={`flex gap-2 ${!m.seenAt ? "bg-blue-100/50 dark:bg-blue-900/20 -mx-2 px-2 py-1 rounded" : ""}`}
                      >
                        <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center text-[9px] font-bold text-primary shrink-0 mt-0.5">
                          {m.comment.authorName
                            ? m.comment.authorName.slice(0, 2).toUpperCase()
                            : "??"}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-baseline gap-2">
                            <span className="text-xs font-semibold">
                              {m.comment.authorName || "Anonymous"}
                            </span>
                            <span className="text-[10px] text-muted-foreground">
                              {new Date(m.comment.createdAt).toLocaleString()}
                            </span>
                            {!m.seenAt && (
                              <button
                                className="text-[10px] text-blue-500 hover:text-blue-700 ml-auto"
                                onClick={() => handleMarkSeen(m.id)}
                                disabled={isPending}
                              >
                                Mark read
                              </button>
                            )}
                          </div>
                          <p className="text-sm text-muted-foreground whitespace-pre-wrap mt-0.5">
                            {renderCommentBody(m.comment.body)}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Latest comments on the issue (for context) */}
                  {issue.comments.length > 0 && (
                    <details className="ml-4">
                      <summary className="text-[10px] text-muted-foreground cursor-pointer hover:text-foreground">
                        Recent comments ({issue.comments.length})
                      </summary>
                      <div className="space-y-1.5 mt-2">
                        {issue.comments.map((c) => (
                          <div key={c.id} className="flex gap-2">
                            <div className="w-5 h-5 rounded-full bg-muted flex items-center justify-center text-[8px] font-bold shrink-0 mt-0.5">
                              {c.authorName
                                ? c.authorName.slice(0, 2).toUpperCase()
                                : "??"}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-baseline gap-1.5">
                                <span className="text-[10px] font-semibold">
                                  {c.authorName || "Anonymous"}
                                </span>
                                <span className="text-[9px] text-muted-foreground">
                                  {new Date(c.createdAt).toLocaleString()}
                                </span>
                              </div>
                              <p className="text-xs text-muted-foreground whitespace-pre-wrap">
                                {renderCommentBody(c.body)}
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </details>
                  )}

                  {/* Reply form */}
                  {isReplying ? (
                    <div className="ml-4 space-y-2 border-t pt-2">
                      <div className="flex gap-2">
                        <Input
                          className="h-7 text-xs flex-1"
                          placeholder="Your name (optional)"
                          value={replyAuthor}
                          onChange={(e) => setReplyAuthor(e.target.value)}
                        />
                      </div>
                      <div className="relative">
                        <textarea
                          ref={replyTextareaRef}
                          className="w-full rounded-md border px-2.5 py-1.5 text-sm bg-background min-h-[50px] resize-y"
                          placeholder="Type your reply... Use @name to mention"
                          value={replyText}
                          onChange={(e) => setReplyText(e.target.value)}
                          onKeyUp={handleReplyKeyUp}
                          onKeyDown={(e) => {
                            if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
                              handleReply(issue.id);
                            }
                            if (e.key === "Escape") {
                              setShowMentionDropdown(false);
                            }
                          }}
                          autoFocus
                        />
                        {showMentionDropdown && filteredPeople.length > 0 && (
                          <div className="absolute left-0 bottom-full mb-1 w-64 max-h-40 overflow-y-auto bg-background border rounded-lg shadow-lg z-50">
                            {filteredPeople.map((p) => (
                              <button
                                key={p.id}
                                type="button"
                                className="w-full text-left px-3 py-1.5 text-sm hover:bg-accent/50 flex items-center gap-2"
                                onMouseDown={(e) => {
                                  e.preventDefault();
                                  insertMention(p);
                                }}
                              >
                                <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-blue-100 text-blue-700 text-[9px] font-bold">
                                  {p.initials ||
                                    p.name.slice(0, 2).toUpperCase()}
                                </span>
                                <span>{p.name}</span>
                                {p.initials && (
                                  <span className="text-xs text-muted-foreground">
                                    ({p.initials})
                                  </span>
                                )}
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          size="sm"
                          className="text-xs h-7"
                          disabled={isPending || !replyText.trim()}
                          onClick={() => handleReply(issue.id)}
                        >
                          Reply
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="text-xs h-7"
                          onClick={() => {
                            setReplyingTo(null);
                            setReplyText("");
                          }}
                        >
                          Cancel
                        </Button>
                        <span className="text-[10px] text-muted-foreground">
                          Ctrl+Enter to submit · Type @ to mention
                        </span>
                      </div>
                    </div>
                  ) : (
                    <div className="ml-4 pt-1">
                      <Button
                        size="sm"
                        variant="outline"
                        className="text-xs h-7"
                        onClick={() => setReplyingTo(issue.id)}
                      >
                        💬 Reply
                      </Button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

