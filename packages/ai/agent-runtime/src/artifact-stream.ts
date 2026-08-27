/**
 * Streaming artifact/action protocol.
 *
 * Faithful re-expression of an open-source web-app-builder's streamed-plan
 * DSL: the model emits text containing `<artifact>` blocks that wrap an
 * ordered list of `<action>` blocks. This module provides:
 *
 *   1. A neutral `PlanAction` discriminated union (file / shell / start /
 *      build / data).
 *   2. An incremental, chunk-boundary-safe `ArtifactStreamParser`.
 *   3. A delegating `ActionRunner` state machine (no in-process exec, no
 *      host FS — all side effects go through injected ports).
 *
 * Multi-tenant, fail-closed: a `tenantId` is mandatory at every entry point;
 * an empty tenant throws, and per-tenant runner state is isolated.
 */

import { z } from "zod";

// ── Action union ─────────────────────────────────────────────────────────────

export interface FileAction {
  readonly type: "file";
  readonly filePath: string;
  readonly content: string;
}

export interface ShellAction {
  readonly type: "shell";
  readonly content: string;
}

export interface StartAction {
  readonly type: "start";
  readonly content: string;
}

export interface BuildAction {
  readonly type: "build";
  readonly content: string;
}

export interface DataAction {
  readonly type: "data";
  readonly operation: "migration" | "query";
  readonly filePath?: string | undefined;
  readonly projectId?: string | undefined;
  readonly content: string;
}

export type PlanAction = FileAction | ShellAction | StartAction | BuildAction | DataAction;

const DataActionSchema = z.object({
  type: z.literal("data"),
  operation: z.union([z.literal("migration"), z.literal("query")]),
  filePath: z.string().optional(),
  projectId: z.string().optional(),
  content: z.string(),
});

// ── Tenant context ───────────────────────────────────────────────────────────

export interface TenantContext {
  readonly tenantId: string;
}

function assertTenant(ctx: TenantContext): string {
  const tenantId = ctx?.tenantId;
  if (typeof tenantId !== "string" || tenantId.trim().length === 0) {
    throw new Error("artifact-stream: tenantId is mandatory and must be non-empty (fail-closed)");
  }
  return tenantId;
}

// ── Pure helpers ─────────────────────────────────────────────────────────────

/**
 * Strip a single ```lang ... ``` fenced wrapper if (and only if) the trimmed
 * content opens with a fence on its own line and ends with a closing fence.
 * Inner fences are preserved (single-wrapper semantics).
 */
export function stripFencedWrapper(input: string): string {
  const trimmed = input.trim();
  const opener = /^```[^\n]*\n/;
  const match = opener.exec(trimmed);
  if (match === null || !trimmed.endsWith("```")) {
    return input;
  }
  const body = trimmed.slice(match[0].length, trimmed.length - 3);
  return body.replace(/\n$/, "");
}

/** Unescape the `&lt;` / `&gt;` entities the model emits inside action bodies. */
export function unescapeEntities(input: string): string {
  return input.replace(/&lt;/g, "<").replace(/&gt;/g, ">");
}

function normalizeActionContent(raw: string): string {
  return unescapeEntities(stripFencedWrapper(raw));
}

// ── Parser ───────────────────────────────────────────────────────────────────

export interface ArtifactEvent {
  readonly tenantId: string;
  readonly messageId: string;
  readonly artifactId: string;
  readonly title: string;
}

export interface ActionEvent {
  readonly tenantId: string;
  readonly messageId: string;
  readonly artifactId: string;
  readonly actionId: string;
  readonly action: PlanAction;
}

export interface ArtifactStreamCallbacks {
  readonly onArtifactOpen?: ((e: ArtifactEvent) => void) | undefined;
  readonly onArtifactClose?: ((e: ArtifactEvent) => void) | undefined;
  readonly onActionOpen?: ((e: ActionEvent) => void) | undefined;
  readonly onActionStream?: ((e: ActionEvent) => void) | undefined;
  readonly onActionClose?: ((e: ActionEvent) => void) | undefined;
}

interface ParseState {
  buffer: string;
  position: number;
  insideArtifact: boolean;
  insideAction: boolean;
  artifactCounter: number;
  currentArtifact?: { id: string; title: string } | undefined;
  currentAction?: { actionId: string; attrs: Record<string, string> } | undefined;
  streamedLength: number;
  opened: boolean;
}

function createState(): ParseState {
  return {
    buffer: "",
    position: 0,
    insideArtifact: false,
    insideAction: false,
    artifactCounter: 0,
    streamedLength: 0,
    opened: false,
  };
}

