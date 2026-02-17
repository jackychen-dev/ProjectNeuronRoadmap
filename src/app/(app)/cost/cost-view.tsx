"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { createCostEntry, deleteCostEntry } from "@/lib/actions/costs";
import { formatDate } from "@/lib/utils";
import { useRouter } from "next/navigation";
import { CostChart } from "./cost-chart";

const costTypeColors: Record<string, string> = {
  LABOR: "bg-blue-100 text-blue-700",
  TOOLS: "bg-purple-100 text-purple-700",
  CLOUD: "bg-cyan-100 text-cyan-700",
  OTHER: "bg-gray-100 text-gray-700",
};

export function CostView({
  costData,
  features,
  goals,
  issues,
}: {
  costData: any;
  features: any[];
  goals: any[];
  issues: any[];
}) {
  const router = useRouter();
  const { entries, laborCosts } = costData;

  // Totals
  const directTotal = entries.reduce((s: number, e: any) => s + e.amount, 0);
  const laborTotal = laborCosts.reduce((s: number, e: any) => s + e.amount, 0);

  const handleDelete = async (id: string) => {
    await deleteCostEntry(id);
    router.refresh();
  };

  return (
    <div className="space-y-6">
      {/* Summary cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardContent className="p-4">
            <div className="text-sm text-muted-foreground">Direct Cost Entries</div>
            <div className="text-2xl font-bold">${directTotal.toLocaleString()}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-sm text-muted-foreground">Computed Labor Cost</div>
            <div className="text-2xl font-bold">${laborTotal.toLocaleString()}</div>
            <div className="text-xs text-muted-foreground">From assignments × hourly rates</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-sm text-muted-foreground">Total</div>
            <div className="text-2xl font-bold">${(directTotal + laborTotal).toLocaleString()}</div>
          </CardContent>
        </Card>
      </div>

      {/* Chart */}
      {entries.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Cost Over Time</CardTitle>
          </CardHeader>
          <CardContent>
            <CostChart entries={entries} laborCosts={laborCosts} />
          </CardContent>
        </Card>
      )}

      {/* Add cost entry */}
      <CreateCostDialog features={features} goals={goals} issues={issues} />

      {/* Entries table */}
      {entries.length > 0 && (
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Linked To</TableHead>
                <TableHead>Notes</TableHead>
                <TableHead className="w-20">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {entries.map((e: any) => (
                <TableRow key={e.id}>
                  <TableCell className="text-sm">{formatDate(e.date)}</TableCell>
                  <TableCell>
                    <Badge className={costTypeColors[e.costType]} variant="secondary">{e.costType}</Badge>
                  </TableCell>
                  <TableCell className="font-medium">${e.amount.toLocaleString()} {e.currency}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {e.feature?.title || e.goal?.title || e.issue?.title || "—"}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground max-w-xs truncate">{e.notes || "—"}</TableCell>
                  <TableCell>
                    <Button variant="ghost" size="sm" onClick={() => handleDelete(e.id)} className="text-[10px] h-6 px-2">
                      Delete
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}

function CreateCostDialog({ features, goals, issues }: { features: any[]; goals: any[]; issues: any[] }) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    const fd = new FormData(e.currentTarget);
    await createCostEntry({
      date: fd.get("date") as string,
      costType: fd.get("costType") as string || "LABOR",
      amount: Number(fd.get("amount")),
      currency: fd.get("currency") as string || "USD",
      featureId: fd.get("featureId") as string || null,
      goalId: fd.get("goalId") as string || null,
      issueId: fd.get("issueId") as string || null,
      notes: fd.get("notes") as string,
    });
    setLoading(false);
    setOpen(false);
    router.refresh();
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm">+ Cost Entry</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>New Cost Entry</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Date *</Label>
              <Input name="date" type="date" required />
            </div>
            <div>
              <Label>Type</Label>
              <Select name="costType" defaultValue="LABOR">
                <option value="LABOR">Labor</option>
                <option value="TOOLS">Tools</option>
                <option value="CLOUD">Cloud</option>
                <option value="OTHER">Other</option>
              </Select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Amount *</Label>
              <Input name="amount" type="number" step="0.01" required />
            </div>
            <div>
              <Label>Currency</Label>
              <Input name="currency" defaultValue="USD" />
            </div>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <Label>Feature</Label>
              <Select name="featureId">
                <option value="">None</option>
                {features.map((f) => <option key={f.id} value={f.id}>{f.title}</option>)}
              </Select>
            </div>
            <div>
              <Label>Goal</Label>
              <Select name="goalId">
                <option value="">None</option>
                {goals.map((g) => <option key={g.id} value={g.id}>{g.title}</option>)}
              </Select>
            </div>
            <div>
              <Label>Issue</Label>
              <Select name="issueId">
                <option value="">None</option>
                {issues.map((i) => <option key={i.id} value={i.id}>{i.title}</option>)}
              </Select>
            </div>
          </div>
          <div>
            <Label>Notes</Label>
            <Textarea name="notes" />
          </div>
          <Button type="submit" disabled={loading} className="w-full">
            {loading ? "Creating…" : "Add Cost Entry"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}

