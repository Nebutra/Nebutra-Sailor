import { beforeEach, describe, expect, it, vi } from "vitest";

import type { ProductAnalyticsClient } from "../track";
import { createProductAnalyticsClient } from "../track";

describe("ProductAnalyticsClient", () => {
  let mockFetch: ReturnType<typeof vi.fn>;
  let client: ProductAnalyticsClient;

  beforeEach(() => {
    mockFetch = vi.fn().mockResolvedValue({ ok: true, status: 200 });
    globalThis.fetch = mockFetch as unknown as typeof fetch;
    client = createProductAnalyticsClient({
      posthog: {
        apiKey: "phc_test",
        host: "http://localhost:8000",
      },
    });
  });

  it("track validates event against schema before sending", async () => {
    const result = await client.track("scaffold.completed", {
      template_version: "1.3.1",
      package_manager: "pnpm",
      region: "global",
      auth: "clerk",
      payment: "stripe",
      ai_providers: ["openai"],
      deploy_target: "vercel",
      duration_ms: 1000,
    });
    expect(result.success).toBe(true);
    expect(mockFetch).toHaveBeenCalledOnce();
  });

  it("track returns validation error for malformed payload", async () => {
    const result = await client.track("scaffold.completed", {
      package_manager: "invalid",
    } as unknown as Record<string, unknown>);
    expect(result.success).toBe(false);
    expect(result.error).toMatch(/validation/i);
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it("track rejects unknown event names", async () => {
    const result = await client.track(
      // @ts-expect-error - intentionally invalid event
      "unknown.event",
      {},
    );
    expect(result.success).toBe(false);
    expect(result.error).toMatch(/unknown event/i);
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it("track is fire-and-forget safe (network failure doesn't throw)", async () => {
    mockFetch.mockRejectedValue(new Error("network down"));
    const result = await client.track("scaffold.completed", {
      template_version: "1",
      package_manager: "pnpm",
      region: "global",
      auth: "x",
      payment: "x",
      ai_providers: [],
      deploy_target: "x",
      duration_ms: 1,
    });
    expect(result.success).toBe(false);
    expect(result.error).toBeDefined();
  });

  it("track does not throw when PostHog returns non-ok", async () => {
    mockFetch.mockResolvedValue({ ok: false, status: 500 });
    const result = await client.track("docs.search_query", {
      query: "rbac",
      result_count: 2,
    });
    expect(result.success).toBe(false);
    expect(result.error).toMatch(/500/);
  });

  it("track sends correct PostHog API payload structure", async () => {
    await client.track("sleptons", {
      action: "profile_viewed",
      userId: "user_123",
    });
    const [url, options] = mockFetch.mock.calls[0];
    expect(url).toContain("/capture/");
    const body = JSON.parse(options.body);
    expect(body).toMatchObject({
      api_key: "phc_test",
      event: "sleptons",
      distinct_id: "user_123",
    });
    expect(body.properties).toMatchObject({ action: "profile_viewed" });
    expect(body.timestamp).toBeDefined();
  });

  it("track falls back to 'anonymous' distinct_id when userId missing", async () => {
    await client.track("docs.search_query", {
      query: "tokens",
      result_count: 7,
    });
    const [, options] = mockFetch.mock.calls[0];
    const body = JSON.parse(options.body);
    expect(body.distinct_id).toBe("anonymous");
  });

  it("track is a no-op (success:true) when no provider configured", async () => {
    const noProviderClient = createProductAnalyticsClient({});
    const result = await noProviderClient.track("checkout", {
      action: "started",
      tier: "OPC",
    });
    expect(result.success).toBe(true);
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it("track invokes onError hook when network fails", async () => {
    mockFetch.mockRejectedValue(new Error("boom"));
    const onError = vi.fn();
    const c = createProductAnalyticsClient({
      posthog: { apiKey: "phc_test", host: "http://localhost:8000" },
      onError,
    });
    await c.track("scaffold.completed", {
      template_version: "1",
      package_manager: "pnpm",
      region: "global",
      auth: "x",
      payment: "x",
      ai_providers: [],
      deploy_target: "x",
      duration_ms: 1,
    });
    expect(onError).toHaveBeenCalledOnce();
    const [err, evt] = onError.mock.calls[0];
    expect(evt).toBe("scaffold.completed");
    expect(err).toBeInstanceOf(Error);
  });

  it("identify posts to /capture/ with $identify event", async () => {
    await client.identify("user_xyz", { email: "u@example.com" });
    expect(mockFetch).toHaveBeenCalledOnce();
    const [url, options] = mockFetch.mock.calls[0];
    expect(url).toContain("/capture/");
    const body = JSON.parse(options.body);
    expect(body).toMatchObject({
      api_key: "phc_test",
      event: "$identify",
      distinct_id: "user_xyz",
    });
    expect(body.$set).toMatchObject({ email: "u@example.com" });
  });

  it("identify never throws on network failure", async () => {
    mockFetch.mockRejectedValue(new Error("offline"));
    await expect(client.identify("user_1")).resolves.toBeUndefined();
  });

  it("flush is a no-op that resolves", async () => {
    await expect(client.flush()).resolves.toBeUndefined();
  });

  it("uses default host when not provided", async () => {
    const c = createProductAnalyticsClient({ posthog: { apiKey: "phc_x" } });
    await c.track("docs.search_query", { query: "q", result_count: 1 });
    const [url] = mockFetch.mock.calls[0];
    expect(url).toContain("https://app.posthog.com/capture/");
  });
});
