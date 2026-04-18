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

import { emitLicenseCliEvent, isTelemetryDisabled } from "./analytics-emit.js";

async function flushAsync() {
  for (let i = 0; i < 5; i++) {
    await new Promise<void>((resolve) => setImmediate(resolve));
  }
}

describe("emitLicenseCliEvent", () => {
  beforeEach(() => {
    trackMock.mockClear();
    createAnalyticsClientMock.mockClear();
    delete process.env.NEBUTRA_TELEMETRY;
  });

  afterEach(() => {
    delete process.env.NEBUTRA_TELEMETRY;
  });

  it("emits license.cli with action=activate_attempted", async () => {
    emitLicenseCliEvent({ action: "activate_attempted" });
    await flushAsync();

    expect(trackMock).toHaveBeenCalledWith("license.cli", {
      action: "activate_attempted",
    });
  });

  it("emits license.cli with action=activated and tier/type", async () => {
    emitLicenseCliEvent({ action: "activated", tier: "INDIVIDUAL", type: "FREE" });
    await flushAsync();

    expect(trackMock).toHaveBeenCalledWith("license.cli", {
      action: "activated",
      tier: "INDIVIDUAL",
      type: "FREE",
    });
  });

  it("emits license.cli with action=failed and error_code", async () => {
    emitLicenseCliEvent({ action: "failed", error_code: "invalid_format" });
    await flushAsync();

    expect(trackMock).toHaveBeenCalledWith("license.cli", {
      action: "failed",
      error_code: "invalid_format",
    });
  });

  it("respects NEBUTRA_TELEMETRY=0", async () => {
    process.env.NEBUTRA_TELEMETRY = "0";
    emitLicenseCliEvent({ action: "activate_attempted" });
    await flushAsync();

    expect(trackMock).not.toHaveBeenCalled();
  });

  it("is fire-and-forget — returns void synchronously", () => {
    const result = emitLicenseCliEvent({ action: "activate_attempted" });
    expect(result).toBeUndefined();
  });

  it("swallows analytics errors", async () => {
    trackMock.mockRejectedValueOnce(new Error("posthog exploded"));
    expect(() =>
      emitLicenseCliEvent({ action: "activate_attempted" }),
    ).not.toThrow();
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

  it("returns true on opts.noTelemetry", () => {
    expect(isTelemetryDisabled({ noTelemetry: true })).toBe(true);
  });
});