function parseAttrs(tag: string): Record<string, string> {
  const attrs: Record<string, string> = {};
  const re = /(\w+)="([^"]*)"/g;
  let m: RegExpExecArray | null = re.exec(tag);
  while (m !== null) {
    attrs[m[1] as string] = m[2] as string;
    m = re.exec(tag);
  }
  return attrs;
}

function buildAction(attrs: Record<string, string>, content: string): PlanAction {
  const type = attrs.type;
  const normalized = normalizeActionContent(content);
  switch (type) {
    case "file":
      return { type: "file", filePath: attrs.filePath ?? "", content: normalized };
    case "shell":
      return { type: "shell", content: normalized };
    case "start":
      return { type: "start", content: normalized };
    case "build":
      return { type: "build", content: normalized };
    case "data": {
      const candidate: Record<string, unknown> = {
        type: "data",
        operation: attrs.operation === "query" ? "query" : "migration",
        content: normalized,
      };
      if (attrs.filePath !== undefined) candidate.filePath = attrs.filePath;
      if (attrs.projectId !== undefined) candidate.projectId = attrs.projectId;
      return DataActionSchema.parse(candidate) as DataAction;
    }
    default:
      throw new Error(`artifact-stream: unknown action type "${String(type)}"`);
  }
}

/**
 * Incremental parser. State is keyed by `messageId` so independent streams
 * never bleed into each other; a tag split across a chunk boundary is
 * resumed from `position` and never re-emitted.
 */
export class ArtifactStreamParser {
  private readonly cb: ArtifactStreamCallbacks;
  private readonly states = new Map<string, ParseState>();

  constructor(callbacks: ArtifactStreamCallbacks) {
    this.cb = callbacks;
  }

  parse(messageId: string, ctx: TenantContext, chunk: string): void {
    const tenantId = assertTenant(ctx);
    const state = this.states.get(messageId) ?? createState();
    this.states.set(messageId, state);
    state.buffer += chunk;
    this.drain(messageId, tenantId, state);
  }

  private drain(messageId: string, tenantId: string, s: ParseState): void {
    // Loop while we can make forward progress; stop when the next needed
    // token is incomplete (split across the next chunk boundary).
    for (;;) {
      const rest = s.buffer.slice(s.position);

      if (!s.insideArtifact) {
        const open = rest.indexOf("<artifact");
        if (open === -1) return;
        const end = rest.indexOf(">", open);
        if (end === -1) return; // tag continues in a later chunk
        const tag = rest.slice(open, end + 1);
        const attrs = parseAttrs(tag);
        s.position += end + 1;
        s.insideArtifact = true;
        s.currentArtifact = { id: attrs.id ?? "", title: attrs.title ?? "" };
        this.cb.onArtifactOpen?.({
          tenantId,
          messageId,
          artifactId: s.currentArtifact.id,
          title: s.currentArtifact.title,
        });
        continue;
      }

      if (!s.insideAction) {
        const close = rest.indexOf("</artifact>");
        const open = rest.indexOf("<action");
        if (open === -1 && close === -1) return;
        if (close !== -1 && (open === -1 || close < open)) {
          s.position += close + "</artifact>".length;
          const art = s.currentArtifact;
          s.insideArtifact = false;
          s.currentArtifact = undefined;
          if (art !== undefined) {
            this.cb.onArtifactClose?.({
              tenantId,
              messageId,
              artifactId: art.id,
              title: art.title,
            });
          }
          continue;
        }
        const end = rest.indexOf(">", open);
        if (end === -1) return; // open tag split across chunks
        const tag = rest.slice(open, end + 1);
        const attrs = parseAttrs(tag);
        const actionId = String(s.artifactCounter);
        s.artifactCounter += 1;
        s.position += end + 1;
        s.insideAction = true;
        s.streamedLength = 0;
        s.currentAction = { actionId, attrs };
        const art = s.currentArtifact;
        if (
          art !== undefined &&
          (attrs.type === "file" ||
            attrs.type === "shell" ||
            attrs.type === "start" ||
            attrs.type === "build" ||
            attrs.type === "data")
        ) {
          this.cb.onActionOpen?.({
            tenantId,
            messageId,
            artifactId: art.id,
            actionId,
            action: buildAction(attrs, ""),
          });
        }
        continue;
      }

      // Inside an action: look for its close tag.
      const closeIdx = rest.indexOf("</action>");
      const act = s.currentAction;
      const art = s.currentArtifact;
      if (closeIdx === -1) {
        // Partial content — stream the newly-seen portion (raw, un-normalized
        // since the closing fence may not have arrived yet).
        const partial = rest;
        if (partial.length > s.streamedLength && act !== undefined && art !== undefined) {
          s.streamedLength = partial.length;
          this.cb.onActionStream?.({
            tenantId,
            messageId,
            artifactId: art.id,
            actionId: act.actionId,
            action: buildAction(act.attrs, partial),
          });
        }
        return;
      }

      const content = rest.slice(0, closeIdx);
      s.position += closeIdx + "</action>".length;
      s.insideAction = false;
      if (act !== undefined && art !== undefined) {
        this.cb.onActionClose?.({
          tenantId,
          messageId,
          artifactId: art.id,
          actionId: act.actionId,
          action: buildAction(act.attrs, content),
        });
      }
      s.currentAction = undefined;
    }
  }
}

