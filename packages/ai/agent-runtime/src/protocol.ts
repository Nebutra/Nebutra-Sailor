/**
 * App-server protocol contract (WRAP — capability #5).
 *
 * Faithful re-expression of the upstream JSON-RPC method registry, the
 * serialization-scope concurrency model, server-initiated approval requests,
 * and the notification event stream.
 *
 * Multi-tenant adaptation (non-negotiable): every serialization scope is
 * additionally keyed by `tenantId`. Upstream `Thread { thread_id }` becomes
 * `{ tenantId, threadId }` — natural per-tenant ordering + isolation for free.
 * This is the only coupling seam to an optional decoupled kernel sidecar
 * (Track B); transport (WS/SSE/stdio) is pluggable and not defined here.
 */

import { z } from "zod";

// ── Serialization scope (concurrency control) ────────────────────────────────

/**
 * Requests sharing a scope are serialized; distinct scopes run in parallel.
 * `tenantId` is mandatory on every scope — cross-tenant requests can never
 * share a scope.
 */
export type SerializationScope =
  | { readonly tenantId: string; readonly kind: "none" }
  | { readonly tenantId: string; readonly kind: "global"; readonly key: string }
  | { readonly tenantId: string; readonly kind: "global_shared_read"; readonly key: string }
  | { readonly tenantId: string; readonly kind: "thread"; readonly threadId: string }
  | { readonly tenantId: string; readonly kind: "command_exec"; readonly processId: string }
  | { readonly tenantId: string; readonly kind: "mcp_oauth"; readonly server: string };

/** Stable string key used to coalesce requests into the same serial lane. */
export function scopeKey(scope: SerializationScope): string {
  switch (scope.kind) {
    case "none":
      return `t:${scope.tenantId}|none:${cryptoRandom()}`;
    case "global":
    case "global_shared_read":
      return `t:${scope.tenantId}|${scope.kind}:${scope.key}`;
    case "thread":
      return `t:${scope.tenantId}|thread:${scope.threadId}`;
    case "command_exec":
      return `t:${scope.tenantId}|cmd:${scope.processId}`;
    case "mcp_oauth":
      return `t:${scope.tenantId}|mcpoauth:${scope.server}`;
  }
}

function cryptoRandom(): string {
  return globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random()}`;
}

// ── Client -> server method registry ─────────────────────────────────────────

/** How a method's scope is derived from its params. */
export type ScopeRule =
  | { readonly kind: "none" }
  | { readonly kind: "global"; readonly key: string }
  | { readonly kind: "thread" };

export interface MethodSpec {
  /** Namespaced `domain/verb` wire name. */
  readonly method: string;
  readonly scope: ScopeRule;
  readonly experimental?: boolean;
}

/**
 * The faithful subset of the upstream registry relevant to a multi-tenant web
 * product. `thread`-scoped methods derive `{ tenantId, threadId }`.
 */
export const METHOD_REGISTRY = {
  initialize: { method: "initialize", scope: { kind: "none" } },
  threadStart: { method: "thread/start", scope: { kind: "none" } },
  threadResume: { method: "thread/resume", scope: { kind: "thread" } },
  threadFork: { method: "thread/fork", scope: { kind: "thread" } },
  threadArchive: { method: "thread/archive", scope: { kind: "thread" } },
  threadCompactStart: { method: "thread/compact/start", scope: { kind: "thread" } },
  threadRollback: { method: "thread/rollback", scope: { kind: "thread" } },
  turnStart: { method: "turn/start", scope: { kind: "thread" } },
  turnSteer: { method: "turn/steer", scope: { kind: "thread" } },
  turnInterrupt: { method: "turn/interrupt", scope: { kind: "thread" } },
  modelList: { method: "model/list", scope: { kind: "none" } },
} as const satisfies Record<string, MethodSpec>;

export type MethodName = (typeof METHOD_REGISTRY)[keyof typeof METHOD_REGISTRY]["method"];

/** Resolve a method's runtime scope from tenant + params. */
export function resolveScope(
  spec: MethodSpec,
  tenantId: string,
  params: { threadId?: string },
): SerializationScope {
  switch (spec.scope.kind) {
    case "none":
      return { tenantId, kind: "none" };
    case "global":
      return { tenantId, kind: "global", key: spec.scope.key };
    case "thread": {
      if (!params.threadId) {
        throw new Error(`Method ${spec.method} requires a threadId for scoping`);
      }
      return { tenantId, kind: "thread", threadId: params.threadId };
    }
  }
}

// ── Server -> client requests (approval / elicitation) ───────────────────────

/** Approvals are server-initiated RPC, not side channels. */
export type ServerRequest =
  | {
      readonly type: "command_execution.request_approval";
      readonly requestId: string;
      readonly command: string;
    }
  | {
      readonly type: "file_change.request_approval";
      readonly requestId: string;
      readonly paths: readonly string[];
    }
  | {
      readonly type: "permissions.request_approval";
      readonly requestId: string;
      readonly summary: string;
    }
  | {
      readonly type: "mcp.elicitation";
      readonly requestId: string;
      readonly server: string;
      readonly schema: unknown;
    };

// ── Server -> client notifications (event stream) ────────────────────────────

export const NOTIFICATIONS = [
  "thread/started",
  "turn/started",
  "turn/completed",
  "turn/failed",
  "item/started",
  "item/updated",
  "item/completed",
  "model/rerouted",
  "thread/compacted",
] as const;
export type NotificationName = (typeof NOTIFICATIONS)[number];

// ── Boundary validation for the universal envelope ───────────────────────────

export const requestEnvelopeSchema = z.object({
  jsonrpc: z.literal("2.0"),
  id: z.union([z.string(), z.number()]),
  method: z.string(),
  /** tenantId is mandatory at the envelope boundary — fail closed otherwise. */
  tenantId: z.string().min(1),
  params: z.unknown().optional(),
});
export type RequestEnvelope = z.infer<typeof requestEnvelopeSchema>;
