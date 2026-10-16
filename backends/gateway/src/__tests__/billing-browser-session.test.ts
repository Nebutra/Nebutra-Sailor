import { Hono } from "hono";
import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("@nebutra/logger", () => ({
  logger: { warn: vi.fn(), info: vi.fn(), error: vi.fn(), debug: vi.fn() },
}));

import { browserSession, setBillingSessionAuth } from "../routes/billing/session.js";

/**
 * The product app's /billing calls the gateway with its session cookie; the
 * billing routes read that cookie when nothing upstream resolved an identity.
 */

const getSession = vi.fn();

function app(upstream: Record<string, unknown> = {}) {
  const hono = new Hono();
  hono.use("*", async (c, next) => {
    c.set("tenant" as never, upstream as never);
    await next();
  });
  hono.use("*", browserSession);
  hono.all("/probe", (c) => c.json(c.get("tenant" as never)));
  return hono;
}

afterEach(() => {
  getSession.mockReset();
  setBillingSessionAuth(undefined);
  delete process.env.NEXT_PUBLIC_APP_URL;
});

describe("browserSession", () => {
  it("resolves the buyer and their active organization from the session cookie", async () => {
    setBillingSessionAuth(async () => ({ getSession }));
    getSession.mockResolvedValue({ userId: "user_1", organizationId: "org_1", role: "owner" });

    const res = await app().request("/probe", { headers: { cookie: "better-auth.session=x" } });

    expect(await res.json()).toEqual({
      userId: "user_1",
      organizationId: "org_1",
      tenantId: "org_1",
      tenantKind: "organization",
      role: "owner",
    });
  });

  it("leaves a Bearer or service-token identity to the upstream middleware", async () => {
    setBillingSessionAuth(async () => ({ getSession }));

    await app({ userId: "svc_user" }).request("/probe", { headers: { cookie: "a=b" } });
    await app().request("/probe", { headers: { cookie: "a=b", authorization: "Bearer t" } });

    expect(getSession).not.toHaveBeenCalled();
  });

  it("refuses a cross-site write that carries the buyer's cookie", async () => {
    setBillingSessionAuth(async () => ({ getSession }));
    process.env.NEXT_PUBLIC_APP_URL = "http://localhost:3001";

    const res = await app().request("http://localhost:3002/probe", {
      method: "POST",
      headers: { cookie: "a=b", origin: "https://evil.example" },
    });

    expect(res.status).toBe(403);
    expect(getSession).not.toHaveBeenCalled();
  });

  it("accepts a write from the product app's own origin", async () => {
    setBillingSessionAuth(async () => ({ getSession }));
    getSession.mockResolvedValue({ userId: "user_1" });
    process.env.NEXT_PUBLIC_APP_URL = "http://localhost:3001";

    const res = await app().request("http://localhost:3002/probe", {
      method: "POST",
      headers: { cookie: "a=b", origin: "http://localhost:3001" },
    });

    expect(res.status).toBe(200);
    expect(await res.json()).toMatchObject({ userId: "user_1" });
  });

  it("stays unauthenticated when the cookie holds no session", async () => {
    setBillingSessionAuth(async () => ({ getSession }));
    getSession.mockResolvedValue(null);

    const res = await app().request("/probe", { headers: { cookie: "a=b" } });

    expect(await res.json()).toEqual({});
  });
});
