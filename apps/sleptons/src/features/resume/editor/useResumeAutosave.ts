"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { EditorContent } from "./state";

export type SaveStatus = "idle" | "dirty" | "saving" | "saved" | "invalid" | "error";

export interface FieldIssue {
  path: string; // e.g. "experiences.0.period"
  message: string;
}

export interface AutosaveState {
  status: SaveStatus;
  issues: FieldIssue[];
  savedAt: number | null;
  /** Force a save now (e.g. on blur of the last field or a Save button). */
  flush: () => Promise<void>;
}

const DEBOUNCE_MS = 3000;

/**
 * Debounced PUT to /api/resume. One in-flight request at a time; a change
 * during a save re-queues. 422 surfaces zod issues per field without
 * clobbering the editor state (spec §9: never lose what the member typed).
 */
export function useResumeAutosave(
  content: EditorContent,
  opts: { enabled?: boolean; endpoint?: string; debounceMs?: number } = {},
): AutosaveState {
  const { enabled = true, endpoint = "/api/resume", debounceMs = DEBOUNCE_MS } = opts;
  const [status, setStatus] = useState<SaveStatus>("idle");
  const [issues, setIssues] = useState<FieldIssue[]>([]);
  const [savedAt, setSavedAt] = useState<number | null>(null);

  const latest = useRef(content);
  const lastSaved = useRef<string | null>(null);
  const inflight = useRef<Promise<void> | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const first = useRef(true);

  latest.current = content;

  const save = useCallback(async () => {
    const snapshot = JSON.stringify(latest.current);
    if (snapshot === lastSaved.current) {
      setStatus((s) => (s === "dirty" ? "saved" : s));
      return;
    }
    setStatus("saving");
    try {
      const res = await fetch(endpoint, {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ content: latest.current }),
      });
      if (res.status === 422) {
        const body = (await res.json()) as {
          issues?: { path: (string | number)[]; message: string }[];
        };
        setIssues(
          (body.issues ?? []).map((i) => ({
            path: i.path.filter((p) => p !== "content").join("."),
            message: i.message,
          })),
        );
        setStatus("invalid");
        return;
      }
      if (!res.ok) {
        setStatus("error");
        return;
      }
      lastSaved.current = snapshot;
      setIssues([]);
      setSavedAt(Date.now());
      setStatus(JSON.stringify(latest.current) === snapshot ? "saved" : "dirty");
    } catch {
      setStatus("error");
    }
  }, [endpoint]);

  const run = useCallback(async () => {
    if (inflight.current) {
      await inflight.current;
    }
    inflight.current = save().finally(() => {
      inflight.current = null;
    });
    await inflight.current;
  }, [save]);

  const flush = useCallback(async () => {
    if (timer.current) {
      clearTimeout(timer.current);
      timer.current = null;
    }
    await run();
  }, [run]);

  useEffect(() => {
    if (!enabled) return;
    if (first.current) {
      // Treat the initial content as already persisted.
      first.current = false;
      lastSaved.current = JSON.stringify(content);
      return;
    }
    setStatus("dirty");
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      timer.current = null;
      void run();
    }, debounceMs);
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, [content, enabled, debounceMs, run]);

  return { status, issues, savedAt, flush };
}

export function issueFor(issues: FieldIssue[], path: string): string | undefined {
  return issues.find((i) => i.path === path)?.message;
}
