"use client";

import { PlayFill } from "@nebutra/icons";
import type { WorkspaceNode } from "@/domain/types";
import { findAsset } from "@/mock/queries";

/**
 * At rest a node is its media: full-bleed, no border, no shadow, no title bar. What the node *is*
 * reads as an 11px label positioned *outside* the frame, above it — four of five mapped products
 * put identity there, and keeping it outside is what lets the selection stroke sit on the media's
 * own bounds rather than around a caption.
 *
 * In flight there is no progress bar and no spinner — five of five show a placeholder plus a text
 * state instead, because a determinate bar over a generation with no determinate progress is a lie
 * the surface tells (docs/product-intelligence/visual-language.md §4).
 */
export function MediaNode({ node, selected }: { node: WorkspaceNode; selected: boolean }) {
  const asset = node.type === "text" || !node.assetId ? undefined : findAsset(node.assetId);
  const hover = selected ? "" : "hover:ring-1 hover:ring-neutral-7/60";
  const model = node.generator?.model;
  const identity = [
    asset?.label ?? (node.type === "text" ? "Text" : node.type),
    model && model !== "Auto" ? model : null,
  ]
    .filter(Boolean)
    .join(" · ");

  return (
    <>
      <span className="-top-5 pointer-events-none absolute left-0 truncate text-[11px] text-muted-foreground">
        {identity}
      </span>
      {node.type === "text" ? (
        <div
          className={`h-full w-full rounded-[var(--para-node-radius)] px-3 py-2 text-foreground text-sm leading-snug ${hover}`}
        >
          {node.text}
        </div>
      ) : (
        <div
          className={`relative h-full w-full overflow-hidden rounded-[var(--para-node-radius)] bg-neutral-3 ${hover}`}
        >
          {asset ? (
            <img
              src={asset.url}
              alt={asset.label}
              draggable={false}
              className="pointer-events-none h-full w-full object-cover"
            />
          ) : null}
          {node.type === "video" && node.status === "completed" && (
            <span className="absolute right-2 bottom-2 flex size-6 items-center justify-center rounded-full bg-black/50 text-white">
              <PlayFill className="size-3" />
            </span>
          )}
          {(node.status === "queued" || node.status === "running") && <TaskState node={node} />}
          {node.status === "failed" && (
            <div className="absolute inset-0 flex flex-col items-start justify-end gap-0.5 bg-background/70 p-2.5">
              <span className="text-[11px] text-destructive">
                {node.error?.message ?? "Failed"}
              </span>
              {node.error?.type && (
                <span className="font-mono text-[11px] text-muted-foreground">
                  {node.error.type}
                </span>
              )}
            </div>
          )}
          {(node.status === "empty" || node.status === "configured") && !asset && (
            <div className="absolute inset-0 flex items-center justify-center text-[11px] text-muted-foreground">
              {node.generator?.prompt ? node.generator.prompt : "Empty"}
            </div>
          )}
        </div>
      )}
    </>
  );
}

/** A placeholder fill, a text pill and the cost. No bar, no spinner. */
function TaskState({ node }: { node: WorkspaceNode }) {
  const running = node.status === "running";
  return (
    <div className="absolute inset-0 flex items-end justify-between bg-neutral-2/90 p-2.5">
      <span className="rounded-md bg-popover px-1.5 py-0.5 text-[11px] text-foreground">
        {running ? "Generating…" : `Queued${node.queuePosition ? ` · ${node.queuePosition}` : ""}`}
      </span>
      {node.cost?.estimated !== undefined && (
        <span className="text-[11px] text-muted-foreground tabular-nums">
          ✦{node.cost.estimated}
        </span>
      )}
    </div>
  );
}
