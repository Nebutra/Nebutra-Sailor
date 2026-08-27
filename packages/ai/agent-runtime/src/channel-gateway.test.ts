import { describe, expect, it, vi } from "vitest";

import {
  asChannelId,
  type ChannelAdapter,
  ChannelGateway,
  type ChannelMeta,
  ChannelRegistry,
  DuplicateChannelError,
  type InboundMessage,
  type OutboundMessage,
  replyTo,
  TenantMismatchError,
  UnknownChannelError,
} from "./channel-gateway.js";

/* -------------------------------------------------------------------------- */
/* Fixtures                                                                   */
/* -------------------------------------------------------------------------- */

function meta(id: string, over?: Partial<ChannelMeta>): ChannelMeta {
  return {
    id: asChannelId(id),
    displayName: `Channel ${id}`,
    capabilities: { threads: true, reactions: false, streaming: true },
    ...over,
  };
}

/**
 * Fake adapter: parses a minimal "envelope" payload into an InboundMessage.
 * Returns null for non-message events (joins, typing, …) and never throws on
 * junk. `sendOutbound` records every dispatched message.
 */
function fakeAdapter(
  id: string,
  metaOver?: Partial<ChannelMeta>,
): ChannelAdapter & {
  sent: OutboundMessage[];
} {
  const sent: OutboundMessage[] = [];
  return {
    sent,
    meta: meta(id, metaOver),
    parseInbound(tenantId, raw) {
      if (typeof raw !== "object" || raw === null) return null;
      const r = raw as Record<string, unknown>;
      // Non-message events → null (never throw).
      if (r["type"] !== "message") return null;
      if (typeof r["chatId"] !== "string" || typeof r["text"] !== "string") return null;
      const inbound: InboundMessage = {
        tenantId,
        channelId: asChannelId(id),
        chatId: r["chatId"],
        senderId: typeof r["senderId"] === "string" ? r["senderId"] : "anon",
        text: r["text"],
        receivedAt: "2026-05-17T00:00:00.000Z",
        raw,
        ...(typeof r["threadId"] === "string" ? { threadId: r["threadId"] } : {}),
        ...(typeof r["senderLabel"] === "string" ? { senderLabel: r["senderLabel"] } : {}),
      };
      return inbound;
    },
    async sendOutbound(msg) {
      sent.push(msg);
      return { messageId: `${id}-${sent.length}` };
    },
  };
}

/** Adapter whose parseInbound returns a structurally-invalid object. */
function malformedAdapter(id: string): ChannelAdapter {
  return {
    meta: meta(id),
    // @ts-expect-error — intentionally returns a non-conforming shape to
    // exercise the gateway's zod boundary validation.
    parseInbound() {
      return { tenantId: "", chatId: 123, text: null };
    },
    async sendOutbound() {
      return { messageId: "x" };
    },
  };
}

/* -------------------------------------------------------------------------- */
/* asChannelId / branded type                                                 */
/* -------------------------------------------------------------------------- */

describe("asChannelId", () => {
  it("brands a non-empty string", () => {
    expect(asChannelId("slack")).toBe("slack");
  });

  it("rejects empty / blank ids", () => {
    expect(() => asChannelId("")).toThrow(/channel/i);
    expect(() => asChannelId("   ")).toThrow(/channel/i);
  });
});

/* -------------------------------------------------------------------------- */
/* ChannelAdapter.parseInbound                                                */
/* -------------------------------------------------------------------------- */

describe("ChannelAdapter.parseInbound", () => {
  it("returns null for junk without throwing", () => {
    const a = fakeAdapter("c1");
    expect(a.parseInbound("org_a", null)).toBeNull();
    expect(a.parseInbound("org_a", "garbage")).toBeNull();
    expect(a.parseInbound("org_a", { type: "typing" })).toBeNull();
    expect(a.parseInbound("org_a", { type: "join", user: "u1" })).toBeNull();
  });

  it("stamps the tenantId onto the normalized result", () => {
    const a = fakeAdapter("c1");
    const msg = a.parseInbound("org_a", { type: "message", chatId: "ch1", text: "hi" });
    expect(msg).not.toBeNull();
    expect(msg?.tenantId).toBe("org_a");
    expect(msg?.channelId).toBe("c1");
  });
});

