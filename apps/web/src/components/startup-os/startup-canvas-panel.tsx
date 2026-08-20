"use client";

/**
 * The spatial company canvas — artifacts and governed runs as one draggable
 * graph, with an inspector rail for whatever is selected.
 *
 * The graph is derived entirely from persisted artifacts and runs; positions and
 * zoom persist through the canvas API. Layout separation is tonal: the canvas
 * well is `neutral-2`, the toolbar and the inspector sit on `neutral-1`.
 */

import { Layers, Lightning, Minus, Plus, RefreshCounterClockwise } from "@nebutra/icons";
import {
  buildStartupCanvasModel,
  type StartupCanvasEdge,
  type StartupCanvasLayout,
  type StartupCanvasNode,
  type StartupCanvasPoint,
} from "@nebutra/startup-os/canvas";
import type {
  StartupArtifact,
  StartupOperatingRun,
  StartupOSProject,
} from "@nebutra/startup-os/compiler";
import { AnimateIn } from "@nebutra/ui/components";
import { Badge, Button, EmptyState } from "@nebutra/ui/primitives";
import { type PointerEvent as ReactPointerEvent, useEffect, useRef, useState } from "react";
import {
  buildInitialCanvasPositions,
  DEFAULT_CANVAS_ZOOM,
  isExecutableRun,
} from "./startup-os-model";
import { StartupRunStatusBadge } from "./startup-run-status-badge";

const MIN_ZOOM = 0.54;
const MAX_ZOOM = 1.08;
const ZOOM_STEP = 0.08;

export interface StartupCanvasPanelProps {
  readonly canvasLayout: StartupCanvasLayout | null;
  readonly isExecuting: boolean;
  readonly onExecuteRun: (runId: string) => void;
  readonly onPersistLayout: (layout: StartupCanvasLayout) => Promise<void>;
  readonly onSelectArtifact: (artifactId: string) => void;
  readonly onSelectRun: (runId: string) => void;
  readonly project: StartupOSProject;
  readonly selectedArtifactId: string | null;
  readonly selectedRun: StartupOperatingRun | null;
}

