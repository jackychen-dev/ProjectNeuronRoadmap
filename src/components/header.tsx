"use client";

import { useSession, signOut } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { AutosaveIndicator } from "@/components/autosave-indicator";
import Link from "next/link";

export function Header() {
  const { data: session } = useSession();

  return (
    <header className="fixed left-64 right-0 top-0 z-[90] flex h-16 items-center justify-between border-b bg-background/95 px-6 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="flex items-center gap-4">
        <span className="text-sm text-muted-foreground">
          Project Neuron Program Hub
        </span>
        <AutosaveIndicator />
      </div>
      <div className="flex items-center gap-4">
        {session?.user ? (
          <>
            <span className="text-sm text-muted-foreground">
              {session.user.name || session.user.email}
              {(session.user as any).role === "ADMIN" && (
                <span className="ml-1 rounded bg-primary/10 px-1.5 py-0.5 text-xs font-medium text-primary">
                  Admin
                </span>
              )}
            </span>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => signOut({ callbackUrl: "/auth/signin" })}
            >
              Sign out
            </Button>
          </>
        ) : (
          <Link href="/auth/signin">
            <Button size="sm">Sign in</Button>
          </Link>
        )}
      </div>
    </header>
  );
}
