import { afterEach, describe, expect, it, vi } from "vitest";
import { detectMarket, isMainlandMarket, parseMarket } from "../market";

describe("detectMarket", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("is unknown when nothing is set", () => {
    expect(detectMarket({})).toBe("unknown");
  });

  it("reads NEBUTRA_LOCALE=cn as mainland China", () => {
    expect(detectMarket({ NEBUTRA_LOCALE: "cn" })).toBe("cn-mainland");
    expect(isMainlandMarket({ NEBUTRA_LOCALE: "cn" })).toBe(true);
  });

  it("reads the public mirror for client bundles", () => {
    expect(detectMarket({ NEXT_PUBLIC_NEBUTRA_LOCALE: "cn" })).toBe("cn-mainland");
  });

  it("keeps NEBUTRA_REGION and NEXT_PUBLIC_REGION as aliases", () => {
    expect(detectMarket({ NEBUTRA_REGION: "cn-mainland" })).toBe("cn-mainland");
    expect(detectMarket({ NEXT_PUBLIC_REGION: "hk" })).toBe("cn-hk-mo-tw");
  });

  it("lets NEBUTRA_LOCALE win over the aliases", () => {
    expect(detectMarket({ NEBUTRA_LOCALE: "global", NEBUTRA_REGION: "cn" })).toBe("overseas");
  });

  it("skips a value it cannot parse instead of reading it as global", () => {
    expect(detectMarket({ NEBUTRA_LOCALE: "mars", NEBUTRA_REGION: "cn" })).toBe("cn-mainland");
  });

  it("reads process.env when no env is passed", () => {
    vi.stubEnv("NEBUTRA_LOCALE", "cn");
    expect(isMainlandMarket()).toBe(true);
    vi.stubEnv("NEBUTRA_LOCALE", "");
    vi.stubEnv("NEBUTRA_REGION", "");
    vi.stubEnv("NEXT_PUBLIC_NEBUTRA_LOCALE", "");
    vi.stubEnv("NEXT_PUBLIC_REGION", "");
    expect(isMainlandMarket()).toBe(false);
  });
});

describe("parseMarket", () => {
  it("does not count HK/MO/TW as mainland", () => {
    expect(parseMarket("tw")).toBe("cn-hk-mo-tw");
    expect(isMainlandMarket({ NEBUTRA_LOCALE: "tw" })).toBe(false);
  });
});
