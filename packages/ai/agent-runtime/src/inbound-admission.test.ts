import { describe, expect, it } from "vitest";

import {
  admitInbound,
  compileAllowlist,
  hasMention,
  InboundDebouncer,
  type InboundLike,
  matchesAllowlist,
  requiresMention,
  resolveSessionKey,
} from "./inbound-admission.js";

// ── Fixtures ─────────────────────────────────────────────────────────────────

function makeInbound(overrides: Partial<InboundLike> = {}): InboundLike {
  return {
    tenantId: "tenant-a",
    channelId: "chan-1",
    chatId: "chat-9",
    senderId: "user-7",
    text: "hello there",
    receivedAt: "2026-05-17T10:00:00.000Z",
    ...overrides,
  };
}

// ── 1. resolveSessionKey ─────────────────────────────────────────────────────

describe("resolveSessionKey", () => {
  it("is deterministic for the same inputs", () => {
    const inbound = makeInbound();
    expect(resolveSessionKey(inbound)).toBe(resolveSessionKey(inbound));
  });

  it("is stable across object identity (re-created equal inputs)", () => {
    const a = resolveSessionKey(makeInbound());
    const b = resolveSessionKey(makeInbound());
    expect(a).toBe(b);
  });

  it("never collides across tenants for otherwise-identical inputs", () => {
    const t1 = resolveSessionKey(makeInbound({ tenantId: "tenant-a" }));
    const t2 = resolveSessionKey(makeInbound({ tenantId: "tenant-b" }));
    expect(t1).not.toBe(t2);
  });

  it("prefixes the key with the tenant id (cross-tenant isolation by construction)", () => {
    const key = resolveSessionKey(makeInbound({ tenantId: "tenant-zed" }));
    expect(key.startsWith("tenant-zed:")).toBe(true);
  });

  it("group default binding is per-chat: same chat different sender → same key", () => {
    const a = resolveSessionKey(makeInbound({ senderId: "s1" }), { chatType: "group" });
    const b = resolveSessionKey(makeInbound({ senderId: "s2" }), { chatType: "group" });
    expect(a).toBe(b);
  });

  it("group binding per-sender: different sender → different key", () => {
    const a = resolveSessionKey(makeInbound({ senderId: "s1" }), {
      chatType: "group",
      groupBinding: "per-sender",
    });
    const b = resolveSessionKey(makeInbound({ senderId: "s2" }), {
      chatType: "group",
      groupBinding: "per-sender",
    });
    expect(a).not.toBe(b);
  });

  it("group binding per-thread: different thread → different key, same thread → same", () => {
    const a = resolveSessionKey(makeInbound({ threadId: "th-1" }), {
      chatType: "group",
      groupBinding: "per-thread",
    });
    const b = resolveSessionKey(makeInbound({ threadId: "th-2" }), {
      chatType: "group",
      groupBinding: "per-thread",
    });
    const c = resolveSessionKey(makeInbound({ threadId: "th-1" }), {
      chatType: "group",
      groupBinding: "per-thread",
    });
    expect(a).not.toBe(b);
    expect(a).toBe(c);
  });

  it("DM default binding is per-sender: different sender → different key", () => {
    const a = resolveSessionKey(makeInbound({ senderId: "s1" }), { chatType: "dm" });
    const b = resolveSessionKey(makeInbound({ senderId: "s2" }), { chatType: "dm" });
    expect(a).not.toBe(b);
  });

  it("DM per-chat override collapses senders to one key", () => {
    const a = resolveSessionKey(makeInbound({ senderId: "s1" }), {
      chatType: "dm",
      groupBinding: "per-chat",
    });
    const b = resolveSessionKey(makeInbound({ senderId: "s2" }), {
      chatType: "dm",
      groupBinding: "per-chat",
    });
    expect(a).toBe(b);
  });

  it("does not mutate the inbound input", () => {
    const inbound = makeInbound();
    const snapshot = JSON.stringify(inbound);
    resolveSessionKey(inbound, { chatType: "group" });
    expect(JSON.stringify(inbound)).toBe(snapshot);
  });

  it("fails closed on empty tenant id", () => {
    expect(() => resolveSessionKey(makeInbound({ tenantId: "" }))).toThrow();
  });
});