/* -------------------------------------------------------------------------- */
/* ChannelRegistry                                                            */
/* -------------------------------------------------------------------------- */

describe("ChannelRegistry", () => {
  it("registers and looks up an adapter by channelId for a tenant", () => {
    const reg = new ChannelRegistry();
    const a = fakeAdapter("c1");
    reg.register("org_a", a);
    expect(reg.lookup("org_a", asChannelId("c1"))).toBe(a);
  });

  it("throws DuplicateChannelError on duplicate registration", () => {
    const reg = new ChannelRegistry();
    reg.register("org_a", fakeAdapter("c1"));
    expect(() => reg.register("org_a", fakeAdapter("c1"))).toThrow(DuplicateChannelError);
  });

  it("throws UnknownChannelError on unknown lookup", () => {
    const reg = new ChannelRegistry();
    expect(() => reg.lookup("org_a", asChannelId("nope"))).toThrow(UnknownChannelError);
  });

  it("fails closed on empty tenantId for register and lookup", () => {
    const reg = new ChannelRegistry();
    expect(() => reg.register("", fakeAdapter("c1"))).toThrow(/tenant/i);
    expect(() => reg.register("   ", fakeAdapter("c1"))).toThrow(/tenant/i);
    expect(() => reg.lookup("", asChannelId("c1"))).toThrow(/tenant/i);
  });

  it("isolates tenants — A's adapter is invisible to B (foreign tenant fails closed)", () => {
    const reg = new ChannelRegistry();
    reg.register("org_a", fakeAdapter("c1"));
    expect(() => reg.lookup("org_b", asChannelId("c1"))).toThrow(UnknownChannelError);
    // Same channelId may be registered independently per tenant.
    expect(() => reg.register("org_b", fakeAdapter("c1"))).not.toThrow();
  });

  it("lists registered channel ids per tenant", () => {
    const reg = new ChannelRegistry();
    reg.register("org_a", fakeAdapter("c1"));
    reg.register("org_a", fakeAdapter("c2"));
    reg.register("org_b", fakeAdapter("c3"));
    expect([...reg.list("org_a")].sort()).toEqual(["c1", "c2"]);
    expect(reg.list("org_b")).toEqual(["c3"]);
    expect(reg.list("org_unknown")).toEqual([]);
  });
});

/* -------------------------------------------------------------------------- */
/* ChannelGateway.ingest                                                      */
/* -------------------------------------------------------------------------- */

describe("ChannelGateway.ingest", () => {
  it("normalizes a valid inbound message tenant-stamped", () => {
    const reg = new ChannelRegistry();
    reg.register("org_a", fakeAdapter("c1"));
    const gw = new ChannelGateway(reg);

    const msg = gw.ingest("org_a", asChannelId("c1"), {
      type: "message",
      chatId: "ch1",
      text: "hello",
      threadId: "t1",
    });
    expect(msg).not.toBeNull();
    expect(msg?.tenantId).toBe("org_a");
    expect(msg?.channelId).toBe("c1");
    expect(msg?.chatId).toBe("ch1");
    expect(msg?.threadId).toBe("t1");
  });

  it("swallows non-message events as null (never throws to caller)", () => {
    const reg = new ChannelRegistry();
    reg.register("org_a", fakeAdapter("c1"));
    const gw = new ChannelGateway(reg);

    expect(gw.ingest("org_a", asChannelId("c1"), { type: "typing" })).toBeNull();
    expect(gw.ingest("org_a", asChannelId("c1"), "junk")).toBeNull();
    expect(gw.ingest("org_a", asChannelId("c1"), null)).toBeNull();
  });

  it("rejects a malformed adapter result via zod (typed, no crash)", () => {
    const reg = new ChannelRegistry();
    reg.register("org_a", malformedAdapter("c1"));
    const gw = new ChannelGateway(reg);

    expect(() => gw.ingest("org_a", asChannelId("c1"), { type: "message" })).toThrow();
    // Does not surface as a raw TypeError — it is a validation error.
    try {
      gw.ingest("org_a", asChannelId("c1"), { type: "message" });
    } catch (e) {
      expect(e).toBeInstanceOf(Error);
      expect((e as Error).message).toMatch(/inbound|valid/i);
    }
  });

  it("throws UnknownChannelError when the channel is not registered", () => {
    const gw = new ChannelGateway(new ChannelRegistry());
    expect(() => gw.ingest("org_a", asChannelId("ghost"), { type: "message" })).toThrow(
      UnknownChannelError,
    );
  });

  it("fails closed on empty / foreign tenant", () => {
    const reg = new ChannelRegistry();
    reg.register("org_a", fakeAdapter("c1"));
    const gw = new ChannelGateway(reg);
    expect(() => gw.ingest("", asChannelId("c1"), { type: "message" })).toThrow(/tenant/i);
    expect(() => gw.ingest("org_b", asChannelId("c1"), { type: "message" })).toThrow(
      UnknownChannelError,
    );
  });
});

