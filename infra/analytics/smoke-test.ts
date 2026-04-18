import { describe, it, expect } from "vitest";

const ENDPOINTS = {
  posthog: "http://localhost:8000",
  umami: "http://localhost:3010",
  metabase: "http://localhost:3005",
};

describe("analytics stack smoke test", () => {
  it("PostHog is reachable", async () => {
    const res = await fetch(`${ENDPOINTS.posthog}/_health`);
    expect(res.ok).toBe(true);
  }, 15000);

  it("Umami is reachable", async () => {
    const res = await fetch(`${ENDPOINTS.umami}/api/heartbeat`);
    expect([200, 401]).toContain(res.status); // Umami heartbeat may require auth in some versions
  }, 15000);

  it("Metabase is reachable", async () => {
    const res = await fetch(`${ENDPOINTS.metabase}/api/health`);
    expect(res.ok).toBe(true);
  }, 30000);

  it("PostHog capture API accepts events", async () => {
    const res = await fetch(`${ENDPOINTS.posthog}/capture/`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        api_key: process.env.POSTHOG_PROJECT_API_KEY ?? "phc_test",
        event: "smoke_test",
        distinct_id: "smoke_test_user",
        properties: { test: true },
      }),
    });
    expect(res.ok || res.status === 200).toBe(true);
  }, 10000);
});
