/**
 * Shareable-session model — a faithful re-expression of a coding agent's
 * "share this session with a viewer" subsystem into Sailor's grammar:
 * TypeScript, multi-tenant, no datastore lock-in, no transport/crypto vendor
 * lock-in.
 *
 * ── Mental model ────────────────────────────────────────────────────────────
 * The session OWNER keeps editing through the normal session API. Sharing only
 * grants a *read-only viewer* an observation window. A {@link ShareRecord} is
 * therefore always `readonly: true` — there is no writable share.
 *
 * ── Two access planes ───────────────────────────────────────────────────────
 *  1. OWNER plane ({@link SessionShare.share} / {@link SessionShare.unshare}):
 *     tenant-scoped. `tenantId` is mandatory, Zod-validated, and fails closed
 *     on empty input. Cross-tenant reads are impossible by construction because
 *     {@link ShareStore.getBySession} is tenant-keyed.
 *
 *  2. VIEWER plane ({@link SessionShare.verifyViewer}): PUBLIC. The viewer does
 *     NOT have a tenantId — they only hold a link containing the share id plus
 *     an unguessable secret. Security rests ENTIRELY on the secret being
 *     high-entropy and compared in (length-independent) constant time. This is
 *     why {@link ShareStore.getById} is tenant-agnostic: it is the public
 *     lookup, gated by the secret rather than by tenancy. The secret never
 *     reaches the owner caller path (it travels via the record + sync sink to
 *     wherever the viewer URL is rendered).
 *
 * ── Threat model ────────────────────────────────────────────────────────────
 *  • A viewer link leaking == full read access to that one session until the
 *    owner revokes. Mitigation: revoke is immediate and `verifyViewer` denies
 *    revoked shares; the secret must be CSPRNG-grade (enforced by the injected
 *    {@link IdMint}, NOT by this module — the module never generates entropy).
 *  • Secret guessing / timing oracle. Mitigation: {@link constantTimeEquals}
 *    never early-returns on the first mismatched byte and folds length
 *    differences into the same negative result.
 *
 * ── Sink-failure policy (DOCUMENTED CHOICE) ─────────────────────────────────
 * Local persistence is the source of truth. `share`/`unshare` persist to the
 * {@link ShareStore} FIRST, then best-effort emit to the {@link SyncSink}. If
 * `sink.emit` rejects, the local store change STILL STANDS and the sink error
 * is SWALLOWED (not rethrown) so a flaky remote can never roll back or hide a
 * share/revoke the owner already committed. The owner call resolves normally;
 * sync convergence is the remote's eventual-consistency concern, not the
 * caller's. (Tested: a failing sink does not lose the persisted share/revoke.)
 */

import { z } from "zod";

/** A share is always read-only for viewers; the owner edits via the session. */
export interface ShareRecord {
  readonly id: string;
  readonly sessionId: string;
  readonly tenantId: string;
  readonly url: string;
  readonly secret: string;
  readonly readonly: true;
  readonly createdAt: string;
  readonly revokedAt?: string | undefined;
}

/** Emitted to the sync sink whenever share state changes. */
export interface ShareSyncEvent {
  readonly type: "share.created" | "share.revoked";
  readonly tenantId: string;
  readonly sessionId: string;
  readonly share: ShareRecord | null;
}

/**
 * Caller-injected id/secret source. Tests pass a deterministic stub. Real
 * callers MUST back `secret()` with a CSPRNG (≥128 bits) — this module
 * consumes the port and never implements crypto itself.
 */
export interface IdMint {
  shareId(): string;
  secret(): string;
}

/** Derives the public viewer URL from a share id. */
export type UrlBuilder = (shareId: string) => string;

/**
 * Best-effort propagation seam for share state changes. The real impl pushes to
 * a remote; tests use a recorder. A rejecting `emit` MUST NOT corrupt local
 * state — see the module-level sink-failure policy.
 */
export interface SyncSink {
  emit(event: ShareSyncEvent): Promise<void>;
}