export function StartupCanvasPanel({
  canvasLayout,
  isExecuting,
  onExecuteRun,
  onPersistLayout,
  onSelectArtifact,
  onSelectRun,
  project,
  selectedArtifactId,
  selectedRun,
}: StartupCanvasPanelProps) {
  const model = buildStartupCanvasModel(project);
  const initialPositions = buildInitialCanvasPositions(model, canvasLayout);
  const [nodePositions, setNodePositions] =
    useState<Record<string, StartupCanvasPoint>>(initialPositions);
  const nodePositionsRef = useRef<Record<string, StartupCanvasPoint>>(initialPositions);
  const [zoom, setZoom] = useState(canvasLayout?.zoom ?? DEFAULT_CANVAS_ZOOM);
  const dragRef = useRef<{
    readonly nodeId: string;
    readonly offsetX: number;
    readonly offsetY: number;
  } | null>(null);
  const canvasRef = useRef<HTMLDivElement>(null);
  const selectedArtifact = selectedArtifactId
    ? project.artifacts.find((artifact) => artifact.id === selectedArtifactId)
    : null;
  const selectedNodeId =
    (selectedArtifact ? `artifact:${selectedArtifact.id}` : null) ??
    (selectedRun ? `run:${selectedRun.id}` : null);

  useEffect(() => {
    const nextModel = buildStartupCanvasModel(project);
    const nextPositions = buildInitialCanvasPositions(nextModel, canvasLayout);
    nodePositionsRef.current = nextPositions;
    setNodePositions(nextPositions);
    setZoom(canvasLayout?.zoom ?? DEFAULT_CANVAS_ZOOM);
  }, [canvasLayout, project]);

  function layoutPayload(
    positions: Record<string, StartupCanvasPoint>,
    nextZoom: number,
  ): StartupCanvasLayout {
    const knownNodeIds = new Set(model.nodes.map((node) => node.id));
    return {
      zoom: nextZoom,
      updatedAt: new Date().toISOString(),
      nodePositions: Object.fromEntries(
        Object.entries(positions).filter(([nodeId]) => knownNodeIds.has(nodeId)),
      ),
    };
  }

  function persistLayout(
    positions: Record<string, StartupCanvasPoint> = nodePositionsRef.current,
    nextZoom = zoom,
  ) {
    void onPersistLayout(layoutPayload(positions, nextZoom));
  }

  function resetLayout() {
    const resetZoom = DEFAULT_CANVAS_ZOOM;
    nodePositionsRef.current = initialPositions;
    setNodePositions(initialPositions);
    setZoom(resetZoom);
    persistLayout(initialPositions, resetZoom);
  }

  function changeZoom(nextZoom: number) {
    setZoom(nextZoom);
    persistLayout(nodePositions, nextZoom);
  }

  function positionFor(node: StartupCanvasNode) {
    return nodePositions[node.id] ?? { x: node.x, y: node.y };
  }

  function pointFor(node: StartupCanvasNode, side: "left" | "right") {
    const position = positionFor(node);
    return {
      x: side === "left" ? position.x : position.x + node.width,
      y: position.y + node.height / 2,
    };
  }

  function pathFor(edge: StartupCanvasEdge) {
    const fromNode = model.nodes.find((node) => node.id === edge.from);
    const toNode = model.nodes.find((node) => node.id === edge.to);
    if (!fromNode || !toNode) return "";
    const from = pointFor(fromNode, "right");
    const to = pointFor(toNode, "left");
    const tension = Math.max(64, Math.min(150, Math.abs(to.x - from.x) * 0.45));
    return `M ${from.x} ${from.y} C ${from.x + tension} ${from.y}, ${to.x - tension} ${to.y}, ${to.x} ${to.y}`;
  }

  function selectNode(node: StartupCanvasNode) {
    if (node.artifactId) onSelectArtifact(node.artifactId);
    if (node.runId) onSelectRun(node.runId);
  }

  function startDrag(node: StartupCanvasNode, event: ReactPointerEvent<HTMLButtonElement>) {
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;
    const position = positionFor(node);
    dragRef.current = {
      nodeId: node.id,
      offsetX: position.x - (event.clientX - rect.left) / zoom,
      offsetY: position.y - (event.clientY - rect.top) / zoom,
    };
    selectNode(node);
  }

  function moveDrag(event: ReactPointerEvent<HTMLDivElement>) {
    const drag = dragRef.current;
    if (!drag) return;
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;
    const node = model.nodes.find((item) => item.id === drag.nodeId);
    if (!node) return;
    const nextX = (event.clientX - rect.left) / zoom + drag.offsetX;
    const nextY = (event.clientY - rect.top) / zoom + drag.offsetY;
    setNodePositions((current) => {
      const next = {
        ...current,
        [drag.nodeId]: {
          x: Math.max(12, Math.min(model.width - node.width - 12, nextX)),
          y: Math.max(12, Math.min(model.height - node.height - 12, nextY)),
        },
      };
      nodePositionsRef.current = next;
      return next;
    });
  }

  function finishDrag() {
    if (!dragRef.current) return;
    dragRef.current = null;
    persistLayout();
  }

  return (
    <AnimateIn preset="fadeUp" className="h-full min-h-0">
      <div className="flex h-full min-h-0 min-w-0 flex-col overflow-hidden bg-neutral-1">
        <div className="flex shrink-0 flex-col gap-3 p-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-sm font-semibold tracking-tight text-neutral-12">
                Company canvas
              </h2>
              <Badge variant="blue-subtle" size="sm">
                Spatial graph
              </Badge>
            </div>
            <p className="mt-1 max-w-3xl text-xs leading-5 text-neutral-11">
              Drag nodes, inspect dependencies, and start eligible runs from the same company-state
              surface.
            </p>
          </div>
          <div className="flex w-fit shrink-0 items-center gap-1 rounded-full bg-neutral-2 p-1">
            <Button
              type="button"
              variant="ghost"
              shape="circle"
              size="tiny"
              aria-label="Zoom out"
              onClick={() => changeZoom(Math.max(MIN_ZOOM, Number((zoom - ZOOM_STEP).toFixed(2))))}
            >
              <Minus className="size-3.5" aria-hidden="true" />
            </Button>
            <span className="min-w-12 shrink-0 whitespace-nowrap text-center text-[11px] font-medium tabular-nums text-neutral-11">
              {Math.round(zoom * 100)}%
            </span>
            <Button
              type="button"
              variant="ghost"
              shape="circle"
              size="tiny"
              aria-label="Zoom in"
              onClick={() => changeZoom(Math.min(MAX_ZOOM, Number((zoom + ZOOM_STEP).toFixed(2))))}
            >
              <Plus className="size-3.5" aria-hidden="true" />
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="tiny"
              className="rounded-full"
              onClick={resetLayout}
              prefix={<RefreshCounterClockwise className="size-3.5" aria-hidden="true" />}
            >
              Reset
            </Button>
          </div>
        </div>

        <div className="grid min-h-0 min-w-0 flex-1 2xl:grid-cols-[minmax(0,1fr)_320px]">
          <div className="min-h-0 min-w-0 overflow-auto bg-neutral-2 p-4">
            <div
              className="relative"
              style={{ width: model.width * zoom, height: model.height * zoom }}
              onPointerLeave={finishDrag}
              onPointerMove={moveDrag}
              onPointerUp={finishDrag}
            >
              <div
                ref={canvasRef}
                className="absolute left-0 top-0 rounded-[var(--radius-xl)]"
                style={{
                  width: model.width,
                  height: model.height,
                  transform: `scale(${zoom})`,
                  transformOrigin: "top left",
                }}
              >
                <svg
                  aria-hidden="true"
                  className="pointer-events-none absolute inset-0"
                  height={model.height}
                  width={model.width}
                >
                  <defs>
                    <marker
                      id="startup-canvas-arrow"
                      markerHeight="8"
                      markerWidth="8"
                      orient="auto"
                      refX="7"
                      refY="4"
                    >
                      <path d="M 0 0 L 8 4 L 0 8 z" fill="hsl(var(--border))" />
                    </marker>
                  </defs>
                  {model.edges.map((edge) => (
                    <path
                      key={edge.id}
                      d={pathFor(edge)}
                      fill="none"
                      markerEnd="url(#startup-canvas-arrow)"
                      stroke={
                        edge.kind === "run_artifact" ? "hsl(var(--primary))" : "hsl(var(--border))"
                      }
                      strokeDasharray={edge.kind === "run_artifact" ? "0" : "5 6"}
                      strokeLinecap="round"
                      strokeWidth={edge.kind === "run_artifact" ? 1.8 : 1.2}
                    />
                  ))}
                </svg>

                {model.nodes.map((node) => {
                  const position = positionFor(node);
                  const selected =
                    node.id === selectedNodeId ||
                    Boolean(node.runId && selectedRun?.id === node.runId) ||
                    Boolean(node.artifactId && selectedArtifactId === node.artifactId);
                  return (
                    <StartupCanvasNodeButton
                      key={node.id}
                      node={node}
                      onPointerDown={(event) => startDrag(node, event)}
                      onSelect={() => selectNode(node)}
                      position={position}
                      selected={selected}
                    />
                  );
                })}
              </div>
            </div>
          </div>

          <StartupCanvasInspector
            isExecuting={isExecuting}
            onExecuteRun={onExecuteRun}
            selectedArtifact={selectedArtifact ?? null}
            selectedRun={selectedRun}
          />
        </div>
      </div>
    </AnimateIn>
  );
}