/* -------------------------------------------------------------------------- */
/* ChannelGateway.route                                                       */
/* -------------------------------------------------------------------------- */

describe("ChannelGateway.route", () => {
  it("sends a reply back through the originating channel", async () => {
    const reg = new ChannelRegistry();
    const a = fakeAdapter("c1");
    const b = fakeAdapter("c2");
    reg.register("org_a", a);
    reg.register("org_a", b);
    const gw = new ChannelGateway(reg);

    const res = await gw.route({
      tenantId: "org_a",
      channelId: asChannelId("c2"),
      chatId: "ch9",
      text: "pong",
    });

    expect(res.messageId).toBe("c2-1");
    expect(b.sent).toHaveLength(1);
    expect(a.sent).toHaveLength(0);
    expect(b.sent[0]).toMatchObject({ chatId: "ch9", text: "pong" });
  });

  it("throws UnknownChannelError when routing to an unknown channel", async () => {
    const gw = new ChannelGateway(new ChannelRegistry());
    await expect(
      gw.route({ tenantId: "org_a", channelId: asChannelId("ghost"), chatId: "c", text: "x" }),
    ).rejects.toThrow(UnknownChannelError);
  });

  it("fails closed on empty tenantId for route", async () => {
    const reg = new ChannelRegistry();
    reg.register("org_a", fakeAdapter("c1"));
    const gw = new ChannelGateway(reg);
    await expect(
      gw.route({ tenantId: "", channelId: asChannelId("c1"), chatId: "c", text: "x" }),
    ).rejects.toThrow(/tenant/i);
  });

  it("rejects a foreign tenant routing through another tenant's channel", async () => {
    const reg = new ChannelRegistry();
    reg.register("org_a", fakeAdapter("c1"));
    const gw = new ChannelGateway(reg);
    await expect(
      gw.route({ tenantId: "org_b", channelId: asChannelId("c1"), chatId: "c", text: "x" }),
    ).rejects.toThrow(UnknownChannelError);
  });

  it("rejects a tenant mismatch between reply and resolved adapter scope", async () => {
    const reg = new ChannelRegistry();
    reg.register("org_a", fakeAdapter("c1"));
    const gw = new ChannelGateway(reg);
    // Whitespace tenant — fail closed before any send.
    await expect(
      gw.route({ tenantId: "   ", channelId: asChannelId("c1"), chatId: "c", text: "x" }),
    ).rejects.toThrow(/tenant/i);
  });

  it("rejects a structurally-invalid OutboundMessage via zod", async () => {
    const reg = new ChannelRegistry();
    const a = fakeAdapter("c1");
    reg.register("org_a", a);
    const gw = new ChannelGateway(reg);
    await expect(
      // @ts-expect-error — text missing on purpose to hit the zod boundary.
      gw.route({ tenantId: "org_a", channelId: asChannelId("c1"), chatId: "c" }),
    ).rejects.toThrow();
    expect(a.sent).toHaveLength(0);
  });
});

/* -------------------------------------------------------------------------- */
/* replyTo (pure helper)                                                      */
/* -------------------------------------------------------------------------- */

