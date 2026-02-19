import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 px-4">
      <p className="text-6xl font-bold text-muted-foreground">404</p>
      <p className="text-lg text-muted-foreground">This page could not be found.</p>
      <div className="flex flex-wrap gap-3 justify-center">
        <Button asChild variant="default">
          <Link href="/workstreams">Workstreams</Link>
        </Button>
        <Button asChild variant="outline">
          <Link href="/dashboard">Dashboard</Link>
        </Button>
        <Button asChild variant="outline">
          <Link href="/roadmap">Roadmap</Link>
        </Button>
      </div>
      <p className="text-sm text-muted-foreground max-w-md text-center">
        If you followed a workstream link, it may have been renamed or removed. Use Workstreams to see all current workstreams.
      </p>
    </div>
  );
}
