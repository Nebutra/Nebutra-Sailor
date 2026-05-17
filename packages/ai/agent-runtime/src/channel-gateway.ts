/**
 * Multi-channel gateway (WRAP — channel-adapter layer).
 *
 * A faithful, brand-neutral re-expression of a multi-channel AI assistant's
 * channel-adapter seam: every transport (chat platform, email, SMS, …) is
 * reduced to a single `ChannelAdapter` port that produces/consumes
 * channel-agnostic normalized contracts. Platform SDKs are NOT ported —
 * transport is injected through the port so this package stays dependency-free.
 *
 * Multi-tenant by construction: `tenantId` is mandatory on every operation and
 * fails closed (empty/blank/foreign tenant → typed error, never a silent pass).
 * Boundaries are validated with zod; inputs are never mutated.
 */

import { z } from "zod";

/* -------------------------------------------------------------------------- */
/* Branded ChannelId                                                          */
/* -------------------------------------------------------------------------- */

declare const channelIdBrand: unique symbol;

/** A validated, non-empty channel identifier. Construct via {@link asChannelId}. */
export type ChannelId = string & { readonly [channelIdBrand]: "ChannelId" };

const channelIdSchema = z.string().trim().min(1, "channelId is required (fail-closed)");

/** Brand a string as a {@link ChannelId}; throws on empty/blank input. */
export function asChannelId(value: string): ChannelId {
  return channelIdSchema.parse(value) as ChannelId;
}

/* -------------------------------------------------------------------------- */
/* Errors                                                                     */
/* -------------------------------------------------------------------------- */

/** Lookup/route against a channel that is not registered for the tenant. */
export class UnknownChannelError extends Error {
  override readonly name = "UnknownChannelError";
  constructor(channelId: string) {
    super(`Unknown channel "${channelId}" for the current tenant`);
  }
}

/** A channelId is registered twice within the same tenant scope. */
export class DuplicateChannelError extends Error {
  override readonly name = "DuplicateChannelError";
  constructor(channelId: string) {
    super(`Channel "${channelId}" is already registered for this tenant`);
  }
}

/** A tenantId on a contract does not match the resolved adapter scope. */
export class TenantMismatchError extends Error {
  override readonly name = "TenantMismatchError";
  constructor(detail: string) {
    super(`Tenant mismatch: ${detail}`);
  }
}

/* -------------------------------------------------------------------------- */
/* Tenant guard (fail-closed)                                                 */
/* -------------------------------------------------------------------------- */

const tenantIdSchema = z.string().trim().min(1, "tenantId is required (fail-closed)");

/** Returns a trimmed, non-empty tenantId or throws (fail-closed). */
function requireTenant(tenantId: string): string {
  return tenantIdSchema.parse(tenantId);
}

/* -------------------------------------------------------------------------- */
/* Normalized contracts                                                       */
/* -------------------------------------------------------------------------- */

/** A channel-agnostic attachment reference. */
export interface InboundAttachment {
  readonly kind: "image" | "file" | "audio";
  readonly ref: string;
}

/** A normalized, channel-agnostic inbound user message. */
export interface InboundMessage {
  readonly tenantId: string;
  readonly channelId: ChannelId;
  readonly chatId: string;
  readonly threadId?: string | undefined;
  readonly senderId: string;
  readonly senderLabel?: string | undefined;
  readonly text: string;
  readonly attachments?: readonly InboundAttachment[] | undefined;
  readonly receivedAt: string;
  readonly raw: unknown;
}

/** A normalized, channel-agnostic outbound message. */
export interface OutboundMessage {
  readonly tenantId: string;
  readonly channelId: ChannelId;
  readonly chatId: string;
  readonly threadId?: string | undefined;
  readonly text: string;
  readonly replyToMessageId?: string | undefined;
}

/** Capability surface a channel exposes. */
export interface ChannelCapabilities {
  readonly threads: boolean;
  readonly reactions: boolean;
  readonly streaming: boolean;
}

/** Static description of a channel. */
export interface ChannelMeta {
  readonly id: ChannelId;
  readonly displayName: string;
  readonly capabilities: ChannelCapabilities;
}

/* -------------------------------------------------------------------------- */
/* Boundary schemas                                                           */
/* -------------------------------------------------------------------------- */

const attachmentSchema = z.object({
  kind: z.enum(["image", "file", "audio"]),
  ref: z.string().min(1),
});