function StartupCanvasInspector({
  isExecuting,
  onExecuteRun,
  selectedArtifact,
  selectedRun,
}: {
  isExecuting: boolean;
  onExecuteRun: (runId: string) => void;
  selectedArtifact: StartupArtifact | null;
  selectedRun: StartupOperatingRun | null;
}) {
  const selectedRunExecutable = selectedRun ? isExecutableRun(selectedRun) : false;
  const hasSelection = Boolean(selectedArtifact || selectedRun);

  return (
    <aside className="min-h-0 min-w-0 overflow-y-auto bg-neutral-1 p-4">
      <h3 className="text-[11px] font-semibold uppercase tracking-widest text-neutral-10">
        Canvas inspector
      </h3>

      {hasSelection ? null : (
        <EmptyState.Root
          className="mt-3 border-0 bg-neutral-2"
          align="start"
          size="sm"
          icon={<EmptyState.Icon icon={<Layers className="size-5" />} />}
          title="Nothing selected"
          description="Pick a node on the canvas to read its dependencies and run controls."
        />
      )}

      {selectedArtifact ? (
        <AnimateIn preset="fade">
          <div className="mt-3 rounded-2xl bg-neutral-2 p-3">
            <p className="text-sm font-semibold text-neutral-12">{selectedArtifact.title}</p>
            <p className="mt-1 text-xs leading-5 text-neutral-11">{selectedArtifact.summary}</p>
            <div className="mt-3 grid gap-1.5 text-[11px] text-neutral-11">
              <span>Status: {selectedArtifact.status}</span>
              <span>Owner: {selectedArtifact.owner}</span>
              <span className="break-words">
                Dependencies:{" "}
                {selectedArtifact.dependencies.length > 0
                  ? selectedArtifact.dependencies.join(", ")
                  : "CompanyContext"}
              </span>
            </div>
          </div>
        </AnimateIn>
      ) : null}

      {selectedRun ? (
        <AnimateIn preset="fade">
          <div className="mt-3 rounded-2xl bg-neutral-2 p-3">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-sm font-semibold text-neutral-12">{selectedRun.stage}</p>
                <p className="mt-1 text-xs leading-5 text-neutral-11">{selectedRun.summary}</p>
              </div>
              <StartupRunStatusBadge status={selectedRun.status} />
            </div>
            <div className="mt-3 grid gap-1.5 text-[11px] text-neutral-11">
              <span>Adapter: {selectedRun.adapter}</span>
              <span>Approval: {selectedRun.approval}</span>
              <span>Budget: ${selectedRun.costEstimateUsd.toFixed(2)}</span>
            </div>
            <Button
              type="button"
              variant="ink"
              size="sm"
              className="mt-3 w-full"
              disabled={!selectedRunExecutable || isExecuting}
              onClick={() => onExecuteRun(selectedRun.id)}
              prefix={<Lightning className="size-3.5" aria-hidden="true" />}
            >
              {isExecuting
                ? "Executing..."
                : selectedRunExecutable
                  ? "Execute selected run"
                  : "Not executable"}
            </Button>
          </div>
        </AnimateIn>
      ) : null}
    </aside>
  );
}

