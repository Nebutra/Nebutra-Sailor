/**
 * Typed node-graph dataflow model.
 *
 * The source product was a 39.8k-line single-file React app with a flat,
 * string-tagged graph dispatched by `if (node.type === ...)`. Its one piece of
 * real, reusable IP is the **NODE_IO_ENVELOPE v1.0** contract: a versioned,
 * type-erased payload that lets any node hand output to any node without the
 * receiver knowing the producer's type. We keep that contract exactly (same
 * version string, same validity rules) and give the graph around it a typed,
 * tenant-scoped shape instead of free-floating React state.
 *
 * This is a sibling of `@nebutra/atelier-canvas` (free placement), not an
 * extension of it: a typed `nodes + edges` DAG is a different data model than
 * a flat `elements[]` scene. They share the lower `@nebutra/tenant-store`
 * contract (lock + store base), not their schema and not each other.
 */

import type { GraphEdge, GraphNode } from "@nebutra/graph-model";

/** Frozen so an absorbed contract version can never be silently mutated. */
export const NODE_IO_ENVELOPE_VERSION = "1.0" as const;

export type ReelMediaKind = "image" | "video";

export interface ReelMediaItem {
  readonly type: ReelMediaKind;
  /** Resolvable URL or `data:` URI. Empty/whitespace is invalid. */
  readonly url: string;
}

/**
 * The inter-node payload. `kind` is the coarse discriminator; `text` and
 * `media` are always present arrays (possibly empty) so consumers never
 * branch on absence. `meta` carries provenance for routing.
 */
export interface NodeIOEnvelope {
  readonly version: typeof NODE_IO_ENVELOPE_VERSION;
  readonly kind: "text" | "media" | "mixed";
  readonly text: readonly string[];
  readonly media: readonly ReelMediaItem[];
  readonly meta: {
    readonly sourceNodeId: string;
    readonly sourceNodeType: string;
    readonly targetNodeId?: string;
    /** Which input port on the target this envelope feeds. */
    readonly inputType: string;
  };
}

export type ReelNodeType = "text" | "image" | "gen-image" | "gen-video" | "storyboard" | "analyze";

/** A reel node is a `@nebutra/graph-model` node specialized with reel data. */
export interface ReelNode extends GraphNode {
  readonly id: string;
  readonly type: ReelNodeType;
  readonly x: number;
  readonly y: number;
  /** Type-specific configuration; opaque to the graph layer. */
  readonly settings: Readonly<Record<string, unknown>>;
  /** Last produced output, if the node has run. */
  readonly output?: NodeIOEnvelope;
}

/** A reel edge is a graph edge tagged with the target input port. */
export interface ReelEdge extends GraphEdge {
  readonly from: string;
  readonly to: string;
  /** Target input port; pairs with `NodeIOEnvelope.meta.inputType`. */
  readonly inputType: string;
}

export interface ReelGraph {
  readonly id: string;
  /** Owning organization — every read/write is scoped by this. */
  readonly tenantId: string;
  readonly name: string;
  readonly nodes: readonly ReelNode[];
  readonly edges: readonly ReelEdge[];
  readonly updatedAt: Date;
}

/** Tenant-scoped persistence boundary (mirrors atelier-canvas CanvasStore). */
export interface ReelGraphStore {
  get(tenantId: string, graphId: string): Promise<ReelGraph | null>;
  create(tenantId: string, graphId: string, name: string): Promise<ReelGraph>;
  save(
    tenantId: string,
    graphId: string,
    nodes: readonly ReelNode[],
    edges: readonly ReelEdge[],
  ): Promise<ReelGraph>;
  list(tenantId: string): Promise<readonly ReelGraph[]>;
}