const inboundSchema = z.object({
  tenantId: tenantIdSchema,
  channelId: channelIdSchema,
  chatId: z.string().min(1, "chatId is required"),
  threadId: z.string().min(1).optional(),
  senderId: z.string().min(1, "senderId is required"),
  senderLabel: z.string().min(1).optional(),
  text: z.string(),
  attachments: z.array(attachmentSchema).optional(),
  receivedAt: z.string().min(1, "receivedAt is required"),
  raw: z.unknown(),
});

const outboundSchema = z.object({
  tenantId: tenantIdSchema,
  channelId: channelIdSchema,
  chatId: z.string().min(1, "chatId is required"),
  threadId: z.string().min(1).optional(),
  text: z.string().min(1, "text is required"),
  replyToMessageId: z.string().min(1).optional(),
});

/**
 * Validate an adapter-produced inbound message. Throws a clearly-labelled
 * error (never a raw TypeError) when an adapter returns a malformed shape.
 */
function validateInbound(candidate: unknown): InboundMessage {
  const parsed = inboundSchema.safeParse(candidate);
  if (!parsed.success) {
    throw new Error(
      `Adapter produced an invalid InboundMessage: ${parsed.error.issues
        .map((i) => `${i.path.join(".") || "(root)"} ${i.message}`)
        .join("; ")}`,
    );
  }
  const d = parsed.data;
  return {
    tenantId: d.tenantId,
    channelId: d.channelId as ChannelId,
    chatId: d.chatId,
    senderId: d.senderId,
    text: d.text,
    receivedAt: d.receivedAt,
    raw: d.raw,
    ...(d.threadId !== undefined ? { threadId: d.threadId } : {}),
    ...(d.senderLabel !== undefined ? { senderLabel: d.senderLabel } : {}),
    ...(d.attachments !== undefined ? { attachments: d.attachments } : {}),
  };
}

/** Validate an outbound message at the route boundary. */
function validateOutbound(candidate: unknown): OutboundMessage {
  const parsed = outboundSchema.safeParse(candidate);
  if (!parsed.success) {
    throw new Error(
      `Invalid OutboundMessage: ${parsed.error.issues
        .map((i) => `${i.path.join(".") || "(root)"} ${i.message}`)
        .join("; ")}`,
    );
  }
  const d = parsed.data;
  return {
    tenantId: d.tenantId,
    channelId: d.channelId as ChannelId,
    chatId: d.chatId,
    text: d.text,
    ...(d.threadId !== undefined ? { threadId: d.threadId } : {}),
    ...(d.replyToMessageId !== undefined ? { replyToMessageId: d.replyToMessageId } : {}),
  };
}

/* -------------------------------------------------------------------------- */
/* ChannelAdapter port                                                        */
/* -------------------------------------------------------------------------- */

/**
 * A transport adapter. Implementations wrap a concrete platform SDK (not
 * shipped here) and translate to/from the normalized contracts.
 *
 * - `parseInbound` MUST return `null` for events that are not user messages
 *   (joins, typing, presence, …) and MUST NOT throw on junk payloads. The
 *   resolved `tenantId` is stamped onto the result by the adapter.
 * - `sendOutbound` performs the actual delivery and returns the platform's
 *   message id.
 */
export interface ChannelAdapter {
  readonly meta: ChannelMeta;
  parseInbound(tenantId: string, raw: unknown): InboundMessage | null;
  sendOutbound(msg: OutboundMessage): Promise<{ messageId: string }>;
}

/* -------------------------------------------------------------------------- */
/* ChannelRegistry (per-op tenantId, fail-closed)                             */
/* -------------------------------------------------------------------------- */

/**
 * Tenant-scoped registry of {@link ChannelAdapter}s. Every operation takes an
 * explicit `tenantId`; a tenant only ever sees adapters it registered. Empty,
 * blank, or foreign tenants fail closed.
 */
export class ChannelRegistry {
  /** tenantId → (channelId → adapter). */
  readonly #byTenant = new Map<string, Map<string, ChannelAdapter>>();

  /** Register an adapter for a tenant. Duplicate channelId → throws. */
  register(tenantId: string, adapter: ChannelAdapter): void {
    const tid = requireTenant(tenantId);
    const channelId = asChannelId(adapter.meta.id);
    const tenantMap = this.#byTenant.get(tid) ?? new Map<string, ChannelAdapter>();
    if (tenantMap.has(channelId)) {
      throw new DuplicateChannelError(channelId);
    }
    const next = new Map(tenantMap);
    next.set(channelId, adapter);
    this.#byTenant.set(tid, next);
  }

