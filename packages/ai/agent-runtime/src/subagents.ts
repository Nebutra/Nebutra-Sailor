/**
 * Subagent / task dispatch (WRAP — isolated-child-agent model, the delta).
 *
 * Faithful re-expression of the source harness's child-agent dispatch grammar:
 * a registry decides WHICH definition runs, a context-boundary contract decides
 * WITH WHAT inherited context it starts, and a typed terminal envelope decides
 * HOW its result re-enters the parent. The child loop, child policy, and
 * rollout store live elsewhere in agent-runtime and are intentionally NOT
 * reimplemented here — this layer is pure decision + data + state machine.
 *
 * Multi-tenant: every task operation is keyed by `tenantId` and fails closed.
 * Pure data/logic — no FS scan, no shell, no network.
 *
 * NOTE on dropped task kinds: the source harness models several local execution
 * task kinds (local_bash / monitor_mcp / worktree). Those are deliberately NOT
 * represented here: this package never executes locally — execution is delegated
 * via the external-sandbox seam — so only the agent-facing `subagent` kind (and
 * its `deferred` sibling) is modelled.
 */

import { z } from "zod";
import type { Definition, Frontmatter } from "./definitions";
import type { ThreadItem, TurnUsage } from "./model";

/* ───────────────────────── Subagent definition ─────────────────────────── */

/** A subagent definition is just a `Definition` (same loader as skills/commands). */
export type SubagentRecord = Definition;

/**
 * Effective tool set for a subagent: `allowedTools` minus `disallowedTools`,
 * intersected with the runtime tool universe so a definition can never widen
 * its scope past what the host exposes. When `allowedTools` is empty the
 * contract is "all tools except the denied ones" (all-except-deny).
 *
 * Pure — order follows `allTools` for determinism.
 */
export function resolveSubagentTools(fm: Frontmatter, allTools: readonly string[]): string[] {
  const deny = new Set(fm.disallowedTools);
  const allow = fm.allowedTools;
  if (allow.length === 0) {
    return allTools.filter((t) => !deny.has(t));
  }
  const allowSet = new Set(allow);
  return allTools.filter((t) => allowSet.has(t) && !deny.has(t));
}

/* ───────────────────── Context-boundary contract ───────────────────────── */

export type DispatchMode = "spawn" | "fork";

export interface DispatchCtx {
  readonly tenantId: string;
}

export interface PrepareDispatchInput {
  readonly definition: SubagentRecord;
  readonly mode: DispatchMode;
  readonly parentItems?: readonly ThreadItem[];
  /** Caller's directive. Mandatory & non-empty in `spawn` mode. */
  readonly brief: string;
  readonly ctx: DispatchCtx;
  /** Runtime tool universe; defaults to the definition's own allow list. */
  readonly allTools?: readonly string[];
}

export interface PreparedDispatch {
  readonly initialContext: readonly ThreadItem[];
  readonly toolScope: readonly string[];
  /** Opaque reference to the system prompt body (resolved by the child loop). */
  readonly systemPromptRef: string;
  readonly modelOverride?: string;
}

/** True for a trailing tool-call item that never received a terminal result. */
function isIncompleteToolCall(item: ThreadItem): boolean {
  if (item.type === "mcp_tool_call" || item.type === "command_execution") {
    return item.status === "in_progress";
  }
  return false;
}

/**
 * Drop trailing incomplete tool-call items so a forked child never inherits a
 * dangling tool_use without its result. Pure — input array is never mutated.
 */
function filterIncompleteToolCalls(items: readonly ThreadItem[]): ThreadItem[] {
  return items.filter((it) => !isIncompleteToolCall(it));
}

function directiveItem(idSeed: string, brief: string): ThreadItem {
  return { id: `brief_${idSeed}`, type: "agent_message", text: brief };
}

/**
 * Decide the child's starting context boundary.
 *
 * - `spawn`: zero inherited context. The caller MUST fully brief the child;
 *   an empty brief is a programming error and throws.
 * - `fork`: inherit a defensive copy of `parentItems` with incomplete tool
 *   calls filtered out, then append the brief as a directive.
 *
 * `parentItems` is never mutated. Cross-tenant dispatch fails closed.
 */
