"use client";

import { useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Link from "next/link";

export default function AppError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("App error:", error.message, error.digest, error.cause);
  }, [error]);

  const isDev = process.env.NODE_ENV === "development";
  const isDbError =
    error.message?.includes("DATABASE") ||
    error.message?.includes("Prisma") ||
    error.message?.includes("connection") ||
    error.message?.includes("connect");

  return (
    <div className="flex min-h-[60vh] items-center justify-center p-6">
      <Card className="max-w-lg w-full border-destructive/50">
        <CardHeader>
          <CardTitle className="text-destructive">Something went wrong</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {isDev ? (
            <pre className="rounded bg-muted p-3 text-xs overflow-auto max-h-40">
              {error.message}
              {error.digest && `\nDigest: ${error.digest}`}
            </pre>
          ) : (
            <p className="text-sm text-muted-foreground">
              A server-side error occurred. Check your deployment logs (e.g. Vercel → Project → Logs) for the full error.
              {isDbError && (
                <span className="mt-2 block font-medium text-foreground">
                  This may be a database or environment issue. Ensure DATABASE_URL is set and migrations have been run (prisma migrate deploy).
                </span>
              )}
            </p>
          )}
          <div className="flex gap-2">
            <Button onClick={reset} variant="default">
              Try again
            </Button>
            <Link href="/dashboard">
              <Button variant="outline">Go to Dashboard</Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
