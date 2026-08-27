import { describe, expect, it } from "vitest";
import {
  constantTimeEquals,
  type IdMint,
  InMemoryShareStore,
  SessionShare,
  ShareDisabledError,
  type ShareRecord,
  type ShareStore,
} from "./session-share.js";

/**
 * Deterministic id/secret mint for tests. Real callers inject a CSPRNG-backed
 * implementation; the module never generates entropy itself.
 */
class SeqMint implements IdMint {
  #i = 0;
  #s = 0;
  shareId(): string {
    this.#i += 1;
    return `share_${this.#i}`;
  }
  secret(): string {
    this.#s += 1;
    return `secret_${this.#s}`;
  }
}

/** Records every emitted sync event for assertion. */
class RecordingSink {
  readonly events: {
    type: "share.created" | "share.revoked";
    tenantId: string;
    sessionId: string;
    share: ShareRecord | null;
  }[] = [];
  async emit(event: {
    type: "share.created" | "share.revoked";
    tenantId: string;
    sessionId: string;
    share: ShareRecord | null;
  }): Promise<void> {
    this.events.push(event);
  }
}

/** A sink whose remote propagation always fails. */
class FailingSink {
  calls = 0;
  async emit(): Promise<void> {
    this.calls += 1;
    throw new Error("remote sync unreachable");
  }
}

const url = (shareId: string): string => `https://viewer.example/s/${shareId}`;

function make(opts?: {
  store?: ShareStore;
  sink?: { emit: (e: never) => Promise<void> } | RecordingSink | FailingSink;
  disabled?: boolean;
}) {
  const store = opts?.store ?? new InMemoryShareStore();
  const sink = opts?.sink ?? new RecordingSink();
  const mint = new SeqMint();
  const subject = new SessionShare({
    store,
    mint,
    urlBuilder: url,
    sink: sink as { emit: (e: never) => Promise<void> },
    ...(opts?.disabled === undefined ? {} : { disabled: opts.disabled }),
  });
  return { subject, store, sink, mint };
}

const T = "org_A";
const S = "session_1";

describe("SessionShare.share", () => {
  it("mints id+secret, builds url, persists a read-only record, emits share.created", async () => {
    const { subject, store, sink } = make();
    const recSink = sink as RecordingSink;

    const { url: shareUrl } = await subject.share(T, S);

    expect(shareUrl).toBe("https://viewer.example/s/share_1");
    const rec = await store.getBySession(T, S);
    expect(rec).not.toBeNull();
    expect(rec).toMatchObject({
      id: "share_1",
      sessionId: S,
      tenantId: T,
      url: "https://viewer.example/s/share_1",
      secret: "secret_1",
      readonly: true,
    });
    expect(typeof rec?.createdAt).toBe("string");
    expect(rec?.revokedAt).toBeUndefined();
    expect(recSink.events).toHaveLength(1);
    expect(recSink.events[0]).toMatchObject({
      type: "share.created",
      tenantId: T,
      sessionId: S,
    });
    expect(recSink.events[0]?.share?.id).toBe("share_1");
  });

  it("is idempotent: re-sharing returns the same url, mints no new secret, emits no duplicate", async () => {
    const { subject, store, sink } = make();
    const recSink = sink as RecordingSink;

    const first = await subject.share(T, S);
    const second = await subject.share(T, S);

    expect(second.url).toBe(first.url);
    const rec = await store.getBySession(T, S);
    expect(rec?.secret).toBe("secret_1"); // not re-minted
    expect(rec?.id).toBe("share_1");
    expect(recSink.events.filter((e) => e.type === "share.created")).toHaveLength(1);
  });

  it("re-shares after a revoke (mints a fresh share)", async () => {
    const { subject, store, sink } = make();
    const recSink = sink as RecordingSink;

    await subject.share(T, S);
    await subject.unshare(T, S);
    const again = await subject.share(T, S);

    expect(again.url).toBe("https://viewer.example/s/share_2");
    const rec = await store.getBySession(T, S);
    expect(rec?.id).toBe("share_2");
    expect(rec?.secret).toBe("secret_2");
    expect(rec?.revokedAt).toBeUndefined();
    expect(recSink.events.filter((e) => e.type === "share.created")).toHaveLength(2);
  });

  it("honors the disabled kill-switch and throws ShareDisabledError", async () => {
    const { subject, store } = make({ disabled: true });
    await expect(subject.share(T, S)).rejects.toBeInstanceOf(ShareDisabledError);
    expect(await store.getBySession(T, S)).toBeNull();
  });

  it("fails closed on empty tenantId", async () => {
    const { subject } = make();
    await expect(subject.share("", S)).rejects.toThrow();
  });

  it("fails closed on empty sessionId", async () => {
    const { subject } = make();
    await expect(subject.share(T, "")).rejects.toThrow();
  });

  it("does not lose the persisted share when the sync sink fails", async () => {
    const failing = new FailingSink();
    const { subject, store } = make({ sink: failing });

    const { url: shareUrl } = await subject.share(T, S);

    expect(failing.calls).toBe(1);
    const rec = await store.getBySession(T, S);
    expect(rec).not.toBeNull();
    expect(rec?.url).toBe(shareUrl);
    expect(rec?.id).toBe("share_1");
  });
});

