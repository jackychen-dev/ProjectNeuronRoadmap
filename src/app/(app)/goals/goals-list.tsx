"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatDate, statusColor } from "@/lib/utils";
import { archiveGoal, linkFeatureToGoal } from "@/lib/actions/goals";
import { useRouter } from "next/navigation";
import { EmptyState } from "@/components/empty-state";
import { Select } from "@/components/ui/select";
import { useState } from "react";

function goalProgress(goal: any): number {
  if (goal.trackingMode === "CHECKLIST" || !goal.trackingMode) {
    const items = goal.checklistItems || [];
    if (items.length === 0) {
      const feats = goal.features?.map((gf: any) => gf.feature) || [];
      if (feats.length === 0) return 0;
      const done = feats.filter((f: any) => f.status === "DONE").length;
      return Math.round((done / feats.length) * 100);
    }
    const done = items.filter((i: any) => i.completed).length;
    return Math.round((done / items.length) * 100);
  }
  if (goal.trackingMode === "MILESTONES") {
    const ms = goal.milestones || [];
    if (ms.length === 0) return 0;
    const done = ms.filter((m: any) => m.completedAt).length;
    return Math.round((done / ms.length) * 100);
  }
  return 0;
}

export function GoalsList({ goals, features }: { goals: any[]; features: any[] }) {
  const router = useRouter();

  if (goals.length === 0) {
    return (
      <EmptyState icon="🎯" title="No goals yet" description="Create quarterly goals and link features to track progress." />
    );
  }

  return (
    <div className="grid gap-4 md:grid-cols-2">
      {goals.map((goal) => (
        <GoalCard key={goal.id} goal={goal} features={features} onRefresh={() => router.refresh()} />
      ))}
    </div>
  );
}

function GoalCard({ goal, features, onRefresh }: { goal: any; features: any[]; onRefresh: () => void }) {
  const [linking, setLinking] = useState(false);
  const linkedFeatureIds = goal.features?.map((gf: any) => gf.featureId) || [];
  const unlinkableFeatures = features.filter((f) => !linkedFeatureIds.includes(f.id));
  const progress = goalProgress(goal);

  const handleLink = async (featureId: string) => {
    if (!featureId) return;
    setLinking(true);
    await linkFeatureToGoal(goal.id, featureId);
    setLinking(false);
    onRefresh();
  };

  const handleArchive = async () => {
    await archiveGoal(goal.id);
    onRefresh();
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div>
            <CardTitle className="text-base">{goal.title}</CardTitle>
            <div className="flex gap-2 mt-1">
              {goal.releaseName && (
                <Badge variant="outline">{goal.releaseName}</Badge>
              )}
              <Badge variant="secondary">{goal.trackingMode || "CHECKLIST"}</Badge>
            </div>
          </div>
          <Button variant="ghost" size="sm" onClick={handleArchive} className="text-[10px] h-6 px-2">
            Archive
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {goal.description && (
          <p className="text-sm text-muted-foreground mb-3">{goal.description}</p>
        )}

        {goal.whyItMatters && (
          <div className="text-sm mb-2">
            <span className="font-medium">Why it matters:</span>{" "}
            <span className="text-muted-foreground">{goal.whyItMatters}</span>
          </div>
        )}

        {goal.successCriteria && (
          <div className="text-sm mb-3">
            <span className="font-medium">Success criteria:</span>{" "}
            <span className="text-muted-foreground">{goal.successCriteria}</span>
          </div>
        )}

        <div className="text-xs text-muted-foreground mb-2">
          {formatDate(goal.startDate)} → {formatDate(goal.endDate)}
          {goal.targetReleaseWindow && (
            <span className="ml-2">Release: {goal.targetReleaseWindow}</span>
          )}
        </div>

        {/* Progress bar */}
        <div className="flex items-center gap-2 mb-3">
          <div className="flex-1 h-2 rounded-full bg-muted overflow-hidden">
            <div
              className="h-full bg-primary rounded-full transition-all"
              style={{ width: `${progress}%` }}
            />
          </div>
          <span className="text-xs font-medium">{progress}%</span>
        </div>

        {/* Linked features */}
        <div className="space-y-1 mb-3">
          <div className="text-xs font-medium text-muted-foreground">Linked Features:</div>
          {goal.features?.length > 0 ? (
            goal.features.map((gf: any) => (
              <div key={gf.id} className="flex items-center gap-2 text-sm">
                <Badge className={statusColor(gf.feature.status)} variant="secondary">
                  {gf.feature.status.replace("_", " ")}
                </Badge>
                <span>{gf.feature.title}</span>
              </div>
            ))
          ) : (
            <p className="text-xs text-muted-foreground">No features linked</p>
          )}
        </div>

        {/* Link feature */}
        {unlinkableFeatures.length > 0 && (
          <Select
            onChange={(e) => handleLink(e.target.value)}
            value=""
            className="text-xs"
            disabled={linking}
          >
            <option value="">+ Link a feature…</option>
            {unlinkableFeatures.map((f) => (
              <option key={f.id} value={f.id}>{f.title}</option>
            ))}
          </Select>
        )}
      </CardContent>
    </Card>
  );
}

