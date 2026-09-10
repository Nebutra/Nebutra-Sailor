"use client";

import { useEditorStore } from "@/stores/editor-store";
import { MediaNode } from "./media-node";

/** Storyboard is a view over the same nodes, not a second document (B — LibTV 工作流↔故事板). M1: ordered grid. */
export function StoryboardView() {
  const document = useEditorStore((s) => s.document);
  const selection = useEditorStore((s) => s.selection);
  const select = useEditorStore((s) => s.select);
  if (!document) return null;
  const nodes = Object.values(document.nodes)
    .filter((n) => n.type !== "text")
    .sort((a, b) => a.y - b.y || a.x - b.x);
  return (
    <div className="h-full w-full overflow-y-auto bg-background p-8">
      {nodes.length === 0 ? (
        <p className="text-muted-foreground text-sm">No shots yet.</p>
      ) : (
        <div className="grid grid-cols-4 gap-4">
          {nodes.map((n, i) => (
            <button
              key={n.id}
              type="button"
              onClick={() => select([n.id])}
              className={`flex aspect-video flex-col overflow-hidden rounded-lg border text-left ${selection.includes(n.id) ? "border-primary" : "border-border/60"}`}
            >
              <div className="min-h-0 flex-1">
                <MediaNode node={n} selected={false} />
              </div>
              <div className="flex h-[var(--para-h-chip)] items-center justify-between px-2 text-[11px] text-muted-foreground">
                <span>Shot {String(i + 1).padStart(2, "0")}</span>
                <span className="capitalize">{n.status}</span>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
