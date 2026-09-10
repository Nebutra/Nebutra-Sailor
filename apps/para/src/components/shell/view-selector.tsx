"use client";

import { ChevronDown } from "@nebutra/icons";
import {
  Button,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@nebutra/ui/primitives";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback } from "react";
import {
  isWorkspaceView,
  LABS_VIEWS,
  WORKSPACE_VIEWS,
  type WorkspaceViewType,
} from "@/domain/types";

const LABEL: Record<WorkspaceViewType, string> = {
  canvas: "Canvas",
  storyboard: "Storyboard",
  timeline: "Timeline",
  viewer: "Viewer",
};
const LABS = process.env.NEXT_PUBLIC_PARA_LABS === "1";

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

/** canvas · storyboard are views over one document (B). timeline · viewer only behind NEXT_PUBLIC_PARA_LABS=1. */
export function ViewSelector() {
  const [view, setView] = useWorkspaceView();
  const views = LABS ? [...WORKSPACE_VIEWS, ...LABS_VIEWS] : WORKSPACE_VIEWS;
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          aria-label="Change view"
          suffix={<ChevronDown className="size-3.5 text-muted-foreground" />}
        >
          {LABEL[view]}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="center" className="min-w-40">
        {views.map((v) => (
          <DropdownMenuItem key={v} onClick={() => setView(v)}>
            <span className="flex-1">{LABEL[v]}</span>
            {LABS_VIEWS.includes(v) && (
              <span className="ml-3 text-[10px] text-muted-foreground uppercase tracking-wider">
                labs
              </span>
            )}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
