"use client";

// @async-surface-exempt: reads assets only to draw thumbnails of nodes already on the canvas; the columns are the document, not a query.

import { FileText, PlayFill } from "@nebutra/icons";
import { Chip } from "@/components/ui/chip";
import { NODE_TYPE_LABEL, nodeTitle } from "@/domain/nodes";
import type { WorkspaceNode } from "@/domain/types";
import { useAssets } from "@/mock/queries";
import { useEditorStore } from "@/stores/editor-store";
import { NodeGlyph } from "./node-glyph";

type Column = WorkspaceNode["type"];
const COLUMNS: readonly Column[] = ["text", "image", "video", "audio"];

/**
 * 故事板 — the same graph grouped by type into columns (LibTV 工作流 ↔ 故事板). Not a second document:
 * picking an item selects that node, and switching back to 工作流 shows it selected.
 * Order inside a column follows the canvas, top-to-bottom then left-to-right.
 */
export function StoryboardView() {
  const document = useEditorStore((s) => s.document);
  const selection = useEditorStore((s) => s.selection);
  const select = useEditorStore((s) => s.select);
  const { data: assetList } = useAssets();
  if (!document) return null;

  const all = Object.values(document.nodes).sort((a, b) => a.y - b.y || a.x - b.x);
  const columns = COLUMNS.filter((c) => c !== "audio" || all.some((n) => n.type === "audio"));
  const urlOf = (n: WorkspaceNode) =>
    n.type !== "text" && n.assetId ? assetList?.find((a) => a.id === n.assetId)?.url : undefined;

  return (
    <div className="flex h-full w-full gap-3 overflow-x-auto bg-background px-4 pt-20 pb-4">
      {columns.map((type) => {
        const items = all.filter((n) => n.type === type);
        return (
          <section
            key={type}
            aria-label={NODE_TYPE_LABEL[type]}
            className="flex min-w-72 flex-1 flex-col overflow-hidden rounded-2xl border border-border/60 bg-card"
          >
            <header className="flex h-12 shrink-0 items-center justify-between px-4">
              <span className="font-medium text-body text-foreground">{NODE_TYPE_LABEL[type]}</span>
              <span className="text-label text-muted-foreground tabular-nums">{items.length}</span>
            </header>
            <div className="flex min-h-0 flex-1 flex-col gap-1 overflow-y-auto px-3 pb-3">
              {items.length === 0 && (
                <p className="px-1 py-2 text-label text-muted-foreground">
                  画布上还没有{NODE_TYPE_LABEL[type]}节点
                </p>
              )}
              {items.map((n) => {
                const picked = selection.includes(n.id);
                if (type === "text") {
                  return (
                    <Chip
                      key={n.id}
                      size="row"
                      pressed={picked}
                      aria-pressed={picked}
                      onClick={() => select([n.id])}
                      className="h-10 gap-2.5 text-body"
                    >
                      <FileText aria-hidden="true" className="size-4 text-muted-foreground" />
                      <span className="truncate">{nodeTitle(n)}</span>
                    </Chip>
                  );
                }
                const url = urlOf(n);
                const p = n.generator?.params ?? {};
                const facts = [
                  n.type === "video" && typeof p.duration === "number" ? `${p.duration}秒` : null,
                  typeof p.aspect === "string" ? p.aspect : null,
                  typeof p.resolution === "string" ? p.resolution : null,
                ].filter(Boolean);
                return (
                  <Chip
                    key={n.id}
                    pressed={picked}
                    aria-pressed={picked}
                    onClick={() => select([n.id])}
                    className="flex h-auto flex-col items-stretch gap-2 rounded-xl p-2 text-left"
                  >
                    <span className="text-label text-muted-foreground">{nodeTitle(n)}</span>
                    <span className="relative flex aspect-video w-full max-w-80 items-center justify-center overflow-hidden rounded-lg bg-neutral-3 text-neutral-7">
                      {url ? (
                        <img src={url} alt={nodeTitle(n)} className="h-full w-full object-cover" />
                      ) : (
                        <NodeGlyph type={n.type} className="size-8" />
                      )}
                      {url && n.type === "video" && (
                        // allow-palette: play-state scrim over arbitrary footage
                        <span className="absolute flex size-9 items-center justify-center rounded-full bg-black/45 text-white">
                          <PlayFill className="size-4" />
                        </span>
                      )}
                    </span>
                    {facts.length > 0 && (
                      <span className="flex gap-3 text-meta text-muted-foreground tabular-nums">
                        {facts.map((f) => (
                          <span key={f}>{f}</span>
                        ))}
                      </span>
                    )}
                  </Chip>
                );
              })}
            </div>
          </section>
        );
      })}
    </div>
  );
}