// ── Runner ───────────────────────────────────────────────────────────────────

export type ActionStatus = "pending" | "running" | "complete" | "aborted" | "failed";

export interface ActionState {
  readonly action: PlanAction;
  readonly status: ActionStatus;
  readonly executed: boolean;
  readonly error?: string | undefined;
}

export interface ActionPorts {
  readonly writeFile: (action: FileAction, ctx: TenantContext) => Promise<void>;
  readonly runShell: (
    action: ShellAction | StartAction | BuildAction,
    ctx: TenantContext,
  ) => Promise<{ exitCode: number; output: string }>;
  readonly dataOp: (action: DataAction, ctx: TenantContext) => Promise<void>;
}

export interface RunQueueOptions {
  readonly continueOnError?: boolean | undefined;
}

function setStatus(
  state: ActionState,
  status: ActionStatus,
  patch: { executed?: boolean; error?: string } = {},
): ActionState {
  return {
    action: state.action,
    status,
    executed: patch.executed ?? state.executed,
    error: patch.error ?? state.error,
  };
}

const ABORTABLE: ReadonlySet<ActionStatus> = new Set(["pending", "running"]);

export class ActionRunner {
  private readonly ports: ActionPorts;
  private readonly ctx: TenantContext;
  private readonly tenantId: string;
  private readonly map = new Map<string, ActionState>();
  private readonly order: string[] = [];

  constructor(ports: ActionPorts, ctx: TenantContext) {
    this.tenantId = assertTenant(ctx);
    this.ports = ports;
    this.ctx = { tenantId: this.tenantId };
  }

  register(actionId: string, action: PlanAction): void {
    if (this.map.has(actionId)) {
      throw new Error(`artifact-stream: action "${actionId}" already registered`);
    }
    this.map.set(actionId, { action, status: "pending", executed: false });
    this.order.push(actionId);
  }

  get(actionId: string): ActionState {
    const state = this.map.get(actionId);
    if (state === undefined) {
      throw new Error(
        `artifact-stream: action "${actionId}" not found for tenant "${this.tenantId}"`,
      );
    }
    return state;
  }

  abort(actionId: string): void {
    const state = this.get(actionId);
    if (!ABORTABLE.has(state.status)) {
      throw new Error(
        `artifact-stream: cannot abort action "${actionId}" from status "${state.status}"`,
      );
    }
    this.map.set(actionId, setStatus(state, "aborted"));
  }

  async runAction(actionId: string): Promise<void> {
    const state = this.get(actionId);
    if (state.status !== "pending") {
      throw new Error(
        `artifact-stream: illegal transition for "${actionId}": ${state.status} -> running`,
      );
    }
    this.map.set(actionId, setStatus(state, "running"));
    try {
      await this.dispatch(state.action);
      this.map.set(actionId, setStatus(this.get(actionId), "complete", { executed: true }));
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.map.set(
        actionId,
        setStatus(this.get(actionId), "failed", { executed: true, error: message }),
      );
    }
  }

  async runQueue(options: RunQueueOptions = {}): Promise<void> {
    const continueOnError = options.continueOnError ?? false;
    for (const actionId of this.order) {
      const state = this.get(actionId);
      if (state.status !== "pending") continue;
      await this.runAction(actionId);
      if (this.get(actionId).status === "failed" && !continueOnError) {
        return;
      }
    }
  }

  private async dispatch(action: PlanAction): Promise<void> {
    switch (action.type) {
      case "file":
        await this.ports.writeFile(action, this.ctx);
        return;
      case "shell":
      case "start":
      case "build":
        await this.ports.runShell(action, this.ctx);
        return;
      case "data":
        await this.ports.dataOp(action, this.ctx);
        return;
      default: {
        const exhaustive: never = action;
        throw new Error(`artifact-stream: unhandled action ${JSON.stringify(exhaustive)}`);
      }
    }
  }
}