export function prepareDispatch(input: PrepareDispatchInput): PreparedDispatch {
  const { definition, mode, parentItems, brief, ctx, allTools } = input;
  if (!ctx.tenantId) throw new Error("DispatchCtx.tenantId is required");
  if (definition.tenantId !== ctx.tenantId) {
    throw new Error("subagent definition belongs to a different tenant (fail closed)");
  }

  const trimmedBrief = brief.trim();
  const fm = definition.frontmatter;
  const toolScope = resolveSubagentTools(fm, allTools ?? fm.allowedTools);

  let initialContext: ThreadItem[];
  if (mode === "spawn") {
    if (!trimmedBrief) {
      throw new Error(
        "spawn dispatch requires a non-empty brief — caller must fully brief the child",
      );
    }
    initialContext = [directiveItem(definition.slug, trimmedBrief)];
  } else {
    const inherited = parentItems ? filterIncompleteToolCalls(parentItems) : [];
    initialContext = trimmedBrief
      ? [...inherited, directiveItem(definition.slug, trimmedBrief)]
      : [...inherited];
  }

  const modelOverride = fm.model && fm.model !== "inherit" ? fm.model : undefined;

  return {
    initialContext,
    toolScope,
    systemPromptRef: definition.bodyRef,
    ...(modelOverride ? { modelOverride } : {}),
  };
}

/* ─────────────────── Uniform Task lifecycle registry ───────────────────── */

export const TASK_KINDS = ["subagent", "deferred"] as const;
export type TaskKind = (typeof TASK_KINDS)[number];

export const TASK_STATUSES = ["pending", "running", "completed", "failed", "killed"] as const;
export type TaskStatus = (typeof TASK_STATUSES)[number];

export interface TaskRecord {
  readonly taskId: string;
  readonly tenantId: string;
  readonly status: TaskStatus;
  readonly notified: boolean;
  readonly kind: TaskKind;
  readonly createdAtMs: number;
}

/** Legal status transitions. Any pair absent here is rejected. */
const LEGAL: Readonly<Record<TaskStatus, readonly TaskStatus[]>> = {
  pending: ["running", "killed", "failed"],
  running: ["completed", "failed", "killed"],
  completed: [],
  failed: [],
  killed: [],
};

const TERMINAL: ReadonlySet<TaskStatus> = new Set(["completed", "failed", "killed"]);

let __seq = 0;
function nextTaskId(): string {
  __seq += 1;
  return `task_${Date.now().toString(36)}_${__seq.toString(36)}`;
}

function requireTenant(tenantId: string): void {
  if (!tenantId) throw new Error("tenantId is required (fail closed)");
}

/**
 * Tenant-scoped task registry. Every mutating op verifies the caller's
 * tenant against the stored record; a mismatch is treated as "not found"
 * for reads and throws for mutations — cross-tenant access is impossible.
 */
export class TaskRegistry {
  readonly #tasks = new Map<string, TaskRecord>();

