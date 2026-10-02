import { describe, expect, it } from "vitest";
import { handleSupplyModelSignal, supplyModelSignal } from "./supplyModelSignal.js";

function fakeStep() {
  const sent: Array<{ name: string; data: Record<string, unknown> }> = [];
  return {
    sent,
    sendEvent: async (_id: string, payload: { name: string; data: Record<string, unknown> }) => {
      sent.push(payload);
    },
  };
}

describe("handleSupplyModelSignal", () => {
  it("requests a targeted re-probe for error_spike", async () => {
    const step = fakeStep();
    const result = await handleSupplyModelSignal({
      event: {
        data: { sourceKey: "cliproxyapi", upstreamModel: "gpt-image-2.5", kind: "error_spike" },
      },
      step,
    });
    expect(result.requested).toBe(true);
    expect(step.sent).toHaveLength(1);
    expect(step.sent[0]?.name).toBe("supply/probe.requested");
    expect(step.sent[0]?.data.sourceKey).toBe("cliproxyapi");
    expect(step.sent[0]?.data.upstreamModels).toEqual(["gpt-image-2.5"]);
  });

  it("requests a targeted re-probe for rate_limited", async () => {
    const step = fakeStep();
    const result = await handleSupplyModelSignal({
      event: { data: { sourceKey: "cliproxyapi", upstreamModel: "gpt-4o", kind: "rate_limited" } },
      step,
    });
    expect(result.requested).toBe(true);
    expect(step.sent[0]?.data.upstreamModels).toEqual(["gpt-4o"]);
  });

  it("is a no-op for quota_threshold — a quota crossing is not a capability problem", async () => {
    const step = fakeStep();
    const result = await handleSupplyModelSignal({
      event: { data: { sourceKey: "goat-account", kind: "quota_threshold" } },
      step,
    });
    expect(result.requested).toBe(false);
    expect(step.sent).toHaveLength(0);
  });

  it("is a no-op when no upstreamModel is given for a non-quota kind (nothing to target)", async () => {
    const step = fakeStep();
    const result = await handleSupplyModelSignal({
      event: { data: { sourceKey: "cliproxyapi", kind: "error_spike" } },
      step,
    });
    expect(result.requested).toBe(false);
  });
});

describe("supplyModelSignal — debounce configuration", () => {
  it("debounces per (sourceKey, upstreamModel) so a burst of signals fires one re-probe", () => {
    const opts = (
      supplyModelSignal as unknown as {
        opts: { debounce?: { key?: string; period?: string; timeout?: string } };
      }
    ).opts;
    expect(opts.debounce).toBeDefined();
    expect(opts.debounce?.key).toContain("sourceKey");
    expect(opts.debounce?.key).toContain("upstreamModel");
    expect(opts.debounce?.period).toBe("2m");
    // A source that never stops erroring must still eventually get probed.
    expect(opts.debounce?.timeout).toBeDefined();
  });
});
