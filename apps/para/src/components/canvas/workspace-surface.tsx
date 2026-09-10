"use client";

import type { WorkspaceViewType } from "@/domain/types";
import { CanvasView } from "./canvas-view";
import { StoryboardView } from "./storyboard-view";

/** The one Primary Surface. Views swap how the document is shown, never the document. */
export function WorkspaceSurface({ view }: { view: WorkspaceViewType }) {
  if (view === "canvas") return <CanvasView />;
  if (view === "storyboard") return <StoryboardView />;
  return (
    <div className="flex h-full w-full items-center justify-center bg-background">
      <p className="text-muted-foreground text-sm capitalize">{view} is a labs view.</p>
    </div>
  );
}
