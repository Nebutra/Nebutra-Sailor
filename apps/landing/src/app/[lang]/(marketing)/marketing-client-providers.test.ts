import { describe, expect, it } from "vitest";
import { shouldMountMarketingGoogleOneTap } from "./marketing-google-one-tap-policy";

describe("shouldMountMarketingGoogleOneTap", () => {
  it("does not mount Google One Tap on referral waitlist pages", () => {
    expect(shouldMountMarketingGoogleOneTap("/refer", true)).toBe(false);
    expect(shouldMountMarketingGoogleOneTap("/refer/", true)).toBe(false);
    expect(shouldMountMarketingGoogleOneTap("/zh/refer", true)).toBe(false);
  });

  it("keeps Google One Tap available on other marketing pages when enabled", () => {
    expect(shouldMountMarketingGoogleOneTap("/", true)).toBe(true);
    expect(shouldMountMarketingGoogleOneTap("/pricing", true)).toBe(true);
  });

  it("honors the global feature flag", () => {
    expect(shouldMountMarketingGoogleOneTap("/pricing", false)).toBe(false);
  });
});
