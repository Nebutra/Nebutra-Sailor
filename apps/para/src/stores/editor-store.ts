import { create } from "zustand";
import { reconcileModel } from "@/domain/models";
import { NODE_SIZE, wouldCycle } from "@/domain/nodes";
import type {
  Edge,
  GeneratorMode,
  GeneratorState,
  JobError,
  NodeStatus,
  Viewport,
  WorkspaceDocument,
  WorkspaceNode,
} from "@/domain/types";

/**
 * Workspace document store. Owns the document (nodes, edges, viewport) and the selection.
 * Views (canvas / storyboard) read the same document; switching view never swaps it.
 * A derivation never overwrites its source: it creates a placeholder child node + `derived` edge (A).
 */

export const ZOOM_MIN = 0.25;
export const ZOOM_MAX = 4;

interface DeriveInput {
  sourceId?: string;
  mode: GeneratorMode;
  prompt?: string;
  createdBy: "user" | "agent";
  threadId?: string;
  /** where to place the child; defaults to the right of the source */
  at?: { x: number; y: number };
  size?: { width: number; height: number };
}

/**
 * Where the document stands against the server — LibTV's 待同步 / 同步中 / 已同步 pill.
 * `pending` = changed locally, not sent yet; `saving` = a PUT is in flight; `error` = the last PUT failed.
 */
export type SyncState = "saved" | "pending" | "saving" | "error";

export const SYNC_LABEL: Record<SyncState, string> = {
  saved: "已同步",
  pending: "待同步",
  saving: "同步中",
  error: "同步失败",
};

/**
 * What the autosave resolved to. A save only counts as 已同步 when nothing changed while it was in
 * flight; otherwise the document is still ahead of the server and the pill has to say so.
 */
export function syncAfterSave(ok: boolean, dirtyAtStart: number, dirtyNow: number): SyncState {
  if (!ok) return "error";
  return dirtyNow === dirtyAtStart ? "saved" : "pending";
}

interface CreateInput {
  mode: GeneratorMode;
  at: { x: number; y: number };
  /** Wire the new node downstream of this one. */
  sourceId?: string;
  title?: string;
}

interface EditorState {
  documentId: string | null;
  /** The project the loaded workspace belongs to, so generated assets can point back at it. */
  projectId: string | null;
  document: WorkspaceDocument | null;
  selection: string[];
  dirty: number;
  sync: SyncState;
  /** Autosave began; returns the change counter it is saving. */
  beginSave: () => number;
  endSave: (ok: boolean, dirtyAtStart: number) => void;
  load: (documentId: string, document: WorkspaceDocument, projectId?: string) => void;
  setViewport: (viewport: Partial<Viewport>) => void;
  panBy: (dx: number, dy: number) => void;
  zoomAt: (factor: number, cx: number, cy: number) => void;
  select: (ids: string[]) => void;
  toggleSelect: (id: string) => void;
  clearSelection: () => void;
  moveNode: (id: string, dx: number, dy: number) => void;
  /**
   * Absolute placement, applied on every frame of a drag.
   *
   * Deltas are for keyboard nudges; a drag already knows where the pointer is, and re-deriving a
   * delta against a position the renderer may have already moved makes the node drift.
   */
  setNodePosition: (id: string, x: number, y: number) => void;
  addNode: (node: WorkspaceNode) => void;
  addEdge: (edge: Edge) => void;
  /** Several nodes and edges as one change (templates). */
  addGraph: (nodes: WorkspaceNode[], edges: Edge[]) => void;
  /** An empty generator node of `mode`, optionally wired from `sourceId`. Selects it; returns its id. */
  createNode: (input: CreateInput) => string | null;
  /** A hand-drawn wire. Refuses self-loops, duplicates and cycles. */
  connect: (source: string, target: string) => boolean;
  deleteEdges: (ids: string[]) => void;
  setNodeSize: (id: string, width: number, height: number) => void;
  renameNode: (id: string, title: string) => void;
  updateGenerator: (id: string, patch: Partial<GeneratorState>) => void;
  setNodeStatus: (id: string, status: NodeStatus, extra?: Partial<WorkspaceNode>) => void;
  completeNode: (id: string, assetId: string, jobId: string) => void;
  failNode: (id: string, error: JobError) => void;
  /** Placeholder child + derived edge (A). Returns the child id. */
  derive: (input: DeriveInput) => string | null;
  duplicateNode: (id: string) => string | null;
  deleteNodes: (ids: string[]) => void;
}

const clampZoom = (z: number) => Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, z));

let seq = 0;
export const nextId = (prefix = "n") =>
  `${prefix}-${Date.now().toString(36)}-${(seq++).toString(36)}`;

