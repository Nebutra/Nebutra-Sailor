"use client";

import { SortDescending } from "@nebutra/icons";
import { Dialog, DialogContent, DialogTitle } from "@nebutra/ui/primitives";
import { useState } from "react";
import { AsyncSurface } from "@/components/ui/async-surface";
import { Chip } from "@/components/ui/chip";
import type { Asset, AssetType } from "@/domain/types";
import { useAssets } from "@/mock/queries";
import { viewCenter } from "@/stores/canvas-geometry";
import { useEditorStore } from "@/stores/editor-store";
import { placeAsset } from "@/stores/place-asset";
import { useUiStore } from "@/stores/ui-store";

type Scope = "canvas" | "project";

const TYPES: ReadonlyArray<[AssetType, string]> = [
  ["image", "图片"],
  ["video", "视频"],
  ["audio", "音频"],
];

/** Which generated assets belong to `scope`, newest first. Pure, so the list rule is testable. */
export function historyItems(
  assets: readonly Asset[],
  scope: Scope,
  where: { projectId: string; workspaceId: string; nodeAssetIds: ReadonlySet<string> },
): Asset[] {
  return assets
    .filter((a) => a.origin === "generated")
    .filter((a) =>
      scope === "canvas"
        ? a.workspaceId === where.workspaceId || where.nodeAssetIds.has(a.id)
        : a.projectId === where.projectId || where.nodeAssetIds.has(a.id),
    )
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

/**
 * 生成历史 — every output generated on this canvas (本画布) or anywhere in the project (全部画布),
 * newest first, by type. Picking one puts it back on the canvas as a node (从生成历史选择).
 */
export function HistoryDialog({
  projectId,
  workspaceId,
}: {
  projectId: string;
  workspaceId: string;
}) {
  const open = useUiStore((s) => s.historyOpen);
  const setOpen = useUiStore((s) => s.setHistoryOpen);
  const nodes = useEditorStore((s) => s.document?.nodes);
  const { data: assets, isLoading, isError, refetch } = useAssets();
  const [scope, setScope] = useState<Scope>("canvas");
  const [type, setType] = useState<AssetType>("image");

  const nodeAssetIds = new Set(
    Object.values(nodes ?? {}).flatMap((n) =>
      n.type !== "text" ? (n.outputs ?? []).map((o) => o.assetId) : [],
    ),
  );
  const scoped = historyItems(assets ?? [], scope, { projectId, workspaceId, nodeAssetIds });
  const list = scoped.filter((a) => a.type === type);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="flex h-[80vh] bg-popover w-[min(1200px,92vw)] max-w-none flex-col gap-0 p-0">
        <div className="flex h-16 shrink-0 items-center border-border/60 border-b px-6">
          <DialogTitle className="font-medium text-display text-foreground">生成历史</DialogTitle>
        </div>
        <div className="flex shrink-0 items-center gap-4 px-6 py-4">
          <div className="flex rounded-lg bg-accent/50 p-0.5">
            {(
              [
                ["canvas", "本画布"],
                ["project", "全部画布"],
              ] as const
            ).map(([s, label]) => (
              <Chip
                key={s}
                tone="muted"
                pressed={scope === s}
                aria-pressed={scope === s}
                onClick={() => setScope(s)}
                className="px-3 aria-pressed:bg-background"
              >
                {label}
              </Chip>
            ))}
          </div>
          <span aria-hidden="true" className="h-4 w-px bg-border" />
          <div className="flex gap-1">
            {TYPES.map(([t, label]) => (
              <Chip
                key={t}
                tone="muted"
                pressed={type === t}
                aria-pressed={type === t}
                onClick={() => setType(t)}
              >
                {label}
                <span className="rounded-sm bg-accent px-1 text-meta tabular-nums">
                  {scoped.filter((a) => a.type === t).length}
                </span>
              </Chip>
            ))}
          </div>
          <div className="flex-1" />
          <span className="flex items-center gap-1 text-label text-muted-foreground">
            <SortDescending aria-hidden="true" className="size-3.5" />
            时间倒序
          </span>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto px-6 pb-6">
          <AsyncSurface
            query={{ isLoading, isError, refetch }}
            isEmpty={list.length === 0}
            skeleton={
              <div className="grid grid-cols-5 gap-3">
                {Array.from({ length: 10 }, (_, i) => (
                  <div key={i} className="aspect-square animate-pulse rounded-lg bg-card" />
                ))}
              </div>
            }
            errorTitle="生成历史加载失败"
            empty={
              <div className="flex h-60 items-center justify-center text-body text-muted-foreground">
                {scope === "canvas" ? "这个画布还没有生成过" : "这个项目还没有生成过"}
                {TYPES.find(([t]) => t === type)?.[1]}
              </div>
            }
          >
            <div className="grid grid-cols-5 gap-3">
              {list.map((a) => (
                <Chip
                  key={a.id}
                  title={`放到画布：${a.label}`}
                  onClick={() => {
                    placeAsset(a, viewCenter());
                    setOpen(false);
                  }}
                  className="group flex h-auto flex-col items-stretch gap-1.5 rounded-xl p-1.5 text-left"
                >
                  <span className="aspect-square overflow-hidden rounded-lg bg-neutral-3">
                    <img
                      src={a.url}
                      alt={a.label}
                      className="h-full w-full object-cover transition-transform group-hover:scale-[1.02]"
                    />
                  </span>
                  <span className="truncate px-0.5 text-label text-muted-foreground">
                    {a.label}
                  </span>
                </Chip>
              ))}
            </div>
          </AsyncSurface>
        </div>
      </DialogContent>
    </Dialog>
  );
}