// ── 2. compileAllowlist / matchesAllowlist ───────────────────────────────────

describe("compileAllowlist / matchesAllowlist", () => {
  it("exact id match is allowed and reports matchedBy", () => {
    const compiled = compileAllowlist(["user-7", "user-8"]);
    const res = matchesAllowlist(compiled, ["user-7"]);
    expect(res.allowed).toBe(true);
    expect(res.matchedBy).toBe("user-7");
  });

  it("denies when no candidate matches", () => {
    const compiled = compileAllowlist(["user-7"]);
    const res = matchesAllowlist(compiled, ["user-99"]);
    expect(res.allowed).toBe(false);
    expect(res.matchedBy).toBeUndefined();
  });

  it("whole-entry wildcard '*' allows any candidate", () => {
    const compiled = compileAllowlist(["*"]);
    expect(matchesAllowlist(compiled, ["anyone"]).allowed).toBe(true);
  });

  it("prefix wildcard 'prefix:*' matches by prefix", () => {
    const compiled = compileAllowlist(["org-42:*"]);
    expect(matchesAllowlist(compiled, ["org-42:user-1"]).allowed).toBe(true);
    expect(matchesAllowlist(compiled, ["org-99:user-1"]).allowed).toBe(false);
  });

  it("prefix wildcard reports the matching entry", () => {
    const compiled = compileAllowlist(["org-42:*"]);
    expect(matchesAllowlist(compiled, ["org-42:user-1"]).matchedBy).toBe("org-42:*");
  });

  it("empty allowlist is closed by default (deny)", () => {
    const compiled = compileAllowlist([]);
    expect(matchesAllowlist(compiled, ["anyone"]).allowed).toBe(false);
  });

  it("empty allowlist with openWhenEmpty allows everything", () => {
    const compiled = compileAllowlist([], { openWhenEmpty: true });
    expect(matchesAllowlist(compiled, ["anyone"]).allowed).toBe(true);
  });

  it("openWhenEmpty does NOT open a non-empty allowlist", () => {
    const compiled = compileAllowlist(["user-7"], { openWhenEmpty: true });
    expect(matchesAllowlist(compiled, ["intruder"]).allowed).toBe(false);
  });

  it("checks multiple candidates and matches any", () => {
    const compiled = compileAllowlist(["role:admin"]);
    expect(matchesAllowlist(compiled, ["user-7", "role:admin"]).allowed).toBe(true);
  });

  it("does not mutate the entries array", () => {
    const entries = ["a", "b:*"];
    const snapshot = [...entries];
    compileAllowlist(entries);
    expect(entries).toEqual(snapshot);
  });
});

// ── 3. requiresMention / hasMention ──────────────────────────────────────────

describe("requiresMention / hasMention", () => {
  it("DM never requires a mention", () => {
    expect(requiresMention({ chatType: "dm", assistantHandles: ["@bot"], text: "hi" })).toBe(false);
  });

  it("group requires a mention when none present", () => {
    expect(
      requiresMention({ chatType: "group", assistantHandles: ["@bot"], text: "hello world" }),
    ).toBe(true);
  });

  it("group does not require gating when message mentions the assistant", () => {
    expect(
      requiresMention({ chatType: "group", assistantHandles: ["@bot"], text: "hey @bot help" }),
    ).toBe(false);
  });

  it("reply-to-assistant bypasses the mention requirement in group", () => {
    expect(
      requiresMention({
        chatType: "group",
        assistantHandles: ["@bot"],
        text: "no mention here",
        isReplyToAssistant: true,
      }),
    ).toBe(false);
  });

  it("hasMention is case-insensitive", () => {
    expect(hasMention("Hey @BOT how are you", ["@bot"])).toBe(true);
  });

  it("hasMention matches on word boundaries (no substring false positive)", () => {
    expect(hasMention("contact @botanist now", ["@bot"])).toBe(false);
  });

  it("hasMention is false when handle absent", () => {
    expect(hasMention("nothing relevant", ["@bot"])).toBe(false);
  });

  it("hasMention supports multiple handles", () => {
    expect(hasMention("ping @assistant please", ["@bot", "@assistant"])).toBe(true);
  });
});

