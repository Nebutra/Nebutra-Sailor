"use client";

import { MagnifyingGlass, SidebarLeft } from "@nebutra/icons";
import { Input } from "@nebutra/ui/primitives";
import { useReactFlow } from "@xyflow/react";
import { useState } from "react";
import { ASSET_MIME } from "@/components/canvas/canvas-view";
import { NodeGlyph } from "@/components/canvas/node-glyph";
import { AsyncSurface } from "@/components/ui/async-surface";
import { Chip } from "@/components/ui/chip";
import { nodeTitle } from "@/domain/nodes";
import type { Asset, NodeStatus } from "@/domain/types";
import { useAssets } from "@/mock/queries";
import { viewCenter } from "@/stores/canvas-geometry";
import { useEditorStore } from "@/stores/editor-store";
import { placeAsset } from "@/stores/place-asset";
import { useUiStore } from "@/stores/ui-store";

type Tab = "canvas" | "assets";
type Kind = "all" | "image" | "video";

const STATUS: Partial<Record<NodeStatus, string>> = {
  queued: "排队中",
  running: "生成中",
  failed: "失败",
};

/**
 * 资产管理 — the left outliner (LibTV): 画布 lists every node on this canvas (click to find it),
 * 资产 lists the account's media (click or drag to place it). One search box filters both.
 */
export function AssetsPanel({ projectId }: { projectId: string }) {
  const setAssetsOpen = useUiStore((s) => s.setAssetsOpen);
  const [tab, setTab] = useState<Tab>("canvas");
  const [q, setQ] = useState("");

  return (
    <aside
      aria-label="资产管理"
      style={{ "--para-drawer-from": "-12px" } as React.CSSProperties}
      className="para-drawer-enter flex w-[var(--para-drawer-w)] shrink-0 flex-col border-border/60 border-r bg-background"
    >
      <div className="flex h-11 items-center justify-between px-3">
        <span className="px-1 font-medium text-body text-foreground">资产管理</span>
        <Chip
          tone="muted"
          aria-label="收起资产管理"
          onClick={() => setAssetsOpen(false)}
          className="size-8 justify-center p-0"
        >
          <SidebarLeft className="size-4" />
        </Chip>
      </div>
      <div className="flex items-center gap-0.5 px-3 pb-2">
        <Chip
          pressed={tab === "canvas"}
          aria-pressed={tab === "canvas"}
          onClick={() => setTab("canvas")}
          tone="muted"
        >
          画布
        </Chip>
        <Chip
          pressed={tab === "assets"}
          aria-pressed={tab === "assets"}
          onClick={() => setTab("assets")}
          tone="muted"
        >
          资产
        </Chip>
      </div>
      <div className="px-3 pb-3">
        <Input
          aria-label="搜索"
          placeholder={tab === "canvas" ? "搜索节点" : "搜索资产"}
          size="sm"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          prefix={<MagnifyingGlass className="size-3.5" />}
        />
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto px-3 pb-6">
        {tab === "canvas" ? <NodeList q={q} /> : <AssetGrid q={q} projectId={projectId} />}
      </div>
    </aside>
  );
}

function NodeList({ q }: { q: string }) {
  const nodes = useEditorStore((s) => s.document?.nodes);
  const selection = useEditorStore((s) => s.selection);
  const select = useEditorStore((s) => s.select);
  const { setCenter, getZoom } = useReactFlow();
  const list = Object.values(nodes ?? {})
    .sort((a, b) => a.y - b.y || a.x - b.x)
    .filter((n) => {
      const needle = q.trim().toLowerCase();
      if (!needle) return true;
      return (
        nodeTitle(n).toLowerCase().includes(needle) ||
        (n.generator?.prompt ?? "").toLowerCase().includes(needle)
      );
    });

  if (list.length === 0) {
    return (
      <p className="px-1 text-label text-muted-foreground">
        {q.trim() ? `没有与「${q.trim()}」匹配的节点` : "画布还是空的。双击画布添加第一个节点。"}
      </p>
    );
  }
  return (
    <ul className="flex flex-col gap-0.5">
      {list.map((n) => (
        <li key={n.id}>
          <Chip
            size="row"
            pressed={selection.includes(n.id)}
            aria-pressed={selection.includes(n.id)}
            onClick={() => {
              select([n.id]);
              void setCenter(n.x + n.width / 2, n.y + n.height / 2, {
                zoom: Math.max(getZoom(), 0.6),
                duration: 250,
              });
            }}
            className="h-9 gap-2"
          >
            <NodeGlyph type={n.type} className="size-4 text-muted-foreground" />
            <span className="min-w-0 flex-1 truncate text-left text-body">{nodeTitle(n)}</span>
            {STATUS[n.status] && (
              <span className="text-meta text-muted-foreground">{STATUS[n.status]}</span>
            )}
          </Chip>
        </li>
      ))}
    </ul>
  );
}

function AssetGrid({ q, projectId }: { q: string; projectId: string }) {
  const { data: assets, isLoading, isError, refetch } = useAssets();
  const [kind, setKind] = useState<Kind>("all");
  const needle = q.trim().toLowerCase();
  const list = (assets ?? [])
    .filter((a) => a.type !== "audio")
    .filter((a) => kind === "all" || a.type === kind)
    .filter((a) => !a.projectId || a.projectId === projectId || a.origin === "upload")
    .filter((a) => !needle || a.label.toLowerCase().includes(needle));

  const place = (asset: Asset) => placeAsset(asset, viewCenter());

  return (
    <>
      <div className="flex gap-0.5 pb-2">
        {(
          [
            ["all", "全部"],
            ["image", "图片"],
            ["video", "视频"],
          ] as const
        ).map(([k, label]) => (
          <Chip
            key={k}
            tone="muted"
            pressed={kind === k}
            aria-pressed={kind === k}
            onClick={() => setKind(k)}
          >
            {label}
          </Chip>
        ))}
      </div>
      <AsyncSurface
        query={{ isLoading, isError, refetch }}
        isEmpty={list.length === 0}
        skeleton={
          <div className="grid grid-cols-2 gap-2">
            {Array.from({ length: 6 }, (_, i) => (
              <div key={i} className="aspect-square animate-pulse rounded-lg bg-card" />
            ))}
          </div>
        }
        errorTitle="资产加载失败"
        empty={
          <p className="px-1 text-label text-muted-foreground">
            {needle ? `没有与「${q.trim()}」匹配的资产` : "上传或生成的图片和视频会出现在这里。"}
          </p>
        }
      >
        <div className="grid grid-cols-2 gap-2">
          {list.map((a) => (
            <Chip
              key={a.id}
              title={`放到画布：${a.label}`}
              draggable
              onDragStart={(e) => e.dataTransfer.setData(ASSET_MIME, a.id)}
              onClick={() => place(a)}
              className="relative aspect-square h-auto overflow-hidden rounded-lg bg-neutral-3 p-0 hover:opacity-90"
            >
              <img
                src={a.url}
                alt={a.label}
                className="h-full w-full object-cover"
                draggable={false}
              />
              <span className="absolute bottom-1 left-1 rounded-sm bg-background/70 px-1 text-meta text-foreground">
                {a.type === "video" ? "视频" : "图片"}
              </span>
            </Chip>
          ))}
        </div>
      </AsyncSurface>
    </>
  );
}
