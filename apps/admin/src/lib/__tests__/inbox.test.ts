import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

const { _resetManifestCache, loadManifests } = await import("../contract-client");
const { buildInbox } = await import("../inbox");
const { _resetProbeCache, probeFleet } = await import("../probe");

const manifest = {
  contract: "nebutra.admin/v1",
  product: "router",
  label: "Nebutra Router",
  version: "0.1.1",
  origin: "https://router.example.com",
  graph: "labs",
  status: "wip",
  health: "/api/health",
  domains: [
    {
      id: "supply",
      label: "Supply",
      actions: [
        {
          id: "channel.sync",
          verb: "Sync channel",
          role: "platform_operator",
          url: "/api/admin/v1/supply/actions/channel.sync",
        },
      ],
      signals: [
        {
          id: "engine.down",
          label: "Engine unreachable",
          severity: "critical",
          probe: "/api/admin/v1/supply/signals/engine.down",
        },
        {
          id: "channel.drift",
          label: "Channel out of sync",
          severity: "warn",
          probe: "/api/admin/v1/supply/signals/channel.drift",
          action: "channel.sync",
        },
        {
          id: "account.expired",
          label: "Account needs re-login",
          severity: "warn",
          probe: "/api/admin/v1/supply/signals/account.expired",
        },
      ],
    },
  ],
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}
const caller = { userId: "u1", role: "platform_operator" as const };

describe("inbox", () => {
  afterEach(() => {
    _resetManifestCache();
    _resetProbeCache();
  });

  it("collects raised signals across products, ranks by severity, keeps unknown separate", async () => {
    process.env.SERVICE_SECRET = "s";
    const fetchImpl = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      if (url.endsWith("/.well-known/nebutra-admin.json")) return json(manifest);
      expect(new Headers(init?.headers).get("x-service-token")).toBeTruthy();
      expect(new Headers(init?.headers).get("x-role")).toBe("platform_operator");
      const now = new Date().toISOString();
      if (url.endsWith("engine.down"))
        return json({ id: "engine.down", status: "ok", severity: "critical", probedAt: now });
      if (url.endsWith("channel.drift"))
        return json({
          id: "channel.drift",
          status: "raised",
          severity: "warn",
          probedAt: now,
          title: "Channel out of sync",
          action: "channel.sync",
        });
      if (url.endsWith("account.expired"))
        return json({ error: { code: "upstream_unavailable", message: "cliproxyapi 503" } }, 503);
      return json({}, 404);
    });
    const inbox = await buildInbox(caller, fetchImpl as unknown as typeof fetch);
    expect(inbox.items.map((i) => i.signal.id)).toEqual(["channel.drift"]);
    expect(inbox.items[0]?.action?.id).toBe("channel.sync");
    expect(inbox.unknown.map((i) => i.signal.id)).toEqual(["account.expired"]);
    expect(inbox.unknown[0]?.reading.detail).toContain("cliproxyapi 503");
    expect(inbox.failures).toEqual([]);
  });

  it("reports an unreachable manifest instead of hiding the product", async () => {
    const fetchImpl = vi.fn(async () => json({ error: "nope" }, 502));
    const { products, failures } = await loadManifests(fetchImpl as unknown as typeof fetch);
    expect(products).toEqual([]);
    expect(failures[0]?.serviceId).toBe("@nebutra/router");
  });
});

describe("probeFleet", () => {
  afterEach(() => _resetProbeCache());

  it("never renders green without a probe: no endpoint → unknown, timeout → down, ok → healthy", async () => {
    const fetchImpl = vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url.includes("router"))
        return json({ status: "healthy", version: "0.1.1", timestamp: "t", checks: {} });
      if (url.includes("app.")) throw new Error("timeout");
      return json({ status: "degraded", timestamp: "t", checks: {} });
    });
    const rows = await probeFleet(fetchImpl as unknown as typeof fetch, true);
    const byId = Object.fromEntries(rows.map((r) => [r.id, r]));
    expect(byId["@nebutra/router"]).toMatchObject({ status: "healthy", version: "0.1.1" });
    expect(byId["@nebutra/web"]?.status).toBe("down");
    expect(
      rows
        .filter((r) => r.health === null)
        .every((r) => r.status === "unknown" && r.detail === "no health endpoint"),
    ).toBe(true);
    expect(rows.some((r) => r.status === "healthy" && r.probedAt === null)).toBe(false);
  });
});
