import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("@nebutra/billing", () => ({ deductCredits: vi.fn(), refundCredits: vi.fn() }));

const { chargeOf, isRefundable, ModelUnavailableError, paraJobCost } = await import(
  "./para-credits.js"
);

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("para job cost", () => {
  it("prices per output: image 10, text 1, and nothing generated is free by default", () => {
    expect(paraJobCost({ mode: "image" })).toBe(10);
    expect(paraJobCost({ mode: "image", count: 4 })).toBe(40);
    expect(paraJobCost({ mode: "text" })).toBe(1);
    expect(paraJobCost({ mode: "video" })).toBeGreaterThan(0);
    expect(paraJobCost({ mode: "audio" })).toBeGreaterThan(0);
  });

  it("a deployment can reprice a mode, and a malformed override falls back to the default", () => {
    vi.stubEnv("PARA_CREDITS_PER_IMAGE", "6");
    expect(paraJobCost({ mode: "image", count: 2 })).toBe(12);
    vi.stubEnv("PARA_CREDITS_PER_IMAGE", "cheap");
    expect(paraJobCost({ mode: "image" })).toBe(10);
    vi.stubEnv("PARA_CREDITS_PER_IMAGE", "-3");
    expect(paraJobCost({ mode: "image" })).toBe(10);
  });
});

describe("video job cost", () => {
  it("is credits per second of the resolved model times the duration it will run", () => {
    // Auto → Wan 2.7, 720P (13/s), default 5 s.
    expect(paraJobCost({ mode: "video" })).toBe(65);
    expect(paraJobCost({ mode: "video", params: { duration: 10 } })).toBe(130);
    expect(paraJobCost({ mode: "video", params: { duration: "10s" } })).toBe(130);
    expect(paraJobCost({ mode: "video", count: 2, params: { duration: 5 } })).toBe(130);
    expect(
      paraJobCost({
        mode: "video",
        model: "wan-2.7",
        params: { duration: 5, resolution: "1080P" },
      }),
    ).toBe(105);
  });

  it("clamps duration to what the model accepts and ignores malformed input", () => {
    expect(paraJobCost({ mode: "video", params: { duration: 600 } })).toBe(13 * 15);
    expect(paraJobCost({ mode: "video", params: { duration: 1 } })).toBe(13 * 2);
    expect(paraJobCost({ mode: "video", params: { duration: "5 minutes" } })).toBe(65);
    expect(paraJobCost({ mode: "video", params: { duration: { s: 5 } } })).toBe(65);
  });

  it("the video override is per second", () => {
    vi.stubEnv("PARA_CREDITS_PER_VIDEO", "30");
    expect(paraJobCost({ mode: "video", params: { duration: 4 } })).toBe(120);
  });

  it("refuses planned and unknown models instead of pricing them", () => {
    expect(() => paraJobCost({ mode: "video", model: "seedance-2.5" })).toThrow(
      ModelUnavailableError,
    );
    expect(() => paraJobCost({ mode: "video", model: "Kling 3" })).toThrow(ModelUnavailableError);
  });
});

describe("charge on a task", () => {
  it("reads the charge only when both key and credits are there", () => {
    expect(chargeOf({ metadata: { charge: { key: "k", credits: 10 } } })).toEqual({
      key: "k",
      credits: 10,
    });
    expect(chargeOf({ metadata: { charge: { key: "k" } } })).toBeNull();
    expect(chargeOf({ metadata: {} })).toBeNull();
    expect(chargeOf({})).toBeNull();
  });

  it("refunds only the origin's failed and cancelled states", () => {
    expect(isRefundable({ status: "failed" })).toBe(true);
    expect(isRefundable({ status: "cancelled" })).toBe(true);
    for (const status of ["queued", "running", "succeeded", undefined]) {
      expect(isRefundable({ status })).toBe(false);
    }
  });
});
