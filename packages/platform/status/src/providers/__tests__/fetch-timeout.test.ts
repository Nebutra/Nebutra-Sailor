import { afterEach, describe, expect, it, vi } from "vitest";
import { BetterstackStatusProvider } from "../betterstack";
import { InstatusStatusProvider } from "../instatus";
import { InternalStatusProvider } from "../internal";
import { OpenStatusProvider } from "../openstatus";
import { AtlassianStatuspageProvider } from "../statuspage";

function stubAbortedFetch() {
  const signals: Array<AbortSignal | undefined> = [];

  vi.stubGlobal(
    "fetch",
    vi.fn(async (_url: string | URL | Request, init?: RequestInit) => {
      signals.push(init?.signal ?? undefined);
      throw new DOMException("The operation timed out.", "TimeoutError");
    }),
  );

  return signals;
}

describe("status provider fetch timeout", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("passes a timeout signal to OpenStatus fetch and falls back safely", async () => {
    const signals = stubAbortedFetch();
    const provider = new OpenStatusProvider({ pageSlug: "nebutra", apiUrl: "https://status.test" });

    const summary = await provider.fetchSummary();

    expect(signals[0]).toBeInstanceOf(AbortSignal);
    expect(summary.status).toBe("unknown");
    expect(summary.monitors).toEqual([]);
  });

  it("passes a timeout signal to Atlassian Statuspage fetch and falls back safely", async () => {
    const signals = stubAbortedFetch();
    const provider = new AtlassianStatuspageProvider({
      provider: "statuspage",
      pageId: "nebutra",
      apiUrl: "https://status.test",
    });

    const summary = await provider.fetchSummary();

    expect(signals[0]).toBeInstanceOf(AbortSignal);
    expect(summary.status).toBe("unknown");
    expect(summary.activeIncidents).toEqual([]);
  });

  it("passes a timeout signal to Better Stack fetch and falls back safely", async () => {
    const signals = stubAbortedFetch();
    const provider = new BetterstackStatusProvider({
      provider: "betterstack",
      pageUrl: "https://status.test",
    });

    const summary = await provider.fetchSummary();

    expect(signals[0]).toBeInstanceOf(AbortSignal);
    expect(summary.status).toBe("unknown");
    expect(summary.monitors).toEqual([]);
  });

  it("passes a timeout signal to Instatus fetch and falls back safely", async () => {
    const signals = stubAbortedFetch();
    const provider = new InstatusStatusProvider({
      provider: "instatus",
      pageUrl: "https://status.test",
    });

    const summary = await provider.fetchSummary();

    expect(signals[0]).toBeInstanceOf(AbortSignal);
    expect(summary.status).toBe("unknown");
    expect(summary.scheduledMaintenances).toEqual([]);
  });

  it("passes a timeout signal to internal health fetch and falls back safely", async () => {
    const signals = stubAbortedFetch();
    const provider = new InternalStatusProvider({
      provider: "internal",
      healthUrl: "https://api.test/health",
    });

    const summary = await provider.fetchSummary();

    expect(signals[0]).toBeInstanceOf(AbortSignal);
    expect(summary.status).toBe("unknown");
    expect(summary.scheduledMaintenances).toEqual([]);
  });
});
