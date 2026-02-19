"use client";

import { createContext, useContext, useRef, useCallback, useEffect, useState, type ReactNode } from "react";
import React from "react";

/* ─── Types ────────────────────────────────────────────── */

export type AutosaveStatus = "idle" | "saving" | "saved" | "error";

/* ─── Global autosave context ─────────────────────────── */

interface AutosaveCtx {
  status: AutosaveStatus;
  markSaving: () => void;
  markSaved: () => void;
  markError: () => void;
}

const Ctx = createContext<AutosaveCtx>({
  status: "idle",
  markSaving: () => {},
  markSaved: () => {},
  markError: () => {},
});

export function AutosaveProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<AutosaveStatus>("idle");
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const markSaving = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    setStatus("saving");
  }, []);

  const markSaved = useCallback(() => {
    setStatus("saved");
    timerRef.current = setTimeout(() => setStatus("idle"), 2000);
  }, []);

  const markError = useCallback(() => {
    setStatus("error");
    timerRef.current = setTimeout(() => setStatus("idle"), 4000);
  }, []);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  return React.createElement(
    Ctx.Provider,
    { value: { status, markSaving, markSaved, markError } },
    children
  );
}

export function useAutosaveStatus() {
  return useContext(Ctx);
}

/* ─── Wrapped server-action caller ────────────────────── */

/**
 * Returns a function that wraps any server action,
 * flashing the global saving/saved indicator.
 */
export function useTrackedSave() {
  const { markSaving, markSaved, markError } = useAutosaveStatus();

  return useCallback(
    async <T,>(action: () => Promise<T>): Promise<T | undefined> => {
      markSaving();
      try {
        const result = await action();
        if (result != null && typeof result === "object" && "success" in result && (result as { success?: boolean }).success === false) {
          markError();
          return result as T;
        }
        markSaved();
        return result;
      } catch (err) {
        console.error("Save failed:", err);
        markError();
        return undefined;
      }
    },
    [markSaving, markSaved, markError]
  );
}

/* ─── Debounced field-level autosave ──────────────────── */

export function useFieldAutosave<T>(
  currentValue: T,
  onSave: (value: T) => Promise<void>,
  delayMs = 600
) {
  const [localValue, setLocalValue] = useState<T>(currentValue);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const { markSaving, markSaved, markError } = useAutosaveStatus();
  const mountedRef = useRef(true);

  // Sync external changes (from server refresh)
  useEffect(() => {
    setLocalValue(currentValue);
  }, [currentValue]);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  const setValue = useCallback(
    (newValue: T) => {
      setLocalValue(newValue);
      if (timerRef.current) clearTimeout(timerRef.current);
      markSaving();
      timerRef.current = setTimeout(async () => {
        try {
          await onSave(newValue);
          if (mountedRef.current) markSaved();
        } catch (err) {
          console.error("Autosave failed:", err);
          if (mountedRef.current) markError();
        }
      }, delayMs);
    },
    [onSave, delayMs, markSaving, markSaved, markError]
  );

  return { value: localValue, setValue };
}