  /** Resolve an adapter for a tenant. Unknown/foreign → UnknownChannelError. */
  lookup(tenantId: string, channelId: ChannelId): ChannelAdapter {
    const tid = requireTenant(tenantId);
    const adapter = this.#byTenant.get(tid)?.get(channelId);
    if (adapter === undefined) {
      throw new UnknownChannelError(channelId);
    }
    return adapter;
  }

  /** List the channel ids registered for a tenant (empty array if none). */
  list(tenantId: string): readonly string[] {
    const tid = requireTenant(tenantId);
    return [...(this.#byTenant.get(tid)?.keys() ?? [])];
  }
}

/* -------------------------------------------------------------------------- */
/* replyTo (pure helper)                                                      */
/* -------------------------------------------------------------------------- */

export interface ReplyOptions {
  readonly replyToMessageId?: string | undefined;
}

/**
 * Derive a correctly-addressed {@link OutboundMessage} from an inbound message:
 * same channel, chat, and thread. Pure — never mutates `inbound`. Fails closed
 * on an empty inbound tenantId.
 */
export function replyTo(
  inbound: InboundMessage,
  text: string,
  opts?: ReplyOptions,
): OutboundMessage {
  const tenantId = requireTenant(inbound.tenantId);
  return {
    tenantId,
    channelId: inbound.channelId,
    chatId: inbound.chatId,
    text,
    ...(inbound.threadId !== undefined ? { threadId: inbound.threadId } : {}),
    ...(opts?.replyToMessageId !== undefined ? { replyToMessageId: opts.replyToMessageId } : {}),
  };
}

/* -------------------------------------------------------------------------- */
/* ChannelGateway                                                             */
/* -------------------------------------------------------------------------- */

/**
 * Facade over a {@link ChannelRegistry}: ingest inbound payloads into
 * normalized messages and route outbound replies back through the originating
 * channel. Junk is swallowed (null); malformed adapter output and invalid
 * replies surface as typed validation errors rather than crashes.
 */
export class ChannelGateway {
  readonly #registry: ChannelRegistry;

  constructor(registry: ChannelRegistry) {
    this.#registry = registry;
  }

  /**
   * Resolve the adapter, parse the raw payload, and return the normalized
   * message (or `null` for non-message events). Never throws on junk; a
   * structurally-invalid adapter result is rejected via zod (typed error).
   */
  ingest(tenantId: string, channelId: ChannelId, raw: unknown): InboundMessage | null {
    const tid = requireTenant(tenantId);
    const adapter = this.#registry.lookup(tid, channelId);
    const parsed = adapter.parseInbound(tid, raw);
    if (parsed === null) return null;
    const validated = validateInbound(parsed);
    if (validated.tenantId !== tid) {
      throw new TenantMismatchError(
        `adapter stamped "${validated.tenantId}" but request scope is "${tid}"`,
      );
    }
    if (validated.channelId !== channelId) {
      throw new TenantMismatchError(
        `adapter stamped channel "${validated.channelId}" but request channel is "${channelId}"`,
      );
    }
    return validated;
  }

  /**
   * Send a reply back through the channel the conversation belongs to
   * (`reply.channelId`). Tenant must be non-empty and resolve within scope.
   */
  async route(reply: OutboundMessage): Promise<{ messageId: string }> {
    const validated = validateOutbound(reply);
    const adapter = this.#registry.lookup(validated.tenantId, validated.channelId);
    if (adapter.meta.id !== validated.channelId) {
      throw new TenantMismatchError(
        `resolved adapter "${adapter.meta.id}" does not match reply channel "${validated.channelId}"`,
      );
    }
    return adapter.sendOutbound(validated);
  }

  /** Full {@link ChannelMeta} for a registered channel. */
  describe(tenantId: string, channelId: ChannelId): ChannelMeta {
    return this.#registry.lookup(tenantId, channelId).meta;
  }

  /** {@link ChannelCapabilities} surfaced from the adapter meta. */
  capabilities(tenantId: string, channelId: ChannelId): ChannelCapabilities {
    return this.describe(tenantId, channelId).capabilities;
  }
}
