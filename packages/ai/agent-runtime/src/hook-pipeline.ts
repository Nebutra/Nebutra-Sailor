/**
 * Hook pipeline (WRAP — config-driven orchestrator hooks).
 *
 * Faithful re-expression of the upstream config-driven, decision-returning
 * hook system. This is the configuration layer ABOVE the bare {@link ToolHooks}
 * interface in `./tools.js`: events are matched by an event + matcher
 * (+ optional ifCondition), fanned out to transports in parallel, and merged
 * into a single deterministic {@link HookOutcome}.
 *
 * MULTI-TENANT SAFETY — the upstream `command`/shell/async (host-process)
 * transports are deliberately DROPPED. In a multi-tenant runtime, executing a
 * tenant-supplied host command is unbounded RCE against the shared process and
 * cannot be sandboxed at this layer. Only in-process `function`, caller-fetched
 * `http`, and caller-injected `prompt` transports are supported — each fails
 * closed and cannot reach the host shell.
 */

import { z } from "zod";
import type { ToolDispatchContext, ToolHooks } from "./tools";

/**
 * Event taxonomy — ported verbatim from the upstream hook system.
 * The matcher is matched against the tool name (tool events) or the event
 * name itself (lifecycle events).
 */
export type HookEvent =
  | "PreToolUse"
  | "PostToolUse"
  | "PostToolUseFailure"
  | "UserPromptSubmit"
  | "SessionStart"
  | "SessionEnd"
  | "Stop"
  | "StopFailure"
  | "SubagentStart"
  | "SubagentStop"
  | "PreCompact"
  | "PostCompact"
  | "PermissionRequest"
  | "PermissionDenied"
  | "TaskCreated"
  | "TaskCompleted"
  | "ConfigChange"
  | "FileChanged";

/** Tenant-scoped context — reuses the dispatch context shape from `./tools.js`. */
export type HookContext = ToolDispatchContext;

/** The event payload presented to a transport. */
export interface HookPayload {
  /** The tool name (tool events) or event name (lifecycle events). */
  readonly name: string;
  /** Parsed tool/event input. */
  readonly input: unknown;
  /** Tool output (only present for Post* events). */
  readonly toolOutput?: unknown;
}

/**
 * Decision protocol — ported verbatim. A transport returns a PARTIAL outcome;
 * the pipeline merges all partials with deterministic precedence.
 */
export interface HookOutcome {
  readonly preventContinuation?: boolean | undefined;
  readonly stopReason?: string | undefined;
  readonly permissionBehavior?: "allow" | "deny" | "ask" | undefined;
  readonly blockingError?: string | undefined;
  readonly additionalContext?: string | undefined;
  readonly updatedInput?: unknown;
  readonly updatedToolOutput?: unknown;
  readonly systemMessage?: string | undefined;
}

/** Exit-code-style lane for the function transport. */
export interface HookExitResult {
  readonly code: number;
  readonly stdout?: string;
  readonly stderr?: string;
}

type FunctionRunResult = Partial<HookOutcome> | HookExitResult;

/** In-process transport — the tenant-safe default. */
export interface FunctionTransport {
  readonly kind: "function";
  readonly run: (payload: HookPayload, ctx: HookContext) => Promise<FunctionRunResult>;
}

/** HTTP transport — caller injects `fetchImpl`; absolute https + fail-closed. */
export interface HttpTransport {
  readonly kind: "http";
  readonly url: string;
  readonly allowEnvVars?: readonly string[];
  readonly fetchImpl: (url: string, init: RequestInit) => Promise<Response>;
}

/** Prompt transport — caller injects the LLM evaluator. */
export interface PromptTransport {
  readonly kind: "prompt";
  readonly model: string;
  readonly llmEval: (payload: HookPayload, ctx: HookContext) => Promise<Partial<HookOutcome>>;
}

export type HookTransport = FunctionTransport | HttpTransport | PromptTransport;

/** A single hook configuration entry. */
export interface HookConfig {
  readonly event: HookEvent;
  /** `"*"` | exact | pipe-list (`"Write|Edit"`) | `/regex/`. */
  readonly matcher: string;
  /** Predicate over parsed input, evaluated BEFORE the transport runs. */
  readonly ifCondition?: (input: unknown, ctx: HookContext) => boolean;
  readonly transport: HookTransport;
}

