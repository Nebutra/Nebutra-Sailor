import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("@nebutra/audit", () => ({
  auditLogger: () => ({ log: vi.fn().mockResolvedValue(undefined) }),
}));

const { _resetLogins, completeLogin, listLogins, startLogin } = await import("./login");

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}
const caller = { userId: "u1", role: "platform_operator" as const };
const req = () => new Request("https://router/x");

describe("account login flows", () => {
  beforeEach(() => {
    process.env.CLIPROXY_MANAGEMENT_KEY = "mgmt";
    _resetLogins();
  });
  afterEach(() => {
    delete process.env.CLIPROXY_MANAGEMENT_KEY;
  });

  it("starts a flow, tracks it, completes it from the pasted callback, and reports ok", async () => {
    let status = "wait";
    const calls: string[] = [];
    const fetchImpl = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      calls.push(url);
      expect(new Headers(init?.headers).get("authorization")).toBe("Bearer mgmt");
      if (url.endsWith("/antigravity-auth-url"))
        return json({
          state: "st1",
          status: "ok",
          url: "https://accounts.google.com/o/oauth2/v2/auth?state=st1",
        });
      if (url.includes("/get-auth-status")) return json({ status });
      if (url.includes("/oauth-callback")) {
        status = "ok";
        return new Response("ok");
      }
      return json({}, 404);
    }) as unknown as typeof fetch;

    const started = await startLogin("antigravity", caller, req(), fetchImpl);
    expect(started.result).toMatchObject({
      state: "st1",
      provider: "antigravity",
      callbackHost: "localhost:51121",
    });

    const pendingList = await listLogins(fetchImpl);
    expect(pendingList.items[0]).toMatchObject({
      id: "st1",
      status: "wait",
      providerLabel: "Google · Antigravity (Gemini)",
    });

    const done = await completeLogin(
      "http://localhost:51121/oauth-callback?state=st1&code=4/abc&scope=x",
      caller,
      req(),
      fetchImpl,
    );
    expect(
      calls.some(
        (u) =>
          u.endsWith("/oauth-callback?state=st1&code=4%2Fabc&scope=x") ||
          u.endsWith("/oauth-callback?state=st1&code=4/abc&scope=x"),
      ),
    ).toBe(true);
    expect(done.result).toMatchObject({ state: "st1", status: "ok" });
  });

  it("forwards a callback for a state this Machine never started", async () => {
    // A deploy between "start sign-in" and the paste-back empties the in-memory
    // map. CLIProxyAPI still holds the verifier, so the callback must reach it
    // rather than being refused here — and the provider comes from the port.
    const calls: string[] = [];
    const fetchImpl = vi.fn(async (url: string | URL) => {
      calls.push(String(url));
      return new Response(JSON.stringify({ status: "ok" }), { status: 200 });
    }) as unknown as typeof fetch;

    const done = await completeLogin(
      "http://localhost:51121/oauth-callback?state=nope&code=1",
      caller,
      req(),
      fetchImpl,
    );

    expect(calls.some((u) => u.includes("/oauth-callback") && u.includes("state=nope"))).toBe(true);
    expect(done.result).toMatchObject({ state: "nope" });
    expect(done.summary).toContain("Antigravity");
  });

  it("still refuses something that is not a URL", async () => {
    const fetchImpl = vi.fn() as unknown as typeof fetch;
    await expect(completeLogin("not a url", caller, req(), fetchImpl)).rejects.toThrow(/full URL/);
  });
});
