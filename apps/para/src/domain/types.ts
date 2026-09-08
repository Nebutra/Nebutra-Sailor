/**
 * PARA business objects — shaped by docs/product-intelligence/{canvas,library,jobs}.md (2026-09-08).
 * Field groups carry the evidence tier that justifies them (A/B/C/EXPERIMENTAL); see those files.
 * Keep everything optional except what the shell needs to render.
 */

export interface Project {
  id: string;
  name: string;
  updatedAt: string;
}

export interface Workspace {
  id: string;
  projectId: string;
  name: string;
  documentId: string;
}

export type AssetType = "image" | "video" | "audio";
export type Scope = "account" | "team";

export interface Asset {
  id: string;
  type: AssetType;
  url: string;
  label: string;
  aspect: "16:9" | "1:1" | "9:16" | "4:3";
  /** B — TapNow, LibTV */
  scope: Scope;
  /** A — 6/6 keep a history of outputs separate from uploads */
  origin: "upload" | "generated";
  jobId?: string;
  workspaceId?: string;
  projectId?: string;
  createdAt: string;
  favorite?: boolean;
}

/** A — Seko, TapNow, LibTV: account + platform scope, never project-scoped. */
export interface Subject {
  id: string;
  name: string;
  category: "character" | "scene" | "item" | "style";
  /** asset ids forming the identity sheet */
  sheet: string[];
  voice?: string;
  scope: Scope | "platform";
}

// ---------------------------------------------------------------------------
// Jobs — job = node (A). jobs-store is keyed by nodeId; the node is the primary status surface.
// ---------------------------------------------------------------------------

export type JobStatus = "queued" | "running" | "completed" | "failed";

export interface JobError {
  /** fal-style machine-readable type (C). The enum itself is backend work. */
  type: string;
  message: string;
  retryable?: boolean;
}

export interface Job {
  id: string;
  nodeId: string;
  label: string;
  status: JobStatus;
  /** 0..1 while running. */
  progress: number;
  queuePosition?: number;
  startedAt?: string;
  finishedAt?: string;
  error?: JobError;
  cost?: Cost;
}

// ---------------------------------------------------------------------------
// Views
// ---------------------------------------------------------------------------

export type WorkspaceViewType = "canvas" | "storyboard" | "timeline" | "viewer";

/** canvas · storyboard are views over one document (B). timeline · viewer are EXPERIMENTAL, labs flag only. */
export const WORKSPACE_VIEWS: readonly WorkspaceViewType[] = ["canvas", "storyboard"] as const;
export const LABS_VIEWS: readonly WorkspaceViewType[] = ["timeline", "viewer"] as const;

export function isWorkspaceView(value: string | null | undefined): value is WorkspaceViewType {
  return (
    WORKSPACE_VIEWS.includes(value as WorkspaceViewType) ||
    LABS_VIEWS.includes(value as WorkspaceViewType)
  );
}

// ---------------------------------------------------------------------------
// Workspace document — node = generator state + result (A)
// ---------------------------------------------------------------------------

/** A (5 O) + C (fal queue) */
export type NodeStatus = "empty" | "configured" | "queued" | "running" | "completed" | "failed";

/** A — Seko edge, TapNow node params, Flowith lineage, Lovart meta, fal request id */
export interface Provenance {
  sourceNodeIds?: string[];
  jobId?: string;
  threadId?: string;
  createdBy: "user" | "agent" | "import" | "template";
}

export interface TaskState {
  status: NodeStatus;
  queuePosition?: number;
  startedAt?: string;
  finishedAt?: string;
  /** terminal payload, not a state */
  error?: JobError;
}

/** A at trigger (Seko, TapNow, Lovart, fal); B actual (fal, Seko delta) */
export interface Cost {
  estimated?: number;
  actual?: number;
  currency: "credits";
  durationMs?: number;
}

export type GeneratorMode = "image" | "video" | "text" | "audio";

export interface GeneratorReference {
  kind: "asset" | "subject" | "node";
  id: string;
}

/** A — params tiered at the node (6/6); refs A (5/5); count A (6/6) */
export interface GeneratorState {
  mode: GeneratorMode;
  model?: string;
  prompt?: string;
  /** ratio, resolution, duration, seed… — tier 2/3 in the UI */
  params?: Record<string, unknown>;
  references?: GeneratorReference[];
  count?: 1 | 2 | 4;
}

/** EXPERIMENTAL — regenerate-in-place needs N outputs */
export interface Output {
  assetId: string;
  jobId: string;
  createdAt: string;
}

export interface BaseNode extends Provenance, TaskState {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  cost?: Cost;
}

export interface MediaNode extends BaseNode {
  type: "image" | "video" | "audio";
  /** optional: a node is a generator first, an asset only once it has an output */
  assetId?: string;
  generator?: GeneratorState;
  outputs?: Output[];
}

export interface TextNode extends BaseNode {
  type: "text";
  text: string;
  generator?: GeneratorState;
}

export type WorkspaceNode = MediaNode | TextNode;

/** A meanings (derived: provenance · reference: input wiring); B for storing `kind`. Not rendered in M1. */
export interface Edge {
  id: string;
  source: string;
  target: string;
  kind: "derived" | "reference";
}

export interface Viewport {
  x: number;
  y: number;
  zoom: number;
}

export interface WorkspaceDocument {
  version: number;
  nodes: Record<string, WorkspaceNode>;
  edges: Record<string, Edge>;
  viewport: Viewport;
}

export interface SelectionState {
  ids: string[];
}

// ---------------------------------------------------------------------------
// Agent — threads are project-scoped (B); plan shows as a collapsible step log (A)
// ---------------------------------------------------------------------------

export interface AgentStep {
  id: string;
  label: string;
  state: "done" | "now" | "next";
  /** per-step cost when the step spends (B) */
  cost?: number;
}

export interface AgentThread {
  id: string;
  projectId: string;
  title: string;
  createdAt: string;
}