/** Out-of-band progress event — decoupled from outcomes. */
export interface HookProgressEvent {
  readonly phase: "started" | "completed";
  readonly event: HookEvent;
  readonly matcher: string;
  readonly tenantId: string;
}

type HookProgressListener = (e: HookProgressEvent) => void;

const listeners = new Set<HookProgressListener>();

/** Subscribe to out-of-band hook progress. Returns an unsubscribe function. */
export function onHookEvent(listener: HookProgressListener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

function emit(e: HookProgressEvent): void {
  for (const l of listeners) {
    try {
      l(e);
    } catch {
      // progress listeners must never affect pipeline outcomes
    }
  }
}

/**
 * Pure matcher: `"*"` | exact | pipe-list | `/regex/`.
 */
export function matchesMatcher(matcher: string, name: string): boolean {
  if (matcher === "*") return true;
  if (matcher.length >= 2 && matcher.startsWith("/") && matcher.endsWith("/")) {
    try {
      return new RegExp(matcher.slice(1, -1)).test(name);
    } catch {
      return false;
    }
  }
  if (matcher.includes("|")) {
    return matcher.split("|").some((m) => m === name);
  }
  return matcher === name;
}

const partialOutcomeSchema: z.ZodType<Partial<HookOutcome>> = z
  .object({
    preventContinuation: z.boolean().optional(),
    stopReason: z.string().optional(),
    permissionBehavior: z.enum(["allow", "deny", "ask"]).optional(),
    blockingError: z.string().optional(),
    additionalContext: z.string().optional(),
    updatedInput: z.unknown().optional(),
    updatedToolOutput: z.unknown().optional(),
    systemMessage: z.string().optional(),
  })
  .strict()
  .partial();

function isExitResult(r: FunctionRunResult): r is HookExitResult {
  return typeof (r as HookExitResult).code === "number";
}

function exitToOutcome(r: HookExitResult): Partial<HookOutcome> {
  if (r.code === 2) {
    return {
      preventContinuation: true,
      blockingError: (r.stderr ?? "").trim() || "hook exited with code 2",
    };
  }
  if (r.code !== 0) {
    return {
      preventContinuation: true,
      blockingError: (r.stderr ?? "").trim() || `hook exited with code ${r.code}`,
    };
  }
  return r.stdout ? { additionalContext: r.stdout } : {};
}

async function runTransport(
  transport: HookTransport,
  payload: HookPayload,
  ctx: HookContext,
): Promise<Partial<HookOutcome>> {
  if (transport.kind === "function") {
    const result = await transport.run(payload, ctx);
    if (isExitResult(result)) return exitToOutcome(result);
    return partialOutcomeSchema.parse(result);
  }

  if (transport.kind === "prompt") {
    const result = await transport.llmEval(payload, ctx);
    return partialOutcomeSchema.parse(result);
  }

  // http — fail-closed on non-https / non-2xx / unparseable body.
  let url: URL;
  try {
    url = new URL(transport.url);
  } catch {
    return failClosed(`invalid hook url: ${transport.url}`);
  }
  if (url.protocol !== "https:") {
    return failClosed(`hook url must be https (got ${url.protocol})`);
  }
  try {
    const res = await transport.fetchImpl(url.toString(), {
      method: "POST",
      headers: { "content-type": "application/json", "x-tenant-id": ctx.tenantId },
      body: JSON.stringify({ payload, tenantId: ctx.tenantId, threadId: ctx.threadId }),
    });
    if (res.status < 200 || res.status >= 300) {
      return failClosed(`hook endpoint returned ${res.status}`);
    }
    const json: unknown = await res.json();
    return partialOutcomeSchema.parse(json);
  } catch (err) {
    return failClosed(`hook transport failed: ${String(err)}`);
  }
}

function failClosed(reason: string): Partial<HookOutcome> {
  return { preventContinuation: true, blockingError: reason };
}

const DENY_PRECEDENCE: ReadonlyArray<HookOutcome["permissionBehavior"]> = ["deny", "ask", "allow"];

function mergeOutcomes(parts: ReadonlyArray<Partial<HookOutcome>>): HookOutcome {
  const contexts: string[] = [];
  let permission: HookOutcome["permissionBehavior"];
  let prevent = false;
  let blockingError: string | undefined;
  let stopReason: string | undefined;
  let systemMessage: string | undefined;
  let updatedInput: { value: unknown } | undefined;
  let updatedToolOutput: { value: unknown } | undefined;

  for (const p of parts) {
    if (p.additionalContext !== undefined) contexts.push(p.additionalContext);
    if (p.preventContinuation) prevent = true;
    if (p.blockingError !== undefined && blockingError === undefined) {
      blockingError = p.blockingError;
    }
    if (p.stopReason !== undefined && stopReason === undefined) stopReason = p.stopReason;
    if (p.systemMessage !== undefined && systemMessage === undefined) {
      systemMessage = p.systemMessage;
    }
    if (p.permissionBehavior !== undefined) {
      if (
        permission === undefined ||
        DENY_PRECEDENCE.indexOf(p.permissionBehavior) < DENY_PRECEDENCE.indexOf(permission)
      ) {
        permission = p.permissionBehavior;
      }
    }
    // last writer wins, in stable (input) order
    if ("updatedInput" in p) updatedInput = { value: p.updatedInput };
    if ("updatedToolOutput" in p) updatedToolOutput = { value: p.updatedToolOutput };
  }

  if (blockingError !== undefined) prevent = true;
  if (permission === "deny") prevent = prevent || false;

  const outcome: Mutable<HookOutcome> = {};
  if (prevent) outcome.preventContinuation = true;
  if (blockingError !== undefined) outcome.blockingError = blockingError;
  if (stopReason !== undefined) outcome.stopReason = stopReason;
  if (systemMessage !== undefined) outcome.systemMessage = systemMessage;
  if (permission !== undefined) outcome.permissionBehavior = permission;
  if (contexts.length > 0) outcome.additionalContext = contexts.join("\n");
  if (updatedInput !== undefined) outcome.updatedInput = updatedInput.value;
  if (updatedToolOutput !== undefined) outcome.updatedToolOutput = updatedToolOutput.value;
  return outcome;
}

type Mutable<T> = { -readonly [K in keyof T]: T[K] };

/**
 * Select matching hooks, fan out in parallel, merge with deterministic
 * precedence. tenantId is mandatory — empty fails closed (throws).
 */
export async function runHooks(
  event: HookEvent,
  payload: HookPayload,
  hooks: ReadonlyArray<HookConfig>,
  ctx: HookContext,
): Promise<HookOutcome> {
  if (!ctx || typeof ctx.tenantId !== "string" || ctx.tenantId.trim() === "") {
    throw new Error("runHooks: tenantId is mandatory and must be non-empty (fail-closed)");
  }

  const selected = hooks.filter(
    (h) =>
      h.event === event &&
      matchesMatcher(h.matcher, payload.name) &&
      (h.ifCondition === undefined || h.ifCondition(payload.input, ctx) === true),
  );

  if (selected.length === 0) return {};

  // Stable order = config order, preserved despite parallel execution.
  const results = await Promise.all(
    selected.map(async (h) => {
      emit({ phase: "started", event, matcher: h.matcher, tenantId: ctx.tenantId });
      try {
        return await runTransport(h.transport, payload, ctx);
      } catch (err) {
        return failClosed(`hook crashed: ${String(err)}`);
      } finally {
        emit({ phase: "completed", event, matcher: h.matcher, tenantId: ctx.tenantId });
      }
    }),
  );

  return mergeOutcomes(results);
}

/**
 * Adapt the bare {@link ToolHooks} interface (from `./tools.js`) into
 * config-driven function-transport entries — the in-process transport feeding
 * the lower layer. preToolUse/postToolUse are void-returning, so the produced
 * outcome is always empty (they observe; they do not decide here).
 */
export function fromToolHooks(toolHooks: ToolHooks): HookConfig[] {
  const configs: HookConfig[] = [];
  if (toolHooks.preToolUse) {
    const pre = toolHooks.preToolUse;
    configs.push({
      event: "PreToolUse",
      matcher: "*",
      transport: {
        kind: "function",
        run: async (payload, ctx) => {
          await pre(payload.name, payload.input, ctx);
          return {};
        },
      },
    });
  }
  if (toolHooks.postToolUse) {
    const post = toolHooks.postToolUse;
    configs.push({
      event: "PostToolUse",
      matcher: "*",
      transport: {
        kind: "function",
        run: async (payload, ctx) => {
          await post(payload.name, payload.toolOutput, ctx);
          return {};
        },
      },
    });
  }
  return configs;
}
