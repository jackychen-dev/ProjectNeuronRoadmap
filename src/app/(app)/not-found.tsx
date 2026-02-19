import Link from "next/link";
import { cn } from "@/lib/utils";

export default function NotFound() {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 px-4">
      <p className="text-6xl font-bold text-muted-foreground">404</p>
      <p className="text-lg text-muted-foreground">This page could not be found.</p>
      <div className="flex flex-wrap gap-3 justify-center">
        <Link
          href="/workstreams"
          className={cn("inline-flex h-10 items-center justify-center rounded-md px-4 py-2 text-sm font-medium", "bg-primary text-primary-foreground hover:bg-primary/90")}
        >
          Workstreams
        </Link>
        <Link
          href="/dashboard"
          className={cn("inline-flex h-10 items-center justify-center rounded-md border border-input bg-background px-4 py-2 text-sm font-medium", "hover:bg-accent hover:text-accent-foreground")}
        >
          Dashboard
        </Link>
        <Link
          href="/roadmap"
          className={cn("inline-flex h-10 items-center justify-center rounded-md border border-input bg-background px-4 py-2 text-sm font-medium", "hover:bg-accent hover:text-accent-foreground")}
        >
          Roadmap
        </Link>
      </div>
      <p className="text-sm text-muted-foreground max-w-md text-center">
        If you followed a workstream link, it may have been renamed or removed. Use Workstreams to see all current workstreams.
      </p>
    </div>
  );
}