// ── 4. InboundDebouncer ──────────────────────────────────────────────────────

describe("InboundDebouncer", () => {
  it("does not admit a message while the window is open", () => {
    const d = new InboundDebouncer();
    expect(d.offer("sk", "first", 0)).toEqual({ admit: false });
  });

  it("coalesces a burst within the window and admits once on flush", () => {
    const d = new InboundDebouncer({ windowMs: 1500 });
    expect(d.offer("sk", "one", 0).admit).toBe(false);
    expect(d.offer("sk", "two", 500).admit).toBe(false);
    const flushed = d.flush("sk", 600);
    expect(flushed).toEqual({ admit: true, merged: "one\ntwo" });
  });

  it("admits a coalesced burst once the window has closed via a later offer", () => {
    const d = new InboundDebouncer({ windowMs: 1000 });
    expect(d.offer("sk", "a", 0).admit).toBe(false);
    expect(d.offer("sk", "b", 200).admit).toBe(false);
    const res = d.offer("sk", "c", 2000);
    expect(res).toEqual({ admit: true, merged: "a\nb" });
  });

  it("flush on an unknown sessionKey does not admit", () => {
    const d = new InboundDebouncer();
    expect(d.flush("never-seen", 1000)).toEqual({ admit: false });
  });

  it("treats distinct sessionKeys independently", () => {
    const d = new InboundDebouncer({ windowMs: 1000 });
    d.offer("sk-1", "x", 0);
    d.offer("sk-2", "y", 0);
    expect(d.flush("sk-1", 1100)).toEqual({ admit: true, merged: "x" });
    expect(d.flush("sk-2", 1100)).toEqual({ admit: true, merged: "y" });
  });

  it("flush clears buffered state (second flush does not re-admit)", () => {
    const d = new InboundDebouncer({ windowMs: 1000 });
    d.offer("sk", "only", 0);
    expect(d.flush("sk", 1100).admit).toBe(true);
    expect(d.flush("sk", 1200)).toEqual({ admit: false });
  });

  it("starts a fresh window after a prior burst was flushed by a late offer", () => {
    const d = new InboundDebouncer({ windowMs: 1000 });
    d.offer("sk", "a", 0);
    const first = d.offer("sk", "b", 5000);
    expect(first).toEqual({ admit: true, merged: "a" });
    // 'b' begins a new window — still pending until it closes.
    expect(d.offer("sk", "c", 5200).admit).toBe(false);
    expect(d.flush("sk", 6300)).toEqual({ admit: true, merged: "b\nc" });
  });
});

// ── 5. admitInbound (compose) ────────────────────────────────────────────────

