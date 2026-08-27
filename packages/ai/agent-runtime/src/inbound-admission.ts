/**
 * Inbound admission + conversation resolution (the multi-channel "front door").
 *
 * Faithful re-expression of a multi-channel assistant's pre-turn policy:
 * resolve a stable tenant-scoped session key from a normalized inbound
 * message, then gate it through allowlist → mention → debounce before it is
 * allowed to become an agent turn. Pure data/logic; time is injected (no
 * timers); tenant-scoped & fail-closed. No transport, no host I/O.
 */

import { z } from "zod";

/** Minimal structural inbound shape (declared locally — no sibling imports). */
export interface InboundLike {
  readonly tenantId: string;
  readonly channelId: string;
  readonly chatId: string;
  readonly threadId?: string | undefined;
  readonly senderId: string;
  readonly text: string;
  readonly receivedAt: string;
}

export type ChatType = "dm" | "group";
export type GroupBinding = "per-chat" | "per-sender" | "per-thread";

export interface SessionKeyOptions {
  readonly chatType?: ChatType | undefined;
  readonly groupBinding?: GroupBinding | undefined;
}

const tenantSchema = z.string().min(1, "tenantId is required");

/**
 * Deterministic, tenant-prefixed conversation/session key. Cross-tenant keys
 * can never collide (tenant is the first segment). Defaults: a group binds
 * per-chat, a DM binds per-sender; an explicit `groupBinding` overrides.
 */
export function resolveSessionKey(inbound: InboundLike, opts: SessionKeyOptions = {}): string {
  const tenantId = tenantSchema.parse(inbound.tenantId);
  const chatType: ChatType = opts.chatType ?? "group";
  const binding: GroupBinding =
    opts.groupBinding ?? (chatType === "dm" ? "per-sender" : "per-chat");

  const parts: string[] = [tenantId, inbound.channelId, inbound.chatId];
  if (binding === "per-sender") parts.push(inbound.senderId);
  else if (binding === "per-thread") parts.push(inbound.threadId ?? "");
  return parts.join(":");
}

// ── Allowlist ────────────────────────────────────────────────────────────────

export interface CompiledAllowlist {
  readonly exact: ReadonlySet<string>;
  readonly prefixes: ReadonlyArray<{ readonly prefix: string; readonly entry: string }>;
  readonly matchAny: boolean;
  readonly empty: boolean;
  readonly openWhenEmpty: boolean;
}

export interface AllowlistMatch {
  readonly allowed: boolean;
  readonly matchedBy?: string | undefined;
}

export function compileAllowlist(
  entries: ReadonlyArray<string>,
  opts: { openWhenEmpty?: boolean } = {},
): CompiledAllowlist {
  const exact = new Set<string>();
  const prefixes: { prefix: string; entry: string }[] = [];
  let matchAny = false;
  for (const raw of entries) {
    const entry = raw.trim();
    if (entry === "") continue;
    if (entry === "*") {
      matchAny = true;
    } else if (entry.endsWith(":*")) {
      prefixes.push({ prefix: entry.slice(0, -1), entry }); // keep through the ':'
    } else {
      exact.add(entry);
    }
  }
  const empty = !matchAny && exact.size === 0 && prefixes.length === 0;
  return {
    exact,
    prefixes,
    matchAny,
    empty,
    openWhenEmpty: opts.openWhenEmpty === true,
  };
}

export function matchesAllowlist(
  compiled: CompiledAllowlist,
  candidates: ReadonlyArray<string>,
): AllowlistMatch {
  if (compiled.empty) {
    return compiled.openWhenEmpty ? { allowed: true } : { allowed: false };
  }
  if (compiled.matchAny) return { allowed: true, matchedBy: "*" };
  for (const c of candidates) {
    if (compiled.exact.has(c)) return { allowed: true, matchedBy: c };
    const pre = compiled.prefixes.find((p) => c.startsWith(p.prefix));
    if (pre) return { allowed: true, matchedBy: pre.entry };
  }
  return { allowed: false };
}

// ── Mention gating ───────────────────────────────────────────────────────────

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/** Case-insensitive, word-boundary-aware handle detection. */
export function hasMention(text: string, handles: ReadonlyArray<string>): boolean {
  return handles.some((h) => {
    const handle = h.trim();
    if (handle === "") return false;
    // Not followed by a word char → `@bot` ≠ `@botanist`.
    const re = new RegExp(`${escapeRegExp(handle)}(?!\\w)`, "i");
    return re.test(text);
  });
}

