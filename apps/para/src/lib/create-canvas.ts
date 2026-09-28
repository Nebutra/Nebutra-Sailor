"use client";

import { useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useCallback, useState } from "react";
import { api } from "@/lib/api";
import { useUiStore } from "@/stores/ui-store";
import {
  type CanvasOptions,
  type CanvasStart,
  NEW_PROJECT_NAME,
  startHref,
  startKey,
} from "./canvas-start";

export type { CanvasOptions, CanvasStart } from "./canvas-start";

/**
 * Zero-step create (A): a new project and its first workspace, then straight into the canvas.
 * Same call in mock and gateway mode — `api` is whichever adapter is selected.
 */
export function useCreateCanvas() {
  const router = useRouter();
  const qc = useQueryClient();
  const [pending, setPending] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);

  const create = useCallback(
    async (start: CanvasStart, opts: CanvasOptions = {}) => {
      if (pending) return;
      setPending(startKey(start, opts));
      setFailed(false);
      try {
        const project = await api.createProject(NEW_PROJECT_NAME);
        const ws = await api.createWorkspace(project.id);
        void qc.invalidateQueries({ queryKey: ["projects"] });
        if (start === "agent") {
          const prompt = opts.prompt?.trim();
          useUiStore
            .getState()
            .setAgent(prompt ? { status: "composing", prompt } : { status: "composing" });
        }
        router.push(startHref(project.id, ws.id, start, opts));
      } catch {
        // Signed out (gateway 401) or offline. The entry stays usable; the caller says what happened.
        setFailed(true);
        setPending(null);
      }
    },
    [pending, qc, router],
  );

  return { create, pending, failed };
}