function StartupCanvasNodeButton({
  node,
  onPointerDown,
  onSelect,
  position,
  selected,
}: {
  node: StartupCanvasNode;
  onPointerDown: (event: ReactPointerEvent<HTMLButtonElement>) => void;
  onSelect: () => void;
  position: StartupCanvasPoint;
  selected: boolean;
}) {
  const tone =
    node.kind === "context"
      ? "context"
      : node.status === "completed" || node.status === "ready"
        ? "ready"
        : node.status === "failed"
          ? "failed"
          : node.status === "waiting_for_review" || node.status === "review_required"
            ? "review"
            : "planned";
  const toneClass = {
    context: "bg-primary/10 text-primary dark:bg-primary/15",
    failed: "bg-destructive/10 text-[hsl(var(--destructive-strong))]",
    planned: "bg-neutral-1 text-neutral-12",
    ready: "bg-success/10 text-[hsl(var(--success-strong))]",
    review: "bg-warning/10 text-[hsl(var(--warning-strong))]",
  }[tone];

  return (
    <button
      type="button"
      onClick={onSelect}
      onPointerDown={onPointerDown}
      className={`absolute cursor-grab overflow-hidden rounded-2xl p-3 text-left shadow-ambient-sm transition-shadow hover:shadow-ambient-md active:cursor-grabbing ${
        selected ? "outline outline-2 outline-offset-2 outline-[hsl(var(--ring))]" : ""
      } ${toneClass}`}
      style={{
        height: node.height,
        left: position.x,
        top: position.y,
        width: node.width,
      }}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold">{node.title}</p>
          <p className="mt-1 line-clamp-2 text-[11px] leading-4 opacity-80">{node.subtitle}</p>
        </div>
        <span className="shrink-0 rounded-full bg-neutral-1 px-2 py-0.5 text-[10px] font-medium text-neutral-12">
          {node.kind}
        </span>
      </div>
      <p className="mt-3 truncate text-[11px] font-medium uppercase tracking-widest opacity-80">
        {node.status}
      </p>
    </button>
  );
}