describe("SessionShare.unshare", () => {
  it("revokes, persists revokedAt, emits share.revoked with share:null", async () => {
    const { subject, store, sink } = make();
    const recSink = sink as RecordingSink;

    await subject.share(T, S);
    await subject.unshare(T, S);

    const rec = await store.getBySession(T, S);
    expect(rec?.revokedAt).toBeTypeOf("string");
    const revoked = recSink.events.filter((e) => e.type === "share.revoked");
    expect(revoked).toHaveLength(1);
    expect(revoked[0]?.share).toBeNull();
    expect(revoked[0]).toMatchObject({ tenantId: T, sessionId: S });
  });

  it("is idempotent: unshare with no existing share is a no-op (no emit)", async () => {
    const { subject, sink } = make();
    const recSink = sink as RecordingSink;
    await subject.unshare(T, S);
    expect(recSink.events).toHaveLength(0);
  });

  it("is idempotent: unshare twice does not double-emit", async () => {
    const { subject, sink } = make();
    const recSink = sink as RecordingSink;
    await subject.share(T, S);
    await subject.unshare(T, S);
    await subject.unshare(T, S);
    expect(recSink.events.filter((e) => e.type === "share.revoked")).toHaveLength(1);
  });

  it("fails closed on empty tenantId", async () => {
    const { subject } = make();
    await expect(subject.unshare("", S)).rejects.toThrow();
  });

  it("does not lose the persisted revoke when the sync sink fails", async () => {
    const recording = new RecordingSink();
    const { subject, store } = make({ sink: recording });
    await subject.share(T, S);

    // Swap to a failing sink for the unshare path.
    const failing = new FailingSink();
    const subject2 = new SessionShare({
      store,
      mint: new SeqMint(),
      urlBuilder: url,
      sink: failing as unknown as { emit: (e: never) => Promise<void> },
    });
    await subject2.unshare(T, S);

    expect(failing.calls).toBe(1);
    const rec = await store.getBySession(T, S);
    expect(rec?.revokedAt).toBeTypeOf("string");
  });
});

