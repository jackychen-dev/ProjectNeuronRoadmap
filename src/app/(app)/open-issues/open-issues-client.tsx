"use client";

import dynamic from "next/dynamic";

const OpenIssuesView = dynamic(
  () => import("./open-issues-view").then((m) => ({ default: m.OpenIssuesView })),
  {
    ssr: true,
    loading: () => (
      <div className="flex items-center justify-center py-16">
        <p className="text-muted-foreground">Loading Open Issues…</p>
      </div>
    ),
  }
);

type WorkstreamRef = { id: string; name: string; slug: string; initiatives: { id: string; name: string; subTasks: { id: string; name: string }[] }[] };
type PersonRef = { id: string; name: string; initials: string | null };

export function OpenIssuesPageClient({
  workstreams,
  issues,
  people,
  currentPersonId = null,
}: {
  workstreams: WorkstreamRef[];
  issues: unknown[];
  people: PersonRef[];
  currentPersonId?: string | null;
}) {
  return (
    <OpenIssuesView
      workstreams={workstreams}
      issues={issues as never}
      people={people}
      currentPersonId={currentPersonId}
    />
  );
}