const SIZE = NODE_SIZE;

export const useEditorStore = create<EditorState>((set, get) => {
  const patchDoc = (fn: (doc: WorkspaceDocument) => WorkspaceDocument) => {
    const doc = get().document;
    if (!doc) return;
    set({ document: fn(doc), dirty: get().dirty + 1, sync: "pending" });
  };
  const patchNode = (id: string, fn: (n: WorkspaceNode) => WorkspaceNode) =>
    patchDoc((doc) => {
      const node = doc.nodes[id];
      return node ? { ...doc, nodes: { ...doc.nodes, [id]: fn(node) } } : doc;
    });

  return {
    documentId: null,
    projectId: null,
    document: null,
    selection: [],
    dirty: 0,
    sync: "saved",

    beginSave: () => {
      set({ sync: "saving" });
      return get().dirty;
    },
    endSave: (ok, dirtyAtStart) => set({ sync: syncAfterSave(ok, dirtyAtStart, get().dirty) }),

    load: (documentId, document, projectId) =>
      set({
        documentId,
        document,
        projectId: projectId ?? null,
        selection: [],
        dirty: 0,
        sync: "saved",
      }),

    setViewport: (viewport) => {
      const doc = get().document;
      if (!doc) return;
      set({ document: { ...doc, viewport: { ...doc.viewport, ...viewport } } });
    },

    panBy: (dx, dy) => {
      const doc = get().document;
      if (!doc) return;
      set({
        document: {
          ...doc,
          viewport: { ...doc.viewport, x: doc.viewport.x + dx, y: doc.viewport.y + dy },
        },
      });
    },

    zoomAt: (factor, cx, cy) => {
      const doc = get().document;
      if (!doc) return;
      const { x, y, zoom } = doc.viewport;
      const next = clampZoom(zoom * factor);
      if (next === zoom) return;
      const ratio = next / zoom;
      set({
        document: {
          ...doc,
          viewport: { zoom: next, x: cx - (cx - x) * ratio, y: cy - (cy - y) * ratio },
        },
      });
    },

    select: (ids) => set({ selection: ids }),
    toggleSelect: (id) => {
      const s = get().selection;
      set({ selection: s.includes(id) ? s.filter((x) => x !== id) : [...s, id] });
    },
    clearSelection: () => set({ selection: [] }),

    moveNode: (id, dx, dy) => patchNode(id, (n) => ({ ...n, x: n.x + dx, y: n.y + dy })),

    setNodePosition: (id, x, y) =>
      patchNode(id, (n) => (n.x === x && n.y === y ? n : { ...n, x, y })),

    addNode: (node) => patchDoc((doc) => ({ ...doc, nodes: { ...doc.nodes, [node.id]: node } })),
    addEdge: (edge) => patchDoc((doc) => ({ ...doc, edges: { ...doc.edges, [edge.id]: edge } })),

    addGraph: (nodes, edges) =>
      patchDoc((doc) => ({
        ...doc,
        nodes: { ...doc.nodes, ...Object.fromEntries(nodes.map((n) => [n.id, n])) },
        edges: { ...doc.edges, ...Object.fromEntries(edges.map((e) => [e.id, e])) },
      })),

    createNode: ({ mode, at, sourceId, title }) => {
      const doc = get().document;
      if (!doc) return null;
      const id = nextId();
      const size = SIZE[mode];
      const source = sourceId ? doc.nodes[sourceId] : undefined;
      const base = {
        id,
        x: Math.round(at.x),
        y: Math.round(at.y),
        ...size,
        status: "empty" as const,
        createdBy: "user" as const,
        ...(title ? { title } : {}),
        ...(source ? { sourceNodeIds: [source.id] } : {}),
        generator: {
          mode,
          model: "Auto",
          count: 1 as const,
          ...(mode === "video" ? { params: { duration: 5 } } : {}),
          ...(source ? { references: [{ kind: "node" as const, id: source.id }] } : {}),
        },
      };
      const node: WorkspaceNode =
        mode === "text" ? { ...base, type: "text", text: "" } : { ...base, type: mode };
      patchDoc((d) => {
        const edgeId = nextId("e");
        const edges = source
          ? {
              ...d.edges,
              [edgeId]: { id: edgeId, source: source.id, target: id, kind: "reference" as const },
            }
          : d.edges;
        return { ...d, nodes: { ...d.nodes, [id]: node }, edges };
      });
      set({ selection: [id] });
      return id;
    },

    connect: (source, target) => {
      const doc = get().document;
      if (!doc || !doc.nodes[source] || !doc.nodes[target]) return false;
      const exists = Object.values(doc.edges).some(
        (e) => e.source === source && e.target === target,
      );
      if (exists || wouldCycle(doc, source, target)) return false;
      const id = nextId("e");
      patchDoc((d) => ({
        ...d,
        edges: { ...d.edges, [id]: { id, source, target, kind: "reference" } },
      }));
      return true;
    },

    deleteEdges: (ids) =>
      patchDoc((doc) => ({
        ...doc,
        edges: Object.fromEntries(Object.entries(doc.edges).filter(([id]) => !ids.includes(id))),
      })),

    setNodeSize: (id, width, height) =>
      patchNode(id, (n) =>
        n.width === width && n.height === height ? n : { ...n, width, height },
      ),

    renameNode: (id, title) =>
      patchNode(id, (n) => {
        const { title: _old, ...rest } = n;
        const next = title.trim();
        return (next ? { ...rest, title: next } : rest) as WorkspaceNode;
      }),

    updateGenerator: (id, patch) =>
      patchNode(id, (n) => {
        const merged: GeneratorState = {
          mode: n.type === "text" ? "text" : n.type,
          ...n.generator,
          ...patch,
        };
        // Enforced here, not in the panel: a store that can hold an impossible mode/model pair
        // sends it to the origin, which rejects it only after the credits are spent.
        const generator: GeneratorState = {
          ...merged,
          model: reconcileModel(merged.mode, merged.model),
        };
        return {
          ...n,
          status: n.status === "empty" ? "configured" : n.status,
          generator,
        } as WorkspaceNode;
      }),

    setNodeStatus: (id, status, extra) =>
      patchNode(id, (n) => ({ ...n, ...extra, status }) as WorkspaceNode),

    completeNode: (id, assetId, jobId) =>
      patchNode(id, (n) => {
        const finishedAt = new Date().toISOString();
        if (n.type === "text") return { ...n, status: "completed", finishedAt, jobId };
        return {
          ...n,
          status: "completed",
          finishedAt,
          jobId,
          assetId,
          outputs: [...(n.outputs ?? []), { assetId, jobId, createdAt: finishedAt }],
        };
      }),

    failNode: (id, error) =>
      patchNode(id, (n) => ({
        ...n,
        status: "failed",
        error,
        finishedAt: new Date().toISOString(),
      })),

    derive: ({ sourceId, mode, prompt, createdBy, threadId, at, size }) => {
      const doc = get().document;
      if (!doc) return null;
      const source = sourceId ? doc.nodes[sourceId] : undefined;
      const dims = size ?? SIZE[mode];
      const pos =
        at ?? (source ? { x: source.x + source.width + 48, y: source.y } : { x: 200, y: 200 });
      const id = nextId();
      const base = {
        id,
        x: pos.x,
        y: pos.y,
        ...dims,
        status: "queued" as const,
        createdBy,
        ...(threadId ? { threadId } : {}),
        ...(source ? { sourceNodeIds: [source.id] } : {}),
        generator: {
          mode,
          model: source?.generator?.model ?? "Auto",
          count: 1 as const,
          ...(prompt ? { prompt } : {}),
          ...(source ? { references: [{ kind: "node" as const, id: source.id }] } : {}),
        },
      };
      const node: WorkspaceNode =
        mode === "text" ? { ...base, type: "text", text: prompt ?? "" } : { ...base, type: mode };
      patchDoc((d) => {
        const edgeId = nextId("e");
        const edges = source
          ? {
              ...d.edges,
              [edgeId]: { id: edgeId, source: source.id, target: id, kind: "derived" as const },
            }
          : d.edges;
        return { ...d, nodes: { ...d.nodes, [id]: node }, edges };
      });
      return id;
    },

    duplicateNode: (id) => {
      const doc = get().document;
      const node = doc?.nodes[id];
      if (!doc || !node) return null;
      const copy: WorkspaceNode = {
        ...node,
        id: nextId(),
        x: node.x + 32,
        y: node.y + 32,
        createdBy: "user",
      };
      patchDoc((d) => ({ ...d, nodes: { ...d.nodes, [copy.id]: copy } }));
      set({ selection: [copy.id] });
      return copy.id;
    },

    deleteNodes: (ids) => {
      const doc = get().document;
      if (!doc || ids.length === 0) return;
      const nodes = { ...doc.nodes };
      for (const id of ids) delete nodes[id];
      const edges = Object.fromEntries(
        Object.entries(doc.edges).filter(
          ([, e]) => !ids.includes(e.source) && !ids.includes(e.target),
        ),
      );
      set({
        document: { ...doc, nodes, edges },
        selection: get().selection.filter((s) => !ids.includes(s)),
        dirty: get().dirty + 1,
        sync: "pending",
      });
    },
  };
});
