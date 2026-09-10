"use client";

import {
  Background,
  BackgroundVariant,
  type Edge as FlowEdge,
  type NodeChange,
  type OnSelectionChangeParams,
  ReactFlow,
  ReactFlowProvider,
  useReactFlow,
  type Viewport,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { type DragEvent, useCallback, useEffect, useMemo, useRef } from "react";
import type { WorkspaceNode } from "@/domain/types";
import { api } from "@/mock/queries";
import { nextId, useEditorStore } from "@/stores/editor-store";
import { useUiStore } from "@/stores/ui-store";
import { ContextToolbar } from "./context-toolbar";
import { NodeConfig } from "./node-config";
import { NodeContextMenu } from "./node-context-menu";
import { PARA_NODE_TYPE, type ParaFlowNode, ParaNode } from "./para-node";

const ASSET_MIME = "application/x-para-asset";
const NODE_TYPES = { [PARA_NODE_TYPE]: ParaNode };
const PRO_OPTIONS = { hideAttribution: true };

/**
 * The canvas, rendered by React Flow rather than a hand-written transform layer
 * (ADR 2026-09-09 para-canvas-renderer). React Flow owns pan, zoom, drag, marquee selection,
 * viewport culling and edges; PARA owns what a node *is* and what appears when one is selected.
 *
 * The document maps to React Flow inline rather than through `@nebutra/ui`'s graph adapter: that
 * adapter earns its keep on the cycle guard in `tryAddEdge`, and PARA's edges are provenance the
 * system writes, not wires a user draws — `nodesConnectable` is false, so there is no cycle to
 * guard against.
 *
 * Chrome is ours, not React Flow's: no built-in Controls, no MiniMap, and the dot grid is the one
 * from `shell.css`, so the visual language has a single home.
 */
export function CanvasView() {
  return (
    <ReactFlowProvider>
      <CanvasSurface />
    </ReactFlowProvider>
  );
}

function CanvasSurface() {
  const document = useEditorStore((s) => s.document);
  const selection = useEditorStore((s) => s.selection);
  const select = useEditorStore((s) => s.select);
  const moveNode = useEditorStore((s) => s.moveNode);
  const deleteNodes = useEditorStore((s) => s.deleteNodes);
  const addNode = useEditorStore((s) => s.addNode);
  const setViewport = useEditorStore((s) => s.setViewport);
  const addContextNode = useUiStore((s) => s.addContextNode);
  const { screenToFlowPosition, flowToScreenPosition } = useReactFlow();
  const wrapper = useRef<HTMLDivElement>(null);

  const nodes: ParaFlowNode[] = useMemo(() => {
    if (!document) return [];
    return Object.values(document.nodes).map((node) => ({
      id: node.id,
      type: PARA_NODE_TYPE,
      position: { x: node.x, y: node.y },
      width: node.width,
      height: node.height,
      selected: selection.includes(node.id),
      data: { node },
    }));
  }, [document, selection]);

  const edges: FlowEdge[] = useMemo(() => {
    if (!document) return [];
    return Object.values(document.edges).map((e) => ({
      id: e.id,
      source: e.source,
      target: e.target,
      // A derivation is a fact about provenance, not a wire the user drew: draw it quietly.
      animated: false,
      style: { stroke: "hsl(var(--border))", strokeWidth: 1 },
    }));
  }, [document]);

  /**
   * `nodes` is controlled from the store, so every change React Flow emits has to be applied here
   * or it does not happen — including `select`, which is what makes a click stick.
   * Positions land only when a drag ends, so one drag is one move.
   */
  const onNodesChange = useCallback(
    (changes: NodeChange<ParaFlowNode>[]) => {
      const current = useEditorStore.getState();
      let nextSelection: string[] | null = null;
      for (const change of changes) {
        if (change.type === "select") {
          const base: string[] = nextSelection ?? current.selection;
          nextSelection = change.selected
            ? base.includes(change.id)
              ? base
              : [...base, change.id]
            : base.filter((id) => id !== change.id);
        }
        if (change.type === "position" && change.dragging === false && change.position) {
          const node = current.document?.nodes[change.id];
          if (node) moveNode(change.id, change.position.x - node.x, change.position.y - node.y);
        }
        if (change.type === "remove") deleteNodes([change.id]);
      }
      if (nextSelection) select(nextSelection);
    },
    [moveNode, deleteNodes, select],
  );

  /** A single deliberate pick becomes agent context (selection.md §5); a marquee does not. */
  const onSelectionChange = useCallback(
    ({ nodes: picked }: OnSelectionChangeParams) => {
      if (picked.length === 1 && picked[0]) addContextNode(picked[0].id);
    },
    [addContextNode],
  );

  const onMoveEnd = useCallback(
    (_: unknown, viewport: Viewport) => setViewport(viewport),
    [setViewport],
  );

  // From the Library drawer, or from the OS. Both land where the pointer is.
  const onDrop = useCallback(
    async (e: DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      const at = screenToFlowPosition({ x: e.clientX, y: e.clientY });
      const assetId = e.dataTransfer.getData(ASSET_MIME);
      if (assetId) {
        addNode(place(assetId, "image", at));
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
        addNode(place(asset.id, type, at));
      }
    },
    [screenToFlowPosition, addNode],
  );

  useEffect(() => {
    const onKey = (ev: KeyboardEvent) => {
      const t = ev.target as HTMLElement | null;
      if (t && (t.tagName === "INPUT" || t.tagName === "TEXTAREA" || t.isContentEditable)) return;
      if (ev.key === "Escape" && useEditorStore.getState().selection.length) select([]);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [select]);

  const selected: WorkspaceNode | undefined =
    selection.length === 1 && selection[0] ? document?.nodes[selection[0]] : undefined;

  // Chrome anchored to a node is positioned in screen space, so it never scales with the zoom.
  const anchor = selected
    ? flowToScreenPosition({ x: selected.x + selected.width / 2, y: selected.y })
    : null;
  const anchorBottom = selected
    ? flowToScreenPosition({ x: selected.x + selected.width / 2, y: selected.y + selected.height })
    : null;
  const box = wrapper.current?.getBoundingClientRect();

  if (!document) return <div className="h-full w-full" />;

  return (
    <div
      ref={wrapper}
      className="para-surface relative h-full w-full"
      onDragOver={(e) => e.preventDefault()}
      onDrop={(e) => void onDrop(e)}
    >
      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={NODE_TYPES}
        onNodesChange={onNodesChange}
        onSelectionChange={onSelectionChange}
        onMoveEnd={onMoveEnd}
        defaultViewport={document.viewport}
        minZoom={0.25}
        maxZoom={4}
        // Trackpad two-finger scroll pans; dragging the empty pane draws a marquee. Without
        // panOnDrag pinned to the middle button these two gestures both claim a left-drag and
        // the marquee never starts.
        panOnScroll
        selectionOnDrag
        panOnDrag={[1, 2]}
        selectionKeyCode={null}
        proOptions={PRO_OPTIONS}
        // The dot grid comes from shell.css so one value describes it; React Flow draws none.
        nodesConnectable={false}
        deleteKeyCode={["Delete", "Backspace"]}
      >
        <Background variant={BackgroundVariant.Dots} gap={0} size={0} color="transparent" />
      </ReactFlow>

      {selected && anchor && anchorBottom && box && (
        <>
          <div
            className="pointer-events-auto absolute z-10"
            style={{
              left: anchor.x - box.left,
              // Clears the 11px identity label just outside the node's top edge.
              top: anchor.y - box.top - 64,
              transform: "translateX(-50%)",
            }}
          >
            <NodeContextMenu nodeId={selected.id}>
              <div>
                <ContextToolbar node={selected} />
              </div>
            </NodeContextMenu>
          </div>
          <div
            className="pointer-events-auto absolute z-10"
            style={{
              left: anchor.x - box.left,
              top: anchorBottom.y - box.top + 12,
              transform: "translateX(-50%)",
            }}
          >
            <NodeConfig key={selected.id} node={selected} />
          </div>
        </>
      )}

      <ZoomReadout />
    </div>
  );
}

function ZoomReadout() {
  const zoom = useEditorStore((s) => s.document?.viewport.zoom ?? 1);
  return (
    <div className="pointer-events-none absolute right-3 bottom-3 text-meta text-muted-foreground tabular-nums opacity-60">
      {Math.round(zoom * 100)}%
    </div>
  );
}

const SIZE = { image: { width: 320, height: 180 }, video: { width: 320, height: 180 } } as const;

function place(
  assetId: string,
  type: "image" | "video",
  at: { x: number; y: number },
): WorkspaceNode {
  return {
    id: nextId(),
    type,
    assetId,
    status: "completed",
    createdBy: "import",
    x: at.x,
    y: at.y,
    ...SIZE[type],
  };
}

export { ASSET_MIME };