describe("admitInbound", () => {
  function basePolicy() {
    return {
      chatType: "group" as const,
      allowlist: compileAllowlist(["user-7"]),
      assistantHandles: ["@bot"],
    };
  }

  it("fails closed when tenant id is empty", () => {
    const d = new InboundDebouncer();
    const res = admitInbound(makeInbound({ tenantId: "" }), basePolicy(), { debouncer: d });
    expect(res).toEqual({ admit: false, reason: "empty-tenant" });
  });

  it("rejects a sender that is not allowlisted", () => {
    const d = new InboundDebouncer();
    const res = admitInbound(makeInbound({ senderId: "intruder", text: "@bot hi" }), basePolicy(), {
      debouncer: d,
    });
    expect(res).toEqual({ admit: false, reason: "not-allowlisted" });
  });

  it("rejects a group message without a mention", () => {
    const d = new InboundDebouncer();
    const res = admitInbound(
      makeInbound({ senderId: "user-7", text: "no mention" }),
      basePolicy(),
      { debouncer: d },
    );
    expect(res).toEqual({ admit: false, reason: "mention-required" });
  });

  it("debounces an admitted message until the window closes", () => {
    const d = new InboundDebouncer({ windowMs: 1000 });
    const res = admitInbound(
      makeInbound({ senderId: "user-7", text: "@bot hello" }),
      basePolicy(),
      { debouncer: d, nowMs: 0 },
    );
    expect(res).toEqual({ admit: false, reason: "debounced" });
  });

  it("admits end-to-end once the debounce window closes", () => {
    const d = new InboundDebouncer({ windowMs: 1000 });
    const policy = basePolicy();
    const i1 = makeInbound({ senderId: "user-7", text: "@bot one" });
    expect(admitInbound(i1, policy, { debouncer: d, nowMs: 0 }).admit).toBe(false);
    const i2 = makeInbound({ senderId: "user-7", text: "two" });
    const res = admitInbound(i2, policy, { debouncer: d, nowMs: 5000 });
    expect(res.admit).toBe(true);
    if (res.admit) {
      expect(res.text).toBe("@bot one");
      expect(res.sessionKey.startsWith("tenant-a:")).toBe(true);
    }
  });

  it("admits a DM without requiring a mention (still debounced first)", () => {
    const d = new InboundDebouncer({ windowMs: 500 });
    const policy = {
      chatType: "dm" as const,
      allowlist: compileAllowlist(["user-7"]),
      assistantHandles: ["@bot"],
    };
    const i1 = makeInbound({ senderId: "user-7", text: "plain dm" });
    const r0 = admitInbound(i1, policy, { debouncer: d, nowMs: 0 });
    expect(r0.admit).toBe(false);
    if (!r0.admit) expect(r0.reason).toBe("debounced");
    const i2 = makeInbound({ senderId: "user-7", text: "later" });
    const res = admitInbound(i2, policy, { debouncer: d, nowMs: 9000 });
    expect(res.admit).toBe(true);
    if (res.admit) expect(res.text).toBe("plain dm");
  });

  it("allowlist check precedes mention check (allowlist reason wins)", () => {
    const d = new InboundDebouncer();
    const res = admitInbound(
      makeInbound({ senderId: "ghost", text: "no mention either" }),
      basePolicy(),
      { debouncer: d },
    );
    expect(res).toEqual({ admit: false, reason: "not-allowlisted" });
  });

  it("does not mutate the inbound input", () => {
    const d = new InboundDebouncer();
    const inbound = makeInbound({ senderId: "user-7", text: "@bot hi" });
    const snapshot = JSON.stringify(inbound);
    admitInbound(inbound, basePolicy(), { debouncer: d, nowMs: 0 });
    expect(JSON.stringify(inbound)).toBe(snapshot);
  });

  it("reply-to-assistant bypasses mention gating in a group", () => {
    const d = new InboundDebouncer({ windowMs: 100 });
    const policy = basePolicy();
    const i1 = makeInbound({ senderId: "user-7", text: "no mention but a reply" });
    const r1 = admitInbound(i1, policy, {
      debouncer: d,
      nowMs: 0,
      isReplyToAssistant: true,
    });
    expect(r1.admit).toBe(false);
    if (!r1.admit) expect(r1.reason).toBe("debounced");
    const i2 = makeInbound({ senderId: "user-7", text: "again" });
    const r2 = admitInbound(i2, policy, {
      debouncer: d,
      nowMs: 9000,
      isReplyToAssistant: true,
    });
    expect(r2.admit).toBe(true);
  });
});
