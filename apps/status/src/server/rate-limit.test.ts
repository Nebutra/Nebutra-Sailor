import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { POST as setup } from "@/app/api/v1/auth/setup/route";
import { POST as signIn } from "@/app/api/v1/auth/sign-in/route";
import { setDbForTests } from "./db";
import { clientIp, RateLimiter } from "./rate-limit";
import { createTestDb, type TestDb } from "./testing";

describe("RateLimiter", () => {
  it("allows max per sliding window, then reports the wait", () => {
    let now = 0;
    const limiter = new RateLimiter(() => now);
    const limit = { max: 3, windowMs: 60_000 };
    expect([0, 1, 2].map(() => limiter.take("k", limit))).toEqual([0, 0, 0]);
    expect(limiter.take("k", limit)).toBe(60);
    now = 30_000;
    expect(limiter.take("k", limit)).toBe(30);
    now = 60_001;
    expect(limiter.take("k", limit)).toBe(0);
    limiter.reset("k");
    expect(limiter.retryAfter("k", limit)).toBe(0);
  });

  it("reads the proxy's client address", () => {
    const r = (headers: Record<string, string>) => new Request("http://x/", { headers });
    expect(clientIp(r({ "x-real-ip": "1.2.3.4" }))).toBe("1.2.3.4");
    expect(clientIp(r({ "x-forwarded-for": "5.6.7.8, 10.0.0.1" }))).toBe("5.6.7.8");
    process.env.STATUS_TRUST_PROXY = "off";
    expect(clientIp(r({ "x-real-ip": "1.2.3.4" }))).toBe("direct");
    delete process.env.STATUS_TRUST_PROXY;
  });
});

describe("sign-in and setup limits", () => {
  let t: TestDb;
  beforeAll(async () => {
    t = await createTestDb();
    setDbForTests(t.db);
  }, 60_000);
  afterAll(async () => {
    setDbForTests(null);
    await t.close();
  });

  const attempt = (email: string, ip: string) =>
    signIn(
      new Request("https://s.test/api/v1/auth/sign-in", {
        method: "POST",
        headers: { "content-type": "application/json", "x-real-ip": ip },
        body: JSON.stringify({ email, password: "wrong password" }),
      }),
    );

  it("locks an email after 10 failures from any address, unknown emails included", async () => {
    for (let i = 0; i < 10; i++) {
      expect((await attempt("victim@acme.test", `10.0.0.${i}`)).status).toBe(401);
    }
    const locked = await attempt("victim@acme.test", "10.0.1.1");
    expect(locked.status).toBe(429);
    expect(Number(locked.headers.get("retry-after"))).toBeGreaterThan(0);
    expect((await attempt("other@acme.test", "10.0.1.1")).status).toBe(401);
  });

  it("limits one address to 30 attempts across emails", async () => {
    for (let i = 0; i < 30; i++) {
      expect((await attempt(`u${i}@acme.test`, "192.0.2.7")).status).toBe(401);
    }
    expect((await attempt("u99@acme.test", "192.0.2.7")).status).toBe(429);
  }, 60_000);

  it("limits setup attempts per address", async () => {
    const call = () =>
      setup(
        new Request("https://s.test/api/v1/auth/setup", {
          method: "POST",
          headers: { "content-type": "application/json", "x-real-ip": "198.51.100.9" },
          body: "{}",
        }),
      );
    for (let i = 0; i < 10; i++) expect((await call()).status).not.toBe(429);
    expect((await call()).status).toBe(429);
  });
});