/**
 * Storage seam. `getBySession` is tenant-keyed and tenant-validated (owner
 * plane). `getById` is the PUBLIC viewer lookup: the viewer has no tenantId, so
 * it is tenant-agnostic and secret-gated by the caller, never tenant-gated.
 */
export interface ShareStore {
  put(rec: ShareRecord): Promise<void>;
  getBySession(tenantId: string, sessionId: string): Promise<ShareRecord | null>;
  getById(shareId: string): Promise<ShareRecord | null>;
}

/** Raised when sharing is globally disabled by the kill-switch. */
export class ShareDisabledError extends Error {
  constructor(message = "session sharing is disabled") {
    super(message);
    this.name = "ShareDisabledError";
  }
}

const tenantIdSchema = z.string().min(1, "tenantId is required");
const sessionIdSchema = z.string().min(1, "sessionId is required");
const shareIdSchema = z.string().min(1, "shareId is required");

const ownerKeySchema = z.object({
  tenantId: tenantIdSchema,
  sessionId: sessionIdSchema,
});

/**
 * Length-independent, full-scan equality. Never short-circuits on the first
 * differing character; a length mismatch is folded into the same negative
 * result by comparing against a fixed-length view so the loop count does not
 * leak the secret length. Pure and unit-tested in isolation.
 */
export function constantTimeEquals(a: string, b: string): boolean {
  const len = Math.max(a.length, b.length);
  let diff = a.length ^ b.length;
  for (let i = 0; i < len; i += 1) {
    const ca = i < a.length ? a.charCodeAt(i) : 0;
    const cb = i < b.length ? b.charCodeAt(i) : 0;
    diff |= ca ^ cb;
  }
  return diff === 0;
}

/** Deep-frozen defensive copy so stored records can never be mutated in place. */
function freezeRecord(rec: ShareRecord): ShareRecord {
  return Object.freeze({ ...rec });
}

/**
 * In-memory reference {@link ShareStore}. Mirrors the package's
 * store/port convention (interface + in-memory ref impl, like
 * `InMemoryRolloutStore`). Production swaps in a Postgres / `@nebutra/db`
 * adapter satisfying the same interface — no infra change.
 *
 * Tenancy is structural: the by-session key embeds `tenantId`, so a different
 * tenant resolves to a different key and gets `null`. A by-id index serves the
 * public viewer path.
 */
export class InMemoryShareStore implements ShareStore {
  readonly #bySession = new Map<string, ShareRecord>();
  readonly #byId = new Map<string, ShareRecord>();

  #key(tenantId: string, sessionId: string): string {
    return `${tenantId}::${sessionId}`;
  }

  async put(rec: ShareRecord): Promise<void> {
    const validated = ownerKeySchema.parse({
      tenantId: rec.tenantId,
      sessionId: rec.sessionId,
    });
    const stored = freezeRecord(rec);
    this.#bySession.set(this.#key(validated.tenantId, validated.sessionId), stored);
    this.#byId.set(stored.id, stored);
  }

  async getBySession(tenantId: string, sessionId: string): Promise<ShareRecord | null> {
    const validated = ownerKeySchema.parse({ tenantId, sessionId });
    return this.#bySession.get(this.#key(validated.tenantId, validated.sessionId)) ?? null;
  }

  async getById(shareId: string): Promise<ShareRecord | null> {
    const id = shareIdSchema.parse(shareId);
    return this.#byId.get(id) ?? null;
  }
}

/** Result of a public viewer access attempt. */
export type ViewerVerdict =
  | { readonly ok: true; readonly record: ShareRecord }
  | { readonly ok: false; readonly reason: "not-found" | "revoked" | "bad-secret" };

export interface SessionShareOptions {
  readonly store: ShareStore;
  readonly mint: IdMint;
  readonly urlBuilder: UrlBuilder;
  readonly sink: SyncSink;
  /** Kill-switch: when true, every `share()` throws {@link ShareDisabledError}. */
  readonly disabled?: boolean | undefined;
}