describe("SessionShare.verifyViewer (public, secret-gated, no tenant)", () => {
  it("returns ok with the record for a valid id+secret", async () => {
    const { subject, store } = make();
    await subject.share(T, S);
    const rec = await store.getBySession(T, S);

    const result = await subject.verifyViewer(rec!.id, rec!.secret);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.record.id).toBe(rec!.id);
      expect(result.record.readonly).toBe(true);
    }
  });

  it("returns not-found for an unknown share id", async () => {
    const { subject } = make();
    const result = await subject.verifyViewer("share_nope", "secret_1");
    expect(result).toEqual({ ok: false, reason: "not-found" });
  });

  it("returns revoked for a revoked share even with the correct secret", async () => {
    const { subject, store } = make();
    await subject.share(T, S);
    const rec = await store.getBySession(T, S);
    await subject.unshare(T, S);

    const result = await subject.verifyViewer(rec!.id, rec!.secret);
    expect(result).toEqual({ ok: false, reason: "revoked" });
  });

  it("returns bad-secret for a wrong secret of equal length (no early exit)", async () => {
    const { subject, store } = make();
    await subject.share(T, S);
    const rec = await store.getBySession(T, S);

    const wrongSameLen = "x".repeat(rec!.secret.length);
    const result = await subject.verifyViewer(rec!.id, wrongSameLen);
    expect(result).toEqual({ ok: false, reason: "bad-secret" });
  });

  it("returns bad-secret for a wrong secret of different length", async () => {
    const { subject, store } = make();
    await subject.share(T, S);
    const rec = await store.getBySession(T, S);

    const result = await subject.verifyViewer(rec!.id, `${rec!.secret}EXTRA`);
    expect(result).toEqual({ ok: false, reason: "bad-secret" });
  });

  it("fails closed on empty shareId", async () => {
    const { subject } = make();
    await expect(subject.verifyViewer("", "secret_1")).rejects.toThrow();
  });
});

describe("constantTimeEquals helper", () => {
  it("returns true for identical strings", () => {
    expect(constantTimeEquals("abcdef", "abcdef")).toBe(true);
  });

  it("returns false for equal-length differing strings", () => {
    expect(constantTimeEquals("abcdef", "abcXef")).toBe(false);
  });

  it("returns false for different-length strings", () => {
    expect(constantTimeEquals("abc", "abcdef")).toBe(false);
  });

  it("scans the full string (a late mismatch is still detected)", () => {
    const a = `${"a".repeat(64)}X`;
    const b = `${"a".repeat(64)}Y`;
    expect(constantTimeEquals(a, b)).toBe(false);
  });

  it("an early mismatch does not short-circuit to a false positive", () => {
    expect(constantTimeEquals("Xbcdef", "abcdef")).toBe(false);
    expect(constantTimeEquals("", "")).toBe(true);
  });
});

describe("InMemoryShareStore tenant isolation", () => {
  it("getBySession is tenant-keyed: another tenant cannot see the share", async () => {
    const store = new InMemoryShareStore();
    const a = make({ store });
    await a.subject.share("org_A", "shared_session");

    expect(await store.getBySession("org_A", "shared_session")).not.toBeNull();
    expect(await store.getBySession("org_B", "shared_session")).toBeNull();
  });

  it("getById is the public viewer path (tenant-agnostic, secret-gated)", async () => {
    const store = new InMemoryShareStore();
    const a = make({ store });
    await a.subject.share("org_A", "s");
    const rec = await store.getBySession("org_A", "s");

    const byId = await store.getById(rec!.id);
    expect(byId?.id).toBe(rec!.id);
    expect(await store.getById("missing")).toBeNull();
  });

  it("fails closed on empty tenantId / sessionId in getBySession", async () => {
    const store = new InMemoryShareStore();
    await expect(store.getBySession("", "s")).rejects.toThrow();
    await expect(store.getBySession("t", "")).rejects.toThrow();
  });

  it("fails closed on empty shareId in getById", async () => {
    const store = new InMemoryShareStore();
    await expect(store.getById("")).rejects.toThrow();
  });
});

describe("immutability", () => {
  it("does not mutate a record handed back from the store across operations", async () => {
    const { subject, store } = make();
    await subject.share(T, S);
    const snapshot = await store.getBySession(T, S);
    const frozenCopy = { ...snapshot } as ShareRecord;

    await subject.unshare(T, S);

    // The previously-read snapshot object must not have been mutated in place.
    expect(snapshot).toEqual(frozenCopy);
    expect(snapshot?.revokedAt).toBeUndefined();
  });

  it("returned share result is a fresh object, not the stored record", async () => {
    const { subject, store } = make();
    const result = await subject.share(T, S);
    const rec = await store.getBySession(T, S);
    expect(result).not.toBe(rec);
    expect(Object.keys(result)).toEqual(["url"]);
  });
});
