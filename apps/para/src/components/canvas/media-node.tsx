"use client";

import { Image, MusicalNotes, PlayFill } from "@nebutra/icons";
import Link from "next/link";
import type { Asset, WorkspaceNode } from "@/domain/types";
import { useAsset } from "@/mock/queries";

const VIDEO_FILE = /\.(mp4|webm|mov|m4v)(\?|$)/i;

/**
 * The frame of a node — what it holds, and nothing else. The label sits outside, above (ParaNode).
 *
 * Empty generators read as LibTV's do: a quiet card with the type's mark in the middle (a large
 * play triangle for video), so a fresh 首帧 → 视频 pair is legible before anything is generated.
 * With an output the frame is the media, full-bleed, with a small AI 生成 mark.
 *
 * In flight there is no progress bar and no spinner — a text state over the placeholder, because a
 * determinate bar over a generation with no determinate progress is a lie the surface tells
 * (docs/product-intelligence/visual-language.md §4).
 */
export function MediaNode({ node }: { node: WorkspaceNode }) {
  const asset = useAsset(node.type === "text" ? undefined : node.assetId);
  const busy = node.status === "queued" || node.status === "running";

  if (node.type === "text") {
    const empty = !node.text.trim();
    return (
      <div className="relative h-full w-full overflow-hidden rounded-[var(--para-node-radius)] border border-border/60 bg-card">
        <div className="h-full overflow-hidden whitespace-pre-wrap px-4 py-3 text-body text-foreground leading-relaxed">
          {empty ? (
            <span className="text-muted-foreground">
              {node.generator?.prompt ? "确认下方的提示词后点击生成" : "在下方描述你想写的内容"}
            </span>
          ) : (
            node.text
          )}
        </div>
        {busy && <TaskState node={node} />}
        {node.status === "failed" && <Failure node={node} />}
      </div>
    );
  }

  return (
    <div
      className={`relative h-full w-full overflow-hidden rounded-[var(--para-node-radius)] ${
        asset ? "bg-neutral-3" : "border border-border/60 bg-card"
      }`}
    >
      {asset ? <Media asset={asset} /> : <Placeholder type={node.type} />}
      {asset && node.type === "video" && !busy && (
        // allow-palette: play-state scrim over arbitrary footage, must read on any frame
        <span className="-translate-x-1/2 -translate-y-1/2 absolute top-1/2 left-1/2 flex size-12 items-center justify-center rounded-full bg-black/45 text-white">
          <PlayFill className="size-5" />
        </span>
      )}
      {asset?.origin === "generated" && (
        <span className="absolute top-2.5 left-2.5 rounded-sm border border-foreground/30 bg-background/30 px-1 text-meta text-foreground/80 backdrop-blur-sm">
          AI 生成
        </span>
      )}
      {busy && <TaskState node={node} />}
      {node.status === "failed" && <Failure node={node} />}
    </div>
  );
}

function Media({ asset }: { asset: Asset }) {
  if (asset.type === "video" && VIDEO_FILE.test(asset.url)) {
    return (
      <video
        src={asset.url}
        muted
        playsInline
        preload="metadata"
        className="pointer-events-none h-full w-full object-cover"
      />
    );
  }
  if (asset.type === "audio") return <Placeholder type="audio" />;
  return (
    <img
      src={asset.url}
      alt={asset.label}
      draggable={false}
      className="pointer-events-none h-full w-full object-cover"
    />
  );
}

function Placeholder({ type }: { type: "image" | "video" | "audio" }) {
  return (
    <div className="flex h-full w-full items-center justify-center text-neutral-7">
      {type === "video" ? (
        <PlayFill aria-hidden="true" className="size-12" />
      ) : type === "audio" ? (
        <MusicalNotes aria-hidden="true" className="size-9" />
      ) : (
        <Image aria-hidden="true" className="size-10" />
      )}
    </div>
  );
}

/** A placeholder fill and a text pill. No bar, no spinner. */
function TaskState({ node }: { node: WorkspaceNode }) {
  const running = node.status === "running";
  return (
    <div className="absolute inset-0 flex items-end justify-between bg-neutral-2/85 p-3">
      <span className="rounded-md bg-popover px-2 py-0.5 text-foreground text-label">
        {running
          ? "生成中…"
          : `排队中${node.queuePosition ? ` · 第 ${node.queuePosition} 位` : ""}`}
      </span>
      {node.cost?.estimated !== undefined && (
        <span className="text-label text-muted-foreground tabular-nums">
          ⚡{node.cost.estimated}
        </span>
      )}
    </div>
  );
}

function Failure({ node }: { node: WorkspaceNode }) {
  return (
    <div className="absolute inset-0 flex flex-col items-start justify-end gap-0.5 bg-background/75 p-3">
      <span className="text-destructive-strong text-label">
        {node.error?.message ?? "生成失败"}
      </span>
      {node.error?.type === "insufficient_credits" ? (
        <Link
          href="/pro"
          // The canvas treats a pointer-down as the start of a drag or a selection.
          onPointerDown={(e) => e.stopPropagation()}
          className="text-foreground text-label underline underline-offset-2"
        >
          获取积分
        </Link>
      ) : (
        <span className="text-meta text-muted-foreground">修改设置后可重新生成</span>
      )}
    </div>
  );
}
