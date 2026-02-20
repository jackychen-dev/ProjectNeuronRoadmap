"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

/* ──────────────────────────────────────────────────────
   Agile Estimation — Mental Model & Story Points Rubric
   ────────────────────────────────────────────────────── */

export default function AgileEstimationPage() {
  return (
    <div className="max-w-4xl mx-auto space-y-10 pb-16">
      {/* ── Title ──────────────────────────────────── */}
      <header className="space-y-3">
        <div className="flex items-center gap-2">
          <Badge variant="secondary" className="text-xs">Documentation</Badge>
          <Badge variant="outline" className="text-xs">Estimation</Badge>
        </div>
        <h1 className="text-3xl font-bold tracking-tight">
          Agile Estimation Reference
        </h1>
        <p className="text-muted-foreground leading-relaxed max-w-2xl">
          Story points measure <strong>relative effort</strong>&nbsp;&mdash; a blend of complexity,
          effort, and risk&nbsp;&mdash; not hours.
        </p>
      </header>

      {/* ── Section 1 — Mental Model for Sizing ──── */}
      <section className="space-y-4">
        <h2 className="text-xl font-semibold border-b pb-2">
          1. Mental Model for Sizing
        </h2>
        <p className="text-sm text-muted-foreground">
          Use the anchor as the midpoint. Everything else is relative.
        </p>
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-28 font-semibold">Points</TableHead>
                  <TableHead className="font-semibold">Relative Meaning</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {([
                  { pts: "1", label: "Tiny, trivial", badge: "secondary" as const },
                  { pts: "2", label: "Very small", badge: "secondary" as const },
                  { pts: "3", label: "Small — the anchor", badge: "default" as const },
                  { pts: "5", label: "Medium", badge: "secondary" as const },
                  { pts: "8", label: "Large", badge: "outline" as const },
                  { pts: "13", label: "Very large", badge: "destructive" as const },
                  { pts: "21+", label: "Too big — break it down", badge: "destructive" as const },
                ]).map((row) => (
                  <TableRow key={row.pts}>
                    <TableCell>
                      <Badge variant={row.badge} className={`font-mono ${row.pts === "3" ? "bg-primary text-primary-foreground" : ""}`}>{row.pts}</Badge>
                    </TableCell>
                    <TableCell className={`text-sm ${row.pts === "3" ? "font-medium" : ""}`}>{row.label}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
        <p className="text-xs text-muted-foreground italic">
          If a story reaches 21+, it must be broken into smaller deliverables before estimation.
        </p>
      </section>

      {/* ── Section 2 — Story Points Rubric ─────────── */}
      <section id="rubric" className="space-y-6">
        <h2 className="text-xl font-semibold border-b pb-2">
          2. Story Points Rubric
        </h2>
        <p className="text-sm text-muted-foreground">
          Use this table to compute story points for any sub-component. The final
          value is the sum of <strong className="text-foreground">Base + Unknowns + Integration</strong>.
        </p>

        {/* ── Combined Rubric Table ── */}
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50">
                  <TableHead className="font-semibold text-xs w-[140px]">Category</TableHead>
                  <TableHead className="font-semibold text-xs">Level / Range</TableHead>
                  <TableHead className="font-semibold text-xs w-[100px] text-right">Points</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {/* A. Effort → Base Points */}
                <TableRow className="bg-blue-50/50 dark:bg-blue-950/20">
                  <TableCell rowSpan={6} className="text-xs font-bold align-top border-r">
                    A. Estimated Duration<br />
                    <span className="font-normal text-muted-foreground">→ Base Points</span>
                  </TableCell>
                  <TableCell className="text-sm">1 day</TableCell>
                  <TableCell className="text-sm font-mono text-right"><Badge variant="outline" className="font-mono">1</Badge></TableCell>
                </TableRow>
                {[
                  ["2–3 days", "3"],
                  ["4–5 days", "5"],
                  ["6–8 days", "8"],
                  ["9–13 days", "13"],
                ].map(([days, pts], i) => (
                  <TableRow key={i} className="bg-blue-50/50 dark:bg-blue-950/20">
                    <TableCell className="text-sm">{days}</TableCell>
                    <TableCell className="text-sm text-right"><Badge variant="outline" className="font-mono">{pts}</Badge></TableCell>
                  </TableRow>
                ))}
                <TableRow className="bg-blue-50/50 dark:bg-blue-950/20">
                  <TableCell className="text-sm">30+ days</TableCell>
                  <TableCell className="text-sm text-right">
                    <span className="text-red-600 dark:text-red-400 font-semibold">21+ (must break down)</span>
                  </TableCell>
                </TableRow>

                {/* Separator */}
                <TableRow><TableCell colSpan={3} className="h-1 p-0 bg-border" /></TableRow>

                {/* B. Unknowns Adjustment */}
                <TableRow className="bg-amber-50/50 dark:bg-amber-950/20">
                  <TableCell rowSpan={5} className="text-xs font-bold align-top border-r">
                    B. Unknowns<br />
                    <span className="font-normal text-muted-foreground">Adjustment</span>
                  </TableCell>
                  <TableCell className="text-sm">None</TableCell>
                  <TableCell className="text-sm font-mono text-right">+0</TableCell>
                </TableRow>
                {[
                  ["Low", "+1"],
                  ["Low–Moderate", "+2"],
                  ["High", "+4"],
                  ["Very High / Exploratory", "+5"],
                ].map(([level, add], i) => (
                  <TableRow key={i} className="bg-amber-50/50 dark:bg-amber-950/20">
                    <TableCell className="text-sm">{level}</TableCell>
                    <TableCell className="text-sm font-mono text-right">{add}</TableCell>
                  </TableRow>
                ))}

                {/* Separator */}
                <TableRow><TableCell colSpan={3} className="h-1 p-0 bg-border" /></TableRow>

                {/* C. Integration Adjustment */}
                <TableRow className="bg-green-50/50 dark:bg-green-950/20">
                  <TableCell rowSpan={4} className="text-xs font-bold align-top border-r">
                    C. Integration<br />
                    <span className="font-normal text-muted-foreground">Adjustment</span>
                  </TableCell>
                  <TableCell className="text-sm">Single system</TableCell>
                  <TableCell className="text-sm font-mono text-right">+0</TableCell>
                </TableRow>
                {[
                  ["1–2 systems", "+0"],
                  ["Multiple internal systems", "+1"],
                  ["Cross-team / external dependency", "+1"],
                ].map(([level, add], i) => (
                  <TableRow key={i} className="bg-green-50/50 dark:bg-green-950/20">
                    <TableCell className="text-sm">{level}</TableCell>
                    <TableCell className="text-sm font-mono text-right">{add}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* ── Guardrails ── */}
        <div className="space-y-2">
          <h3 className="text-sm font-bold">Guardrails</h3>
          <Card className="bg-muted/30">
            <CardContent className="pt-4 space-y-1.5 text-sm">
              <p className="font-mono text-xs text-muted-foreground mb-2">
                Final = Base + Unknowns Add + Integration Add
              </p>
              <ul className="list-disc list-inside space-y-1 text-muted-foreground text-sm">
                <li>If estimated duration <strong className="text-foreground">≥&nbsp;30 days</strong>, points = <Badge variant="destructive" className="font-mono text-[10px]">21+</Badge> and show <em>&ldquo;Break this down&rdquo;</em> warning.</li>
                <li>If unknowns = &ldquo;Very High / Exploratory&rdquo;, show <em>&ldquo;Consider a spike / split&rdquo;</em> warning.</li>
              </ul>
            </CardContent>
          </Card>
        </div>
      </section>
    </div>
  );
}
