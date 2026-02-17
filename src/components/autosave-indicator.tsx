"use client";

import { useAutosaveStatus } from "@/hooks/use-autosave";

export function AutosaveIndicator() {
  const { status } = useAutosaveStatus();

  if (status === "idle") return null;

  return (
    <div className="flex items-center gap-1.5 text-xs font-medium animate-in fade-in duration-200">
      {status === "saving" && (
        <>
          <span className="inline-block w-2 h-2 rounded-full bg-yellow-500 animate-pulse" />
          <span className="text-muted-foreground">Saving…</span>
        </>
      )}
      {status === "saved" && (
        <>
          <span className="inline-block w-2 h-2 rounded-full bg-green-500" />
          <span className="text-green-600 dark:text-green-400">Saved</span>
        </>
      )}
      {status === "error" && (
        <>
          <span className="inline-block w-2 h-2 rounded-full bg-red-500" />
          <span className="text-red-600 dark:text-red-400">Save failed</span>
        </>
      )}
    </div>
  );
}
