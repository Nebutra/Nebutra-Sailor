/**
 * Thread / Turn / Item model + event lifecycle (WRAP — capability #6).
 *
 * Faithful re-expression of the upstream agent-runtime item taxonomy and event
 * stream (generated TS types in the source SDK, themselves derived from the
 * Rust `exec_events` definitions). Renamed to neutral domain terms and made
 * tenant-scoped. No enforcement here — pure data + state machine.
 *
 * Hierarchy: Thread -> Turn -> Item.
 *   Thread : a durable, tenant-scoped conversation (resumable by replay).
 *   Turn   : one user-input -> model-completion cycle.
 *   Item   : the atomic recorded unit inside a turn.
 */

/** Lifecycle of a stateful item that runs over time. */
export type RunStatus = "in_progress" | "completed" | "failed";

/** Terminal status for an applied patch (no `in_progress` terminal form). */
export type PatchApplyStatus = "completed" | "failed";

/** Kind of a single file mutation within a patch. */
export type PatchChangeKind = "add" | "delete" | "update";

export interface FileUpdateChange {
  readonly path: string;
  readonly kind: PatchChangeKind;
}

interface ItemBase {
  /** Stable identifier, unique within the owning thread. */
  readonly id: string;
}

/** Natural-language (or structured-JSON) response from the agent. */
export interface AgentMessageItem extends ItemBase {
  readonly type: "agent_message";
  readonly text: string;
}

/** The agent's reasoning summary. */
export interface ReasoningItem extends ItemBase {
  readonly type: "reasoning";
  readonly text: string;
}

/**
 * A command the agent asked to run. The runtime itself never executes it —
 * see {@link ./sandbox} for the external-sandbox delegation seam.
 */
export interface CommandExecutionItem extends ItemBase {
  readonly type: "command_execution";
  readonly command: string;
  /** Aggregated stdout+stderr captured by the external executor. */
  readonly aggregatedOutput: string;
  /** Present once the command exits. */
  readonly exitCode?: number;
  readonly status: RunStatus;
}

/** A patch produced by the agent. Emitted once it succeeds or fails. */
export interface FileChangeItem extends ItemBase {
  readonly type: "file_change";
  readonly changes: readonly FileUpdateChange[];
  readonly status: PatchApplyStatus;
}

/** A call to a tool exposed via an MCP server. */
export interface McpToolCallItem extends ItemBase {
  readonly type: "mcp_tool_call";
  readonly server: string;
  readonly tool: string;
  readonly arguments: unknown;
  readonly result?: { readonly content: unknown; readonly structuredContent?: unknown };
  readonly error?: { readonly message: string };
  readonly status: RunStatus;
}

/** A web-search request issued by the agent. */
export interface WebSearchItem extends ItemBase {
  readonly type: "web_search";
  readonly query: string;
}

export interface TodoEntry {
  readonly text: string;
  readonly completed: boolean;
}

/** The agent's running to-do list for the turn. */
export interface TodoListItem extends ItemBase {
  readonly type: "todo_list";
  readonly items: readonly TodoEntry[];
}

/** A non-fatal error surfaced as an item (the turn may continue). */
export interface ErrorItem extends ItemBase {
  readonly type: "error";
  readonly message: string;
}

/** Canonical closed union of thread items. */
export type ThreadItem =
  | AgentMessageItem
  | ReasoningItem
  | CommandExecutionItem
  | FileChangeItem
  | McpToolCallItem
  | WebSearchItem
  | TodoListItem
  | ErrorItem;

export type ThreadItemType = ThreadItem["type"];

/** Token accounting for a completed turn. */
export interface TurnUsage {
  readonly inputTokens: number;
  readonly cachedInputTokens: number;
  readonly outputTokens: number;
  readonly reasoningOutputTokens: number;
}

/** Fatal error payload emitted by the stream. */
export interface ThreadError {
  readonly message: string;
}

/**
 * Event lifecycle observed by a client:
 *   thread.started -> turn.started -> (item.started -> item.updated* ->
 *   item.completed)* -> turn.completed | turn.failed, with a terminal `error`.
 */
export type ThreadEvent =
  | { readonly type: "thread.started"; readonly threadId: string }
  | { readonly type: "turn.started" }
  | { readonly type: "turn.completed"; readonly usage: TurnUsage }
  | { readonly type: "turn.failed"; readonly error: ThreadError }
  | { readonly type: "item.started"; readonly item: ThreadItem }
  | { readonly type: "item.updated"; readonly item: ThreadItem }
  | { readonly type: "item.completed"; readonly item: ThreadItem }
  | { readonly type: "error"; readonly message: string };

export type ThreadEventType = ThreadEvent["type"];

/**
 * Per-turn config snapshot. Immutable within a turn; rebindable between turns.
 * Tenant defaults are merged with per-request overrides via {@link mergeTurnConfig}.
 */
export interface TurnConfig {
  readonly model: string;
  readonly provider: string;
  /** Stringly-typed approval-policy tag — see {@link ./policy}. */
  readonly approvalPolicy: string;
  /** Stringly-typed capability-policy tag — see {@link ./policy}. */
  readonly capabilityPolicy: string;
  readonly reasoningEffort?: "low" | "medium" | "high";
}

export type TurnConfigOverrides = Partial<TurnConfig>;

/** Freeze a tenant-default config against per-turn overrides. */
export function mergeTurnConfig(base: TurnConfig, overrides?: TurnConfigOverrides): TurnConfig {
  return overrides ? { ...base, ...overrides } : { ...base };
}

/** Whether an event is a terminal turn outcome. */
export function isTurnTerminal(event: ThreadEvent): boolean {
  return event.type === "turn.completed" || event.type === "turn.failed";
}
