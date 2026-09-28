"use client";

import {
  Background,
  BackgroundVariant,
  type Connection,
  type EdgeChange,
  type FinalConnectionState,
  type Edge as FlowEdge,
  type NodeChange,
  type OnSelectionChangeParams,
  ReactFlow,
  useReactFlow,
  type Viewport,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import {
  type DragEvent,
  type MouseEvent as ReactMouseEvent,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import type { WorkspaceNode } from "@/domain/types";
import { uploadAsset } from "@/lib/uploads";
import { useAssets } from "@/mock/queries";
import { registerStage } from "@/stores/canvas-geometry";
import { useEditorStore } from "@/stores/editor-store";
import { placeAsset } from "@/stores/place-asset";
import { useUiStore } from "@/stores/ui-store";
import { EmptyCanvas } from "./empty-canvas";
import { NodeConfig } from "./node-config";
import { ParaEdge } from "./para-edge";
import { PARA_NODE_TYPE, type ParaFlowNode, ParaNode } from "./para-node";

// @async-surface-exempt: reads the asset list only to resolve a dragged-in asset id; the canvas is not a list surface.

const ASSET_MIME = "application/x-para-asset";
const NODE_TYPES = { [PARA_NODE_TYPE]: ParaNode };
const EDGE_TYPES = { para: ParaEdge };
const PRO_OPTIONS = { hideAttribution: true };

/**
 * The canvas, rendered by React Flow (ADR 2026-09-09 para-canvas-renderer). React Flow owns pan,
 * zoom, drag, marquee selection, culling and wires; PARA owns what a node is and what appears when
 * one is selected.
 *
 * Wires are drawn by hand now, as in LibTV: drag a node's right `+` onto another node to make it an
 * input (an image into a video is its first frame), or drop it on empty canvas to create the next
 * node there. Double-click empty canvas for the add-node menu at the pointer.
 *
 * Must render inside a ReactFlowProvider (WorkspacePage owns it, so the dock can zoom).
 */
export function CanvasView() {
  const document = useEditorStore((s) => s.document);
  const selection = useEditorStore((s) => s.selection);
  const select = useEditorStore((s) => s.select);
  const setNodePosition = useEditorStore((s) => s.setNodePosition);
  const deleteNodes = useEditorStore((s) => s.deleteNodes);
  const deleteEdges = useEditorStore((s) => s.deleteEdges);
  const connect = useEditorStore((s) => s.connect);
  const setViewport = useEditorStore((s) => s.setViewport);
  const addContextNode = useUiStore((s) => s.addContextNode);
  const openAddMenu = useUiStore((s) => s.openAddMenu);
  const tool = useUiStore((s) => s.tool);
  const { data: assetList } = useAssets();
  const { screenToFlowPosition, flowToScreenPosition } = useReactFlow();
  const wrapper = useRef<HTMLDivElement>(null);
  const [selectedEdges, setSelectedEdges] = useState<string[]>([]);
  // Node-anchored chrome is hidden mid-drag: it cannot keep up with the pointer, and measuring
  // where to put it forces a synchronous layout on every frame of the gesture.
  const [isDragging, setDragging] = useState(false);
  const [, setViewportTick] = useState(0);

  useEffect(() => {
    registerStage(wrapper.current);
    return () => registerStage(null);
  }, []);

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
      type: "para",
      selected: selectedEdges.includes(e.id),
    }));
  }, [document, selectedEdges]);

  /**
   * `nodes` is controlled from the store, so every change React Flow emits is applied here or it
   * does not happen — including `select`, which is what makes a click stick. Position is applied on
   * every frame of a drag, or the controlled prop fights the pointer.
   */
  const onNodesChange = useCallback(
    (changes: NodeChange<ParaFlowNode>[]) => {
      const current = useEditorStore.getState();
      let nextSelection: string[] | null = null;
      let dragging = false;
      for (const change of changes) {
        if (change.type === "select") {
          const base: string[] = nextSelection ?? current.selection;
          nextSelection = change.selected
            ? base.includes(change.id)
              ? base
              : [...base, change.id]
            : base.filter((id) => id !== change.id);
        }
        if (change.type === "position" && change.position) {
          setNodePosition(change.id, change.position.x, change.position.y);
          if (change.dragging) dragging = true;
        }
        if (change.type === "remove") deleteNodes([change.id]);
      }
      if (nextSelection) select(nextSelection);
      setDragging(dragging);
    },
    [setNodePosition, deleteNodes, select],
  );

  const onEdgesChange = useCallback(
    (changes: EdgeChange[]) => {
      const removed: string[] = [];
      setSelectedEdges((prev) => {
        let next = prev;
        for (const c of changes) {
          if (c.type === "select")
            next = c.selected
              ? [...next.filter((id) => id !== c.id), c.id]
              : next.filter((id) => id !== c.id);
        }
        return next;
      });
      for (const c of changes) if (c.type === "remove") removed.push(c.id);
      if (removed.length) deleteEdges(removed);
    },
    [deleteEdges],
  );

  const onConnect = useCallback(
    (c: Connection) => {
      if (c.source && c.target) connect(c.source, c.target);
    },
    [connect],
  );

  /** A wire dropped on empty canvas asks what should be there (LibTV). */
  const onConnectEnd = useCallback(
    (event: MouseEvent | TouchEvent, state: FinalConnectionState) => {
      if (state.isValid || !state.fromNode || state.fromHandle?.type !== "source") return;
      const point = "changedTouches" in event ? event.changedTouches[0] : event;
      if (!point) return;
      openAddMenu({
        screen: { x: point.clientX, y: point.clientY },
        flow: screenToFlowPosition({ x: point.clientX, y: point.clientY }),
        sourceId: state.fromNode.id,
      });
    },
    [openAddMenu, screenToFlowPosition],
  );

  /** A single deliberate pick becomes agent context (selection.md §5); a marquee does not. */
  const onSelectionChange = useCallback(
    ({ nodes: picked }: OnSelectionChangeParams) => {
      if (picked.length === 1 && picked[0]) addContextNode(picked[0].id);
    },
    [addContextNode],
  );

  const onMove = useCallback(() => setViewportTick((t) => t + 1), []);
  const onMoveEnd = useCallback(
    (_: unknown, viewport: Viewport) => setViewport(viewport),
    [setViewport],
  );

  const onDoubleClick = useCallback(
    (e: ReactMouseEvent<HTMLDivElement>) => {
      const target = e.target as HTMLElement;
      if (!target.classList.contains("react-flow__pane")) return;
      openAddMenu({
        screen: { x: e.clientX, y: e.clientY },
        flow: screenToFlowPosition({ x: e.clientX, y: e.clientY }),
      });
    },
    [openAddMenu, screenToFlowPosition],
  );

  // From the 资产管理 panel, or a file from the desktop. Both land where the pointer is.
  const onDrop = useCallback(
    async (e: DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      const at = screenToFlowPosition({ x: e.clientX, y: e.clientY });
      const assetId = e.dataTransfer.getData(ASSET_MIME);
      if (assetId) {
        const asset = assetList?.find((a) => a.id === assetId);
        if (asset) placeAsset(asset, at);
        return;
      }
      const file = e.dataTransfer.files?.[0];
      if (!file) return;
      try {
        const { documentId, projectId } = useEditorStore.getState();
        placeAsset(await uploadAsset(file, { projectId, workspaceId: documentId }), at);
      } catch {
        // Not media, or storage refused it: the drop simply does not land.
      }
    },
    [screenToFlowPosition, assetList],
  );

  const selected: WorkspaceNode | undefined =
    !isDragging && selection.length === 1 && selection[0]
      ? document?.nodes[selection[0]]
      : undefined;

  // Positioned in screen space, so the chrome never scales with the zoom.
  const topLeft = selected ? flowToScreenPosition({ x: selected.x, y: selected.y }) : null;
  const bottomRight = selected
    ? flowToScreenPosition({ x: selected.x + selected.width, y: selected.y + selected.height })
    : null;
  const box = selected ? wrapper.current?.getBoundingClientRect() : undefined;

  if (!document) return <div className="h-full w-full" />;
  const empty = Object.keys(document.nodes).length === 0;
  const hand = tool === "hand";

  return (
    <div
      ref={wrapper}
      className={`para-surface relative h-full w-full ${hand ? "cursor-grab" : ""}`}
      onDragOver={(e) => e.preventDefault()}
      onDrop={(e) => void onDrop(e)}
      onDoubleClick={onDoubleClick}
    >
      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={NODE_TYPES}
        edgeTypes={EDGE_TYPES}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onConnectEnd={onConnectEnd}
        onSelectionChange={onSelectionChange}
        onMove={onMove}
        onMoveEnd={onMoveEnd}
        defaultViewport={document.viewport}
        minZoom={0.25}
        maxZoom={4}
        // 选择 tool: trackpad scroll pans, a left-drag on empty canvas draws a marquee.
        // 抓手 tool: a left-drag pans and nothing is picked up.
        panOnScroll
        selectionOnDrag={!hand}
        panOnDrag={hand ? true : [1, 2]}
        nodesDraggable={!hand}
        elementsSelectable={!hand}
        selectionKeyCode={null}
        zoomOnDoubleClick={false}
        connectOnClick={false}
        connectionRadius={36}
        proOptions={PRO_OPTIONS}
        deleteKeyCode={["Delete", "Backspace"]}
      >
        <Background variant={BackgroundVariant.Dots} gap={0} size={0} color="transparent" />
      </ReactFlow>

      {empty && <EmptyCanvas />}

      {selected && topLeft && bottomRight && box && (
        <div
          className="pointer-events-auto absolute z-10"
          style={{
            left: (topLeft.x + bottomRight.x) / 2 - box.left,
            top: bottomRight.y - box.top + 14,
            transform: "translateX(-50%)",
          }}
        >
          {/* No key: the panel holds no state of its own, so there is nothing to reset on
              reselect — and remounting it used to be what destroyed a half-typed prompt. */}
          <NodeConfig
            node={selected}
            width={Math.min(680, Math.max(480, bottomRight.x - topLeft.x))}
          />
        </div>
      )}
    </div>
  );
}

export { ASSET_MIME };
