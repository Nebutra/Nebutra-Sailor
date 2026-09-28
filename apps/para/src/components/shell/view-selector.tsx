"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback } from "react";
import { isWorkspaceView, LABS_VIEWS, type WorkspaceViewType } from "@/domain/types";

/** 工作流 · 故事板 are views over one document (B). timeline · viewer only behind NEXT_PUBLIC_PARA_LABS=1. */
export const VIEW_LABEL: Record<WorkspaceViewType, string> = {
  canvas: "工作流",
  storyboard: "故事板",
  timeline: "时间线",
  viewer: "预览",
};
const LABS = process.env.NEXT_PUBLIC_PARA_LABS === "1";

/** The current view, kept in `?view=` so a link reopens it; 工作流 is the bare URL. */
export function useWorkspaceView(): [WorkspaceViewType, (view: WorkspaceViewType) => void] {
  const params = useSearchParams();
  const pathname = usePathname();
  const router = useRouter();
  const raw = params.get("view");
  const view: WorkspaceViewType =
    isWorkspaceView(raw) && (LABS || !LABS_VIEWS.includes(raw)) ? raw : "canvas";
  const setView = useCallback(
    (next: WorkspaceViewType) => {
      const q = new URLSearchParams(params.toString());
      if (next === "canvas") q.delete("view");
      else q.set("view", next);
      const qs = q.toString();
      router.replace(qs ? `${pathname}?${qs}` : pathname);
    },
    [params, pathname, router],
  );
  return [view, setView];
}
