import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export const dynamic = "force-dynamic";

export default async function WorkstreamsIndexPage() {
  const workstreams = await prisma.workstream.findMany({
    orderBy: { sortOrder: "asc" },
    include: {
      _count: { select: { initiatives: true } },
    },
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Workstreams</h1>
        <p className="text-muted-foreground mt-1">
          Select a workstream to view initiatives, sub-tasks, and progress.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {workstreams.map((ws) => (
          <Link key={ws.id} href={`/workstreams/${ws.slug}`} className="block">
            <Card className="h-full transition-colors hover:border-primary/50 hover:bg-accent/20">
              <CardHeader className="pb-2">
                <div className="flex items-center gap-2">
                  <div
                    className="w-3 h-3 rounded-full flex-shrink-0"
                    style={{ backgroundColor: ws.color || "#888" }}
                  />
                  <CardTitle className="text-lg">{ws.name}</CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  {ws._count.initiatives} initiative{ws._count.initiatives !== 1 ? "s" : ""}
                </p>
                {ws.description && (
                  <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{ws.description}</p>
                )}
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      {workstreams.length === 0 && (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground">No workstreams yet.</p>
            <Link href="/roadmap" className="text-sm text-primary hover:underline mt-2 inline-block">
              Add one from the Roadmap →
            </Link>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
