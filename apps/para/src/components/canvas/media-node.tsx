"use client";

import { PlayFill } from "@nebutra/icons";
import type { WorkspaceNode } from "@/domain/types";
import { findAsset } from "@/mock/queries";
import { useJobsStore } from "@/stores/jobs-store";

/**
 * A node is generator state + result (A). At rest it is just its content; queued / running / failed
 * render on the node itself — the node is the primary job surface (jobs.md).
 */
export function MediaNode({ node, selected }: { node: WorkspaceNode; selected: boolean }) {
  const ring = selected ? "" : "hover:ring-1 hover:ring-neutral-7/60";
  if (node.type === "text") {
    return (
      <div
        className={`flex h-full w-full items-start rounded-md px-3 py-2 text-foreground text-sm leading-snug ${ring}`}
      >
        {node.text}
      </div>
    );
  }
  const asset = node.assetId ? findAsset(node.assetId) : undefined;
  return (
    <div className={`relative h-full w-full overflow-hidden rounded-md bg-neutral-3 ${ring}`}>
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
      {(node.status === "queued" || node.status === "running") && <TaskOverlay node={node} />}
      {node.status === "failed" && (
        <div className="absolute inset-0 flex flex-col items-start justify-end gap-0.5 border border-destructive/60 bg-background/70 p-2.5">
          <span className="text-destructive text-xs">{node.error?.message ?? "Failed"}</span>
          {node.error?.type && (
            <span className="font-mono text-[10px] text-muted-foreground">{node.error.type}</span>
          )}
        </div>
      )}
      {(node.status === "empty" || node.status === "configured") && !asset && (
        <div className="absolute inset-0 flex items-center justify-center text-muted-foreground text-xs">
          {node.generator?.prompt ? node.generator.prompt : "Empty"}
        </div>
      )}
    </div>
  );
}

function TaskOverlay({ node }: { node: WorkspaceNode }) {
  const job = useJobsStore((s) =>
    s.jobs.find((j) => j.nodeId === node.id && (j.status === "queued" || j.status === "running")),
  );
  const running = node.status === "running";
  return (
    <div className="absolute inset-0 flex flex-col justify-between bg-neutral-2/90 p-2.5">
      <div className="flex items-center justify-between text-xs">
        <span className="text-foreground">
          {running
            ? "Generating…"
            : `Queued${node.queuePosition ? ` · ${node.queuePosition}` : ""}`}
        </span>
        {node.cost?.estimated !== undefined && (
          <span className="text-muted-foreground tabular-nums">✦{node.cost.estimated}</span>
        )}
      </div>
      <div className="h-0.5 w-full overflow-hidden rounded-full bg-neutral-5">
        <div
          className={`h-full rounded-full bg-primary transition-[width] duration-500 ${running ? "" : "animate-pulse"}`}
          style={{ width: `${Math.max(6, (job?.progress ?? 0) * 100)}%` }}
        />
      </div>
    </div>
  );
}
