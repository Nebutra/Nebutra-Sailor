"use client";

import { Cross, MagnifyingGlass } from "@nebutra/icons";
import { Input } from "@nebutra/ui/primitives";
import { useState } from "react";
import { ASSET_MIME } from "@/components/canvas/canvas-view";
import type { Asset } from "@/domain/types";
import { useAssets } from "@/mock/queries";
import { nextId, useEditorStore } from "@/stores/editor-store";
import { useUiStore } from "@/stores/ui-store";

const SIZE: Record<Asset["aspect"], [number, number]> = {
  "16:9": [320, 180],
  "1:1": [220, 220],
  "9:16": [180, 320],
  "4:3": [280, 210],
};

type Tab = "generated" | "assets";

/**
 * Left, 300px, non-modal, closed by default (A). Two tabs: Generated (this workspace | whole project) and Assets (A).
 * Every item: click = Apply to canvas (A); drag onto the canvas creates a node (A).
 */
export function LibraryDrawer({
  projectId,
  workspaceId,
}: {
  projectId: string;
  workspaceId: string;
}) {
  const setDrawer = useUiStore((s) => s.setDrawer);
  const addNode = useEditorStore((s) => s.addNode);
  const select = useEditorStore((s) => s.select);
  const document = useEditorStore((s) => s.document);
  const { data: assets } = useAssets();
  const [tab, setTab] = useState<Tab>("generated");
  const [wholeProject, setWholeProject] = useState(false);
  const [q, setQ] = useState("");

  const place = (asset: Asset) => {
    if (!document || asset.type === "audio") return;
    const [width, height] = SIZE[asset.aspect];
    const vp = document.viewport;
    const id = nextId();
    addNode({
      id,
      type: asset.type,
      assetId: asset.id,
      status: "completed",
      createdBy: "import",
      x: (-vp.x + 480) / vp.zoom,
      y: (-vp.y + 240) / vp.zoom,
      width,
      height,
    });
    select([id]);
  };

  const generatedNodes = new Set(
    Object.values(document?.nodes ?? {}).flatMap((n) =>
      n.type !== "text" && n.assetId ? [n.assetId] : [],
    ),
  );
  const list = (assets ?? [])
    .filter((a) => a.label.toLowerCase().includes(q.toLowerCase()))
    .filter((a) =>
      tab === "assets"
        ? a.origin === "upload"
        : a.origin === "generated" &&
          (wholeProject
            ? a.projectId === projectId
            : a.workspaceId === workspaceId || generatedNodes.has(a.id)),
    );

  const tabBtn = (t: Tab, label: string) => (
    <button
      type="button"
      onClick={() => setTab(t)}
      aria-pressed={tab === t}
      className="h-7 rounded-md px-2.5 text-muted-foreground text-xs hover:text-foreground aria-pressed:bg-accent aria-pressed:text-foreground"
    >
      {label}
    </button>
  );

  return (
    <aside
      style={{ "--para-drawer-from": "-12px" } as React.CSSProperties}
      className="para-drawer-enter flex w-[var(--para-drawer-w)] shrink-0 flex-col border-border/60 border-r bg-background"
    >
      <div className="flex h-11 items-center justify-between px-4">
        <span className="font-medium text-foreground text-sm">Library</span>
        <button
          type="button"
          aria-label="Close library"
          onClick={() => setDrawer(null)}
          className="flex size-7 items-center justify-center rounded-md text-muted-foreground hover:bg-accent hover:text-foreground"
        >
          <Cross className="size-3.5" />
        </button>
      </div>
      <div className="flex items-center gap-0.5 px-3 pb-2">
        {tabBtn("generated", "Generated")}
        {tabBtn("assets", "Assets")}
        <div className="flex-1" />
        {tab === "generated" && (
          <button
            type="button"
            onClick={() => setWholeProject((v) => !v)}
            className="h-7 rounded-md px-2 text-[11px] text-muted-foreground hover:text-foreground"
          >
            {wholeProject ? "Whole project" : "This workspace"}
          </button>
        )}
      </div>
      <div className="px-3 pb-3">
        <Input
          aria-label="Search library"
          placeholder="Search"
          size="sm"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          prefix={<MagnifyingGlass className="size-3.5" />}
        />
      </div>
      <div className="flex-1 overflow-y-auto px-3 pb-6">
        {list.length === 0 ? (
          <p className="px-1 text-muted-foreground text-xs">
            {tab === "generated"
              ? "Nothing generated here yet."
              : "Drop files on the canvas to add assets."}
          </p>
        ) : (
          <div className="grid grid-cols-3 gap-2">
            {list.map((a) => (
              <button
                key={a.id}
                type="button"
                title={`Apply ${a.label} to canvas`}
                draggable
                onDragStart={(e) => e.dataTransfer.setData(ASSET_MIME, a.id)}
                onClick={() => place(a)}
                className="aspect-square overflow-hidden rounded-md bg-neutral-3 ring-border/0 transition hover:ring-2 hover:ring-neutral-7"
              >
                <img
                  src={a.url}
                  alt={a.label}
                  className="h-full w-full object-cover"
                  draggable={false}
                />
              </button>
            ))}
          </div>
        )}
      </div>
    </aside>
  );
}