/** Tenant-scoped owner API + public viewer verification. */
export class SessionShare {
  readonly #store: ShareStore;
  readonly #mint: IdMint;
  readonly #urlBuilder: UrlBuilder;
  readonly #sink: SyncSink;
  readonly #disabled: boolean;

  constructor(opts: SessionShareOptions) {
    this.#store = opts.store;
    this.#mint = opts.mint;
    this.#urlBuilder = opts.urlBuilder;
    this.#sink = opts.sink;
    this.#disabled = opts.disabled ?? false;
  }

  /**
   * Best-effort sync emit. Local state is already persisted before this runs;
   * a rejecting sink is swallowed so the committed share/revoke is never lost
   * or rolled back (see module-level sink-failure policy).
   */
  async #emitBestEffort(event: ShareSyncEvent): Promise<void> {
    try {
      await this.#sink.emit(event);
    } catch {
      // Intentionally swallowed: persistence is the source of truth.
    }
  }

  /**
   * Share a session read-only. Fails closed on empty tenant/session. Honors the
   * kill-switch. Idempotent: if a live (non-revoked) share exists, returns its
   * url WITHOUT minting a new secret or emitting a duplicate `share.created`.
   * Returns only the url — the secret never reaches the owner caller path.
   */
  async share(tenantId: string, sessionId: string): Promise<{ url: string }> {
    const key = ownerKeySchema.parse({ tenantId, sessionId });
    if (this.#disabled) {
      throw new ShareDisabledError();
    }

    const existing = await this.#store.getBySession(key.tenantId, key.sessionId);
    if (existing && existing.revokedAt === undefined) {
      return { url: existing.url };
    }

    const id = this.#mint.shareId();
    const record: ShareRecord = {
      id,
      sessionId: key.sessionId,
      tenantId: key.tenantId,
      url: this.#urlBuilder(id),
      secret: this.#mint.secret(),
      readonly: true,
      createdAt: new Date().toISOString(),
    };

    await this.#store.put(record);
    await this.#emitBestEffort({
      type: "share.created",
      tenantId: key.tenantId,
      sessionId: key.sessionId,
      share: record,
    });

    return { url: record.url };
  }

  /**
   * Revoke a session's share. Fails closed on empty tenant/session. Idempotent:
   * a no-op (no emit) when no live share exists. On revoke, persists `revokedAt`
   * and emits `share.revoked` with `share: null`.
   */
  async unshare(tenantId: string, sessionId: string): Promise<void> {
    const key = ownerKeySchema.parse({ tenantId, sessionId });

    const existing = await this.#store.getBySession(key.tenantId, key.sessionId);
    if (!existing || existing.revokedAt !== undefined) {
      return;
    }

    const revoked: ShareRecord = {
      ...existing,
      revokedAt: new Date().toISOString(),
    };

    await this.#store.put(revoked);
    await this.#emitBestEffort({
      type: "share.revoked",
      tenantId: key.tenantId,
      sessionId: key.sessionId,
      share: null,
    });
  }

  /**
   * PUBLIC viewer access. NO tenantId — the viewer has none; security rests
   * entirely on the unguessable secret, compared in length-independent
   * constant time. Unknown id → not-found; revoked share → revoked (even with
   * the right secret); wrong secret → bad-secret. Fails closed on empty id.
   */
  async verifyViewer(shareId: string, presentedSecret: string): Promise<ViewerVerdict> {
    const id = shareIdSchema.parse(shareId);
    const secret = z.string().parse(presentedSecret);

    const record = await this.#store.getById(id);
    if (!record) {
      return { ok: false, reason: "not-found" };
    }
    if (record.revokedAt !== undefined) {
      return { ok: false, reason: "revoked" };
    }
    if (!constantTimeEquals(record.secret, secret)) {
      return { ok: false, reason: "bad-secret" };
    }
    return { ok: true, record };
  }
}