export interface MentionContext {
  readonly chatType: ChatType;
  readonly assistantHandles: ReadonlyArray<string>;
  readonly text: string;
  readonly isReplyToAssistant?: boolean | undefined;
}

/** A group message is gated unless it mentions the assistant or replies to it. */
export function requiresMention(ctx: MentionContext): boolean {
  if (ctx.chatType === "dm") return false;
  if (ctx.isReplyToAssistant === true) return false;
  return !hasMention(ctx.text, ctx.assistantHandles);
}

// ── Debounce ─────────────────────────────────────────────────────────────────

export type DebounceResult = { admit: false } | { admit: true; merged: string };

interface DebounceBuffer {
  windowStart: number;
  parts: string[];
}

/**
 * Coalesces a burst per session key. Time is injected (`nowMs`). A later
 * offer whose window has closed flushes (admits) the prior buffer and opens
 * a fresh window for the new message. `flush` force-admits regardless of the
 * window and clears state.
 */
export class InboundDebouncer {
  readonly #windowMs: number;
  readonly #buffers = new Map<string, DebounceBuffer>();

  constructor(opts: { windowMs?: number } = {}) {
    this.#windowMs = opts.windowMs ?? 1500;
  }

  offer(sessionKey: string, message: string, nowMs: number): DebounceResult {
    const buf = this.#buffers.get(sessionKey);
    if (!buf) {
      this.#buffers.set(sessionKey, { windowStart: nowMs, parts: [message] });
      return { admit: false };
    }
    if (nowMs - buf.windowStart >= this.#windowMs) {
      const merged = buf.parts.join("\n");
      this.#buffers.set(sessionKey, { windowStart: nowMs, parts: [message] });
      return { admit: true, merged };
    }
    buf.parts.push(message);
    return { admit: false };
  }

  flush(sessionKey: string, _nowMs: number): DebounceResult {
    const buf = this.#buffers.get(sessionKey);
    if (!buf) return { admit: false };
    this.#buffers.delete(sessionKey);
    return { admit: true, merged: buf.parts.join("\n") };
  }
}

// ── Compose ──────────────────────────────────────────────────────────────────

export interface AdmissionPolicy {
  readonly chatType: ChatType;
  readonly allowlist: CompiledAllowlist;
  readonly assistantHandles: ReadonlyArray<string>;
  readonly groupBinding?: GroupBinding | undefined;
}

export interface AdmissionDeps {
  readonly debouncer: InboundDebouncer;
  readonly nowMs?: number | undefined;
  readonly isReplyToAssistant?: boolean | undefined;
}

export type AdmissionReason = "empty-tenant" | "not-allowlisted" | "mention-required" | "debounced";

export type AdmissionResult =
  | { readonly admit: true; readonly sessionKey: string; readonly text: string }
  | { readonly admit: false; readonly reason: AdmissionReason };

/**
 * Pipeline: tenant → allowlist → session key → debounce → mention.
 *
 * A window-closing offer admits the PRIOR (already-gated) buffered content,
 * so a message that itself lacks a mention can still flush the conversation.
 * The current message's mention gate only governs whether it produces a
 * `mention-required` vs `debounced` outcome while it waits.
 */
export function admitInbound(
  inbound: InboundLike,
  policy: AdmissionPolicy,
  deps: AdmissionDeps,
): AdmissionResult {
  if (typeof inbound.tenantId !== "string" || inbound.tenantId.trim() === "") {
    return { admit: false, reason: "empty-tenant" };
  }

  const allow = matchesAllowlist(policy.allowlist, [inbound.senderId]);
  if (!allow.allowed) return { admit: false, reason: "not-allowlisted" };

  const sessionKey = resolveSessionKey(inbound, {
    chatType: policy.chatType,
    groupBinding: policy.groupBinding,
  });

  const nowMs = deps.nowMs ?? Date.now();
  const result = deps.debouncer.offer(sessionKey, inbound.text, nowMs);
  if (result.admit) {
    return { admit: true, sessionKey, text: result.merged };
  }

  const gated = requiresMention({
    chatType: policy.chatType,
    assistantHandles: policy.assistantHandles,
    text: inbound.text,
    isReplyToAssistant: deps.isReplyToAssistant,
  });
  return { admit: false, reason: gated ? "mention-required" : "debounced" };
}
