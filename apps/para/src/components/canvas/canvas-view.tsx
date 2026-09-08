"use client";

import { type DragEvent, type PointerEvent as ReactPointerEvent, useEffect, useRef } from "react";
import { api } from "@/mock/queries";
import { nextId, useEditorStore } from "@/stores/editor-store";
import { useUiStore } from "@/stores/ui-store";
import { ContextToolbar } from "./context-toolbar";
import { MediaNode } from "./media-node";
import { NodeConfig } from "./node-config";
import { NodeContextMenu } from "./node-context-menu";
import { SelectionFrame } from "./selection-frame";

const ASSET_MIME = "application/x-para-asset";

/**
 * Canvas: pan, zoom, select, move, delete, drop. No grid, no edges rendered (M1), no toolbar at rest (A).
 * Selection reveals ContextToolbar above + NodeConfig under the node, and feeds the agent composer a chip (A).
 * Wheel pans; Cmd/Ctrl+wheel (trackpad pinch) zooms about the cursor.
 */
export function CanvasView() {
  const document = useEditorStore((s) => s.document);
  const selection = useEditorStore((s) => s.selection);
  const select = useEditorStore((s) => s.select);
  const toggleSelect = useEditorStore((s) => s.toggleSelect);
  const clearSelection = useEditorStore((s) => s.clearSelection);
  const panBy = useEditorStore((s) => s.panBy);
  const zoomAt = useEditorStore((s) => s.zoomAt);
  const moveNode = useEditorStore((s) => s.moveNode);
  const deleteNodes = useEditorStore((s) => s.deleteNodes);
  const addNode = useEditorStore((s) => s.addNode);
  const addContextNode = useUiStore((s) => s.addContextNode);

  const surfaceRef = useRef<HTMLDivElement>(null);
  const drag = useRef<{
    kind: "pan" | "node";
    id?: string;
    lastX: number;
    lastY: number;
    moved: boolean;
  } | null>(null);

  // Native listener: React's wheel handler is passive and cannot preventDefault.
  useEffect(() => {
    const el = surfaceRef.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const rect = el.getBoundingClientRect();
      if (e.ctrlKey || e.metaKey)
        zoomAt(Math.exp(-e.deltaY * 0.01), e.clientX - rect.left, e.clientY - rect.top);
      else panBy(-e.deltaX, -e.deltaY);
    };
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, [panBy, zoomAt]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement | null;
      if (t && (t.tagName === "INPUT" || t.tagName === "TEXTAREA" || t.isContentEditable)) return;
      if ((e.key === "Delete" || e.key === "Backspace") && selection.length) {
        e.preventDefault();
        deleteNodes(selection);
      }
      if (e.key === "Escape" && selection.length) clearSelection();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [selection, deleteNodes, clearSelection]);

  if (!document) return <div className="h-full w-full" />;
  const { viewport, nodes } = document;

  const toCanvas = (clientX: number, clientY: number) => {
    const rect = surfaceRef.current?.getBoundingClientRect();
    const sx = clientX - (rect?.left ?? 0);
    const sy = clientY - (rect?.top ?? 0);
    return { x: (sx - viewport.x) / viewport.zoom, y: (sy - viewport.y) / viewport.zoom };
  };

  const onSurfaceDown = (e: ReactPointerEvent<HTMLDivElement>) => {
    if (e.button !== 0 || e.target !== e.currentTarget) return;
    drag.current = { kind: "pan", lastX: e.clientX, lastY: e.clientY, moved: false };
    e.currentTarget.setPointerCapture(e.pointerId);
  };

  const onNodeDown = (id: string) => (e: ReactPointerEvent<HTMLDivElement>) => {
    if (e.button !== 0) return;
    e.stopPropagation();
    if (e.shiftKey) toggleSelect(id);
    else if (!selection.includes(id)) select([id]);
    drag.current = { kind: "node", id, lastX: e.clientX, lastY: e.clientY, moved: false };
    surfaceRef.current?.setPointerCapture(e.pointerId);
  };

  const onMove = (e: ReactPointerEvent<HTMLDivElement>) => {
    const d = drag.current;
    if (!d) return;
    const dx = e.clientX - d.lastX;
    const dy = e.clientY - d.lastY;
    d.lastX = e.clientX;
    d.lastY = e.clientY;
    if (dx || dy) d.moved = true;
    if (d.kind === "pan") panBy(dx, dy);
    else if (d.id) moveNode(d.id, dx / viewport.zoom, dy / viewport.zoom);
  };

  const onUp = () => {
    const d = drag.current;
    drag.current = null;
    if (!d) return;
    if (d.kind === "pan" && !d.moved) clearSelection();
    // Selection → agent composer chip, accumulating (A).
    if (d.kind === "node" && !d.moved && d.id) addContextNode(d.id);
  };

  // Drop: from the Library drawer (asset id) or a file from the OS (upload → asset + node) — both A.
  const onDrop = async (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    const at = toCanvas(e.clientX, e.clientY);
    const assetId = e.dataTransfer.getData(ASSET_MIME);
    if (assetId) {
      addNode({
        id: nextId(),
        type: "image",
        assetId,
        status: "completed",
        createdBy: "import",
        x: at.x,
        y: at.y,
        width: 320,
        height: 180,
      });
      return;
    }
    const file = e.dataTransfer.files?.[0];
    if (file?.type.startsWith("image/") || file?.type.startsWith("video/")) {
      const type = file.type.startsWith("video/") ? "video" : "image";
      const asset = await api.createAsset({
        type,
        url: URL.createObjectURL(file),
        label: file.name,
        aspect: "16:9",
        origin: "upload",
      });
      addNode({
        id: nextId(),
        type,
        assetId: asset.id,
        status: "completed",
        createdBy: "import",
        x: at.x,
        y: at.y,
        width: 320,
        height: 180,
      });
    }
  };

  const selectedId = selection.length === 1 ? selection[0] : undefined;
  const selected = selectedId ? nodes[selectedId] : undefined;

  return (
    <div
      ref={surfaceRef}
      className="para-surface relative h-full w-full cursor-default overflow-hidden bg-background"
      onPointerDown={onSurfaceDown}
      onPointerMove={onMove}
      onPointerUp={onUp}
      onPointerCancel={onUp}
      onDragOver={(e) => e.preventDefault()}
      onDrop={onDrop}
    >
      <div
        className="absolute top-0 left-0 origin-top-left"
        style={{ transform: `translate(${viewport.x}px, ${viewport.y}px) scale(${viewport.zoom})` }}
      >
        {Object.values(nodes).map((node) => {
          const isSelected = selection.includes(node.id);
          return (
            <NodeContextMenu key={node.id} nodeId={node.id}>
              <div
                data-node-id={node.id}
                className="para-node absolute"
                style={{ left: node.x, top: node.y, width: node.width, height: node.height }}
                onPointerDown={onNodeDown(node.id)}
              >
                <MediaNode node={node} selected={isSelected} />
                {isSelected && <SelectionFrame />}
              </div>
            </NodeContextMenu>
          );
        })}
      </div>

      {selected && (
        <>
          <div
            className="absolute"
            style={{
              left: viewport.x + (selected.x + selected.width / 2) * viewport.zoom,
              top: viewport.y + selected.y * viewport.zoom - 48,
              transform: "translateX(-50%)",
            }}
            onPointerDown={(e) => e.stopPropagation()}
          >
            <ContextToolbar node={selected} />
          </div>
          <div
            className="absolute"
            style={{
              left: viewport.x + (selected.x + selected.width / 2) * viewport.zoom,
              top: viewport.y + (selected.y + selected.height) * viewport.zoom + 12,
              transform: "translateX(-50%)",
            }}
            onPointerDown={(e) => e.stopPropagation()}
          >
            <NodeConfig key={selected.id} node={selected} />
          </div>
        </>
      )}

      <div className="pointer-events-none absolute right-3 bottom-3 text-[11px] text-muted-foreground tabular-nums opacity-60">
        {Math.round(viewport.zoom * 100)}%
      </div>
    </div>
  );
}

export { ASSET_MIME };
