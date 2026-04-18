import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const trackMock = vi.fn().mockResolvedValue({ success: true });
const createAnalyticsClientMock = vi.fn(() => ({
  track: trackMock,
  identify: vi.fn(),
  flush: vi.fn(),
}));

vi.mock("@nebutra/analytics", () => ({
  createAnalyticsClient: createAnalyticsClientMock,
}));

// Import under test AFTER the mock is declared (vi.mock is hoisted).
import { emitScaffoldCompleted, isTelemetryDisabled } from "./analytics-emit.js";

const baseProps = {
  template_version: "1.3.1",
  package_manager: "pnpm",
  region: "global",
  auth: "clerk",
  payment: "stripe",
  ai_providers: ["openai", "anthropic"],
  deploy_target: "vercel",
  duration_ms: 12345,
};

/**
 * Flush the microtask/macrotask queue so the fire-and-forget `void (async …)()`
 * inside `emitScaffoldCompleted` can resolve before we assert.
 */
async function flushAsync() {
  // Multiple cycles to let the dynamic-import promise + track() promise
  // both settle on Node's event loop.
  for (let i = 0; i < 5; i++) {
    await new Promise<void>((resolve) => setImmediate(resolve));
  }
}

describe("emitScaffoldCompleted", () => {
  beforeEach(() => {
    trackMock.mockClear();
    createAnalyticsClientMock.mockClear();
    delete process.env.NEBUTRA_TELEMETRY;
    delete process.env.NEBUTRA_POSTHOG_KEY;
    delete process.env.NEBUTRA_POSTHOG_HOST;
  });

  afterEach(() => {
    delete process.env.NEBUTRA_TELEMETRY;
  });

  it("emits scaffold.completed with all required properties", async () => {
    emitScaffoldCompleted(baseProps);
    await flushAsync();

    expect(createAnalyticsClientMock).toHaveBeenCalledTimes(1);
    expect(trackMock).toHaveBeenCalledTimes(1);
    expect(trackMock).toHaveBeenCalledWith("scaffold.completed", baseProps);
  });

  it("uses default PostHog host when NEBUTRA_POSTHOG_HOST is unset", async () => {
    emitScaffoldCompleted(baseProps);
    await flushAsync();

    const callArg = createAnalyticsClientMock.mock.calls[0]?.[0] as {
      posthog: { host: string };
    };
    expect(callArg.posthog.host).toBe("https://analytics.nebutra.com");
  });

  it("honours NEBUTRA_POSTHOG_HOST override", async () => {
    process.env.NEBUTRA_POSTHOG_HOST = "https://ph.example.test";
    emitScaffoldCompleted(baseProps);
    await flushAsync();

    const callArg = createAnalyticsClientMock.mock.calls[0]?.[0] as {
      posthog: { host: string };
    };
    expect(callArg.posthog.host).toBe("https://ph.example.test");
  });

  it("respects NEBUTRA_TELEMETRY=0 opt-out env var", async () => {
    process.env.NEBUTRA_TELEMETRY = "0";
    emitScaffoldCompleted(baseProps);
    await flushAsync();

    expect(trackMock).not.toHaveBeenCalled();
    expect(createAnalyticsClientMock).not.toHaveBeenCalled();
  });

  it("respects opts.noTelemetry flag", async () => {
    emitScaffoldCompleted(baseProps, { noTelemetry: true });
    await flushAsync();

    expect(trackMock).not.toHaveBeenCalled();
  });

  it("is fire-and-forget — returns void synchronously", () => {
    const result = emitScaffoldCompleted(baseProps);
    expect(result).toBeUndefined();
  });

  it("swallows errors from the analytics client", async () => {
    trackMock.mockRejectedValueOnce(new Error("posthog down"));

    // Should not throw — errors are swallowed.
    expect(() => emitScaffoldCompleted(baseProps)).not.toThrow();
    await flushAsync();
  });
});

describe("isTelemetryDisabled", () => {
  beforeEach(() => {
    delete process.env.NEBUTRA_TELEMETRY;
  });

  it("returns false by default", () => {
    expect(isTelemetryDisabled()).toBe(false);
  });

  it("returns true when NEBUTRA_TELEMETRY=0", () => {
    process.env.NEBUTRA_TELEMETRY = "0";
    expect(isTelemetryDisabled()).toBe(true);
  });

  it("returns true when NEBUTRA_TELEMETRY=false", () => {
    process.env.NEBUTRA_TELEMETRY = "false";
    expect(isTelemetryDisabled()).toBe(true);
  });

  it("returns true when opts.noTelemetry is true", () => {
    expect(isTelemetryDisabled({ noTelemetry: true })).toBe(true);
  });

  it("returns false when NEBUTRA_TELEMETRY=1", () => {
    process.env.NEBUTRA_TELEMETRY = "1";
    expect(isTelemetryDisabled()).toBe(false);
  });
});