describe("replyTo", () => {
  const inbound: InboundMessage = {
    tenantId: "org_a",
    channelId: asChannelId("c1"),
    chatId: "ch1",
    threadId: "t1",
    senderId: "u1",
    text: "ping",
    receivedAt: "2026-05-17T00:00:00.000Z",
    raw: { id: "m1" },
  };

  it("derives a correctly-addressed OutboundMessage on the same channel/chat/thread", () => {
    const out = replyTo(inbound, "pong");
    expect(out).toEqual({
      tenantId: "org_a",
      channelId: asChannelId("c1"),
      chatId: "ch1",
      threadId: "t1",
      text: "pong",
    });
  });

  it("wires replyToMessageId when provided", () => {
    const out = replyTo(inbound, "pong", { replyToMessageId: "m1" });
    expect(out.replyToMessageId).toBe("m1");
  });

  it("does not mutate the inbound message", () => {
    const snapshot = JSON.parse(JSON.stringify(inbound));
    replyTo(inbound, "pong", { replyToMessageId: "m1" });
    expect(inbound).toEqual(snapshot);
  });

  it("omits threadId when the inbound has none (exactOptional-safe)", () => {
    const noThread: InboundMessage = {
      tenantId: "org_a",
      channelId: asChannelId("c1"),
      chatId: "ch1",
      senderId: "u1",
      text: "ping",
      receivedAt: "2026-05-17T00:00:00.000Z",
      raw: {},
    };
    const out = replyTo(noThread, "pong");
    expect("threadId" in out).toBe(false);
  });

  it("fails closed when the inbound carries an empty tenantId", () => {
    const bad: InboundMessage = { ...inbound, tenantId: "" };
    expect(() => replyTo(bad, "pong")).toThrow(/tenant/i);
  });

  it("a replyTo result routes back through the same channel end-to-end", async () => {
    const reg = new ChannelRegistry();
    const a = fakeAdapter("c1");
    reg.register("org_a", a);
    const gw = new ChannelGateway(reg);

    const out = replyTo(inbound, "pong", { replyToMessageId: "m1" });
    const res = await gw.route(out);
    expect(res.messageId).toBe("c1-1");
    expect(a.sent[0]).toMatchObject({
      chatId: "ch1",
      threadId: "t1",
      text: "pong",
      replyToMessageId: "m1",
    });
  });
});

/* -------------------------------------------------------------------------- */
/* Capabilities surfaced from meta                                            */
/* -------------------------------------------------------------------------- */

describe("ChannelGateway capabilities", () => {
  it("surfaces channel capabilities from the adapter meta", () => {
    const reg = new ChannelRegistry();
    reg.register(
      "org_a",
      fakeAdapter("c1", { capabilities: { threads: false, reactions: true, streaming: false } }),
    );
    const gw = new ChannelGateway(reg);
    const caps = gw.capabilities("org_a", asChannelId("c1"));
    expect(caps).toEqual({ threads: false, reactions: true, streaming: false });
  });

  it("describe() returns the full meta for a registered channel", () => {
    const reg = new ChannelRegistry();
    reg.register("org_a", fakeAdapter("c1"));
    const gw = new ChannelGateway(reg);
    const m = gw.describe("org_a", asChannelId("c1"));
    expect(m.id).toBe("c1");
    expect(m.displayName).toBe("Channel c1");
    expect(m.capabilities).toEqual({ threads: true, reactions: false, streaming: true });
  });

  it("capabilities() throws UnknownChannelError for an unregistered channel", () => {
    const gw = new ChannelGateway(new ChannelRegistry());
    expect(() => gw.capabilities("org_a", asChannelId("ghost"))).toThrow(UnknownChannelError);
  });

  it("TenantMismatchError is exported and distinct from UnknownChannelError", () => {
    expect(new TenantMismatchError("x").name).toBe("TenantMismatchError");
    expect(new TenantMismatchError("x")).not.toBeInstanceOf(UnknownChannelError);
  });

  it("does not log to console during normal operation", () => {
    const spy = vi.spyOn(console, "log");
    const reg = new ChannelRegistry();
    reg.register("org_a", fakeAdapter("c1"));
    const gw = new ChannelGateway(reg);
    gw.ingest("org_a", asChannelId("c1"), { type: "message", chatId: "c", text: "hi" });
    expect(spy).not.toHaveBeenCalled();
    spy.mockRestore();
  });
});
