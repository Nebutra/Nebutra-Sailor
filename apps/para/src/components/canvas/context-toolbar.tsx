"use client";

import { MoreHorizontal } from "@nebutra/icons";
import { Popover, PopoverContent, PopoverTrigger } from "@nebutra/ui/primitives";
import { Chip } from "@/components/ui/chip";
import type { WorkspaceNode } from "@/domain/types";
import { useEditorStore } from "@/stores/editor-store";
import { useJobsStore } from "@/stores/jobs-store";

/**
 * Floating toolbar above the selection (A). Cap: 8 visible + `···` overflow. M2 vocabulary for an image:
 * Vary · Upscale · Crop · Edit · To video · Download · Duplicate · Delete. Slots without an M1 behaviour render disabled.
 * Running node: Cancel only (C).
 */
export function ContextToolbar({ node }: { node: WorkspaceNode }) {
  const derive = useEditorStore((s) => s.derive);
  const duplicateNode = useEditorStore((s) => s.duplicateNode);
  const deleteNodes = useEditorStore((s) => s.deleteNodes);
  const enqueue = useJobsStore((s) => s.enqueue);
  const cancel = useJobsStore((s) => s.cancel);
  const activeJob = useJobsStore((s) =>
    s.jobs.find((j) => j.nodeId === node.id && (j.status === "queued" || j.status === "running")),
  );

  const run = (mode: "image" | "video", label: string) => {
    const id = derive({ sourceId: node.id, mode, createdBy: "user" });
    if (id) enqueue(id, `${label} · ${node.id}`, mode === "video" ? 7 : 1);
  };

  if (node.status === "queued" || node.status === "running") {
    return (
      <Frame>
        <Chip className="px-2.5" onClick={() => activeJob && cancel(activeJob.id)}>
          {node.status === "queued" ? "Cancel" : "Stop — may complete"}
        </Chip>
      </Frame>
    );
  }

  const isText = node.type === "text";
  return (
    <Frame>
      {!isText && (
        <>
          <Chip className="px-2.5" onClick={() => run("image", "Vary")}>
            Vary
          </Chip>
          <Chip className="px-2.5" disabled title="M2">
            Upscale
          </Chip>
          <Chip className="px-2.5" disabled title="M2">
            Crop
          </Chip>
        </>
      )}
      <Chip className="px-2.5" disabled title="M2">
        Edit
      </Chip>
      {!isText && (
        <>
          <Chip className="px-2.5" onClick={() => run("video", "To video")}>
            To video
          </Chip>
          <Chip className="px-2.5" disabled title="M2">
            Download
          </Chip>
        </>
      )}
      <Chip className="px-2.5" onClick={() => duplicateNode(node.id)}>
        Duplicate
      </Chip>
      <Chip className="px-2.5 text-destructive" onClick={() => deleteNodes([node.id])}>
        Delete
      </Chip>
      <InfoPopover node={node} />
    </Frame>
  );
}

function Frame({ children }: { children: React.ReactNode }) {
  return (
    <div className="para-rise flex h-[var(--para-h-control)] items-center gap-0.5 rounded-xl border border-border bg-popover px-1 shadow-ambient-md">
      {children}
    </div>
  );
}

/** On-demand metadata (B): model · params · cost · time · source. Replaces what a drawer would have held. */
function InfoPopover({ node }: { node: WorkspaceNode }) {
  const row = (k: string, v: string | undefined) =>
    v ? (
      <div className="flex justify-between gap-6 py-0.5 text-label">
        <span className="text-muted-foreground">{k}</span>
        <span className="text-foreground">{v}</span>
      </div>
    ) : null;
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Chip aria-label="More">
          <MoreHorizontal className="size-3.5" />
        </Chip>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-60 p-3">
        <div className="mb-1.5 font-medium text-foreground text-label">Info</div>
        {row("Type", node.type)}
        {row("Status", node.status)}
        {row("Model", node.generator?.model)}
        {row("Count", node.generator?.count?.toString())}
        {row("Source", node.sourceNodeIds?.join(", "))}
        {row("Created by", node.createdBy)}
        {row(
          "Cost",
          node.cost?.actual !== undefined
            ? `✦${node.cost.actual}`
            : node.cost?.estimated !== undefined
              ? `≈ ✦${node.cost.estimated}`
              : undefined,
        )}
        {row(
          "Finished",
          node.finishedAt ? new Date(node.finishedAt).toLocaleTimeString() : undefined,
        )}
        {row("Job", node.jobId)}
      </PopoverContent>
    </Popover>
  );
}
