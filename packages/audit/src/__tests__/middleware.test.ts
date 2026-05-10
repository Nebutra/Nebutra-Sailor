import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@nebutra/db", () => ({
  getSystemDb: () => {
    throw new Error("no db in unit tests");
  },
}));

vi.mock("@nebutra/logger", () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

const { auditLogger, withAudit, extractRequestContext } = await import("../middleware");
const { MemoryAuditProvider } = await import("../providers/memory");
const providersModule = await import("../providers");

let memProvider: InstanceType<typeof MemoryAuditProvider>;

beforeEach(() => {
  memProvider = new MemoryAuditProvider();
  // Inject our memory provider directly into the cached singleton.
  providersModule.__resetAuditProviderForTests();
  // Replace the factory output by re-cacheing with a known instance.
  // We rely on getAuditProvider's lazy creation by spying once.
  vi.spyOn(providersModule, "getAuditProvider").mockResolvedValue(memProvider);
});

function makeRequest(headers: Record<string, string>, url = "https://example.test/api/x"): Request {
  return new Request(url, { headers });
}

describe("extractRequestContext", () => {
  it("extracts ip, userAgent, and request id", () => {
    const req = makeRequest({
      "x-forwarded-for": "10.0.0.1, 10.0.0.2",
      "user-agent": "Test/1.0",
      "x-request-id": "req_abc",
    });
    const ctx = extractRequestContext(req);
    expect(ctx.ip).toBe("10.0.0.1");
    expect(ctx.userAgent).toBe("Test/1.0");
    expect(ctx.requestId).toBe("req_abc");
  });

  it("returns empty object when req is undefined", () => {
    expect(extractRequestContext(undefined)).toEqual({});
  });
});

describe("auditLogger", () => {
  it("populates actor, tenant, and request context from defaults + req", async () => {
    const req = makeRequest({
      "x-forwarded-for": "1.2.3.4",
      "user-agent": "AgentX",
    });
    const log = auditLogger(req, {
      actor: { id: "user_1", type: "user" },
      tenantId: "org_1",
      resource: { type: "session", id: "sess_1" },
    });

    await log.log({ action: "auth.login.success", outcome: "success" });

    const events = await memProvider.query({});
    expect(events).toHaveLength(1);
    const event = events[0];
    expect(event?.actor.id).toBe("user_1");
    expect(event?.tenantId).toBe("org_1");
    expect(event?.context?.ip).toBe("1.2.3.4");
    expect(event?.context?.userAgent).toBe("AgentX");
    expect(event?.outcome).toBe("success");
  });

  it("drops events lacking a resource (no default + none provided)", async () => {
    const req = makeRequest({});
    const log = auditLogger(req, {
      actor: { id: "user_1", type: "user" },
      tenantId: "org_1",
    });
    await log.log({ action: "auth.login.success", outcome: "success" });
    const events = await memProvider.query({});
    expect(events).toHaveLength(0);
  });
});

describe("withAudit", () => {
  it("wraps a handler and logs success on 200", async () => {
    const wrapped = withAudit(
      {
        action: "settings.updated",
        resolveContext: async () => ({
          actor: { id: "user_1", type: "user" },
          tenantId: "org_1",
          resource: { type: "settings", id: "settings_1" },
        }),
      },
      async () => new Response(JSON.stringify({ ok: true }), { status: 200 }),
    );

    const res = await wrapped(makeRequest({}));
    expect(res.status).toBe(200);

    const events = await memProvider.query({});
    expect(events).toHaveLength(1);
    expect(events[0]?.outcome).toBe("success");
    expect(events[0]?.action).toBe("settings.updated");
  });

  it("logs 'denied' when handler returns 403", async () => {
    const wrapped = withAudit(
      {
        action: "settings.updated",
        resolveContext: async () => ({
          actor: { id: "user_1", type: "user" },
          tenantId: "org_1",
          resource: { type: "settings", id: "settings_1" },
        }),
      },
      async () => new Response("forbidden", { status: 403 }),
    );

    const res = await wrapped(makeRequest({}));
    expect(res.status).toBe(403);
    const events = await memProvider.query({});
    expect(events[0]?.outcome).toBe("denied");
  });

  it("logs 'failure' and re-throws when handler throws", async () => {
    const wrapped = withAudit(
      {
        action: "settings.updated",
        resolveContext: async () => ({
          actor: { id: "user_1", type: "user" },
          tenantId: "org_1",
          resource: { type: "settings", id: "settings_1" },
        }),
      },
      async () => {
        throw new Error("boom");
      },
    );

    await expect(wrapped(makeRequest({}))).rejects.toThrow("boom");

    const events = await memProvider.query({});
    expect(events).toHaveLength(1);
    expect(events[0]?.outcome).toBe("failure");
  });

  it("skips audit when resolveContext returns null (e.g. unauthenticated)", async () => {
    const wrapped = withAudit(
      {
        action: "settings.updated",
        resolveContext: async () => null,
      },
      async () => new Response("ok"),
    );
    const res = await wrapped(makeRequest({}));
    expect(res.status).toBe(200);
    expect(await memProvider.query({})).toHaveLength(0);
  });
});