  create(tenantId: string, kind: TaskKind): string {
    requireTenant(tenantId);
    const taskId = nextTaskId();
    this.#tasks.set(taskId, {
      taskId,
      tenantId,
      status: "pending",
      notified: false,
      kind,
      createdAtMs: Date.now(),
    });
    return taskId;
  }

  /** Tenant-checked read. Returns undefined for unknown or cross-tenant ids. */
  get(taskId: string, tenantId: string): TaskRecord | undefined {
    requireTenant(tenantId);
    const rec = this.#tasks.get(taskId);
    if (!rec || rec.tenantId !== tenantId) return undefined;
    return rec;
  }

  #ownedOrThrow(taskId: string, tenantId: string): TaskRecord {
    requireTenant(tenantId);
    const rec = this.#tasks.get(taskId);
    if (!rec) throw new Error(`task ${taskId} not found`);
    if (rec.tenantId !== tenantId) {
      throw new Error("cross-tenant task access denied (fail closed)");
    }
    return rec;
  }

  transition(taskId: string, to: TaskStatus, tenantId: string): TaskRecord {
    const rec = this.#ownedOrThrow(taskId, tenantId);
    const allowed = LEGAL[rec.status];
    if (!allowed.includes(to)) {
      throw new Error(`illegal task transition ${rec.status} → ${to}`);
    }
    const next: TaskRecord = { ...rec, status: to };
    this.#tasks.set(taskId, next);
    return next;
  }

  /** Unified kill — drives any non-terminal task to `killed`. */
  stop(taskId: string, tenantId: string): TaskRecord {
    const rec = this.#ownedOrThrow(taskId, tenantId);
    if (TERMINAL.has(rec.status)) return rec;
    return this.transition(taskId, "killed", tenantId);
  }

  markNotified(taskId: string, tenantId: string): TaskRecord {
    const rec = this.#ownedOrThrow(taskId, tenantId);
    const next: TaskRecord = { ...rec, notified: true };
    this.#tasks.set(taskId, next);
    return next;
  }
}

/**
 * No-peek / no-race guard. Throws if a parent tries to read an in-flight
 * deferred task's transcript before it has settled.
 */
export function assertNotPeeking(task: TaskRecord): void {
  if (!TERMINAL.has(task.status)) {
    throw new Error(
      `cannot peek at in-flight task ${task.taskId} (status=${task.status}); await settlement`,
    );
  }
}

/* ─────────────── Typed terminal-envelope result contract ────────────────── */

export interface SyncEnvelope {
  readonly kind: "sync";
  readonly content: readonly ThreadItem[];
  readonly usage: TurnUsage;
  readonly agentId: string;
  readonly toolUses: number;
  readonly durationMs: number;
}

export interface DeferredEnvelope {
  readonly kind: "deferred";
  readonly taskId: string;
  readonly channel: string;
}

export type DispatchEnvelope = SyncEnvelope | DeferredEnvelope;

const NO_OUTPUT_MARKER: ThreadItem = {
  id: "subagent_no_output",
  type: "error",
  message: "subagent completed but returned no output",
};

const threadItemShape = z.object({ id: z.string(), type: z.string() });

/** Empty content is never silently empty — normalize to one explicit marker. */
function normalizeContent(content: readonly ThreadItem[]): readonly ThreadItem[] {
  for (const item of content) threadItemShape.parse(item);
  return content.length === 0 ? [NO_OUTPUT_MARKER] : content;
}

function countToolUses(content: readonly ThreadItem[]): number {
  return content.filter((i) => i.type === "mcp_tool_call" || i.type === "command_execution").length;
}

/** Build a fire-and-forget deferred envelope for a registered task. */
export function makeDeferred(taskId: string, channel: string): DeferredEnvelope {
  if (!channel) throw new Error("deferred envelope requires a delivery channel");
  return { kind: "deferred", taskId, channel };
}

export interface SettleDeferredTarget {
  readonly taskId: string;
  readonly channel: string;
  readonly tenantId: string;
  readonly registry: TaskRegistry;
}

/**
 * Settle a previously-deferred task: drive it to `completed` (tenant-checked)
 * and produce the eventual sync-shaped result. Empty content is normalized to
 * the explicit no-output marker.
 */
export function settleDeferred(
  target: SettleDeferredTarget,
  content: readonly ThreadItem[],
  usage: TurnUsage,
): SyncEnvelope {
  const { taskId, tenantId, registry } = target;
  const rec = registry.get(taskId, tenantId);
  if (!rec) throw new Error("cannot settle unknown or cross-tenant task (fail closed)");
  if (!TERMINAL.has(rec.status)) {
    registry.transition(taskId, "completed", tenantId);
  }
  const normalized = normalizeContent(content);
  return {
    kind: "sync",
    content: normalized,
    usage,
    agentId: taskId,
    toolUses: countToolUses(normalized),
    durationMs: Math.max(0, Date.now() - rec.createdAtMs),
  };
}
