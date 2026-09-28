"use client";

import { useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useCallback, useState } from "react";
import { canvasHref, type SeedMode } from "@/domain/seed";
import { api } from "@/lib/api";
import { useUiStore } from "@/stores/ui-store";

/**
 * What a create entry on the shell starts with.
 * - `blank`: an empty canvas (sidebar New project, the Home hero).
 * - `agent`: an empty canvas with the agent composer open.
 * - a seed mode: an empty canvas holding one generator node of that mode (Home tool tiles).
 */
export type CanvasStart = "blank" | "agent" | SeedMode;

/**
 * Zero-step create (A): a new project and its first workspace, then straight into the canvas.
 * Same call in mock and gateway mode — `api` is whichever adapter is selected.
 */
export function useCreateCanvas() {
  const router = useRouter();
  const qc = useQueryClient();
  const [pending, setPending] = useState<CanvasStart | null>(null);
  const [failed, setFailed] = useState(false);

  const create = useCallback(
    async (start: CanvasStart) => {
      if (pending) return;
      setPending(start);
      setFailed(false);
      try {
        const project = await api.createProject();
        const ws = await api.createWorkspace(project.id);
        void qc.invalidateQueries({ queryKey: ["projects"] });
        if (start === "agent") useUiStore.getState().setAgent({ status: "composing" });
        const seed = start === "blank" || start === "agent" ? null : start;
        router.push(canvasHref(project.id, ws.id, seed));
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
