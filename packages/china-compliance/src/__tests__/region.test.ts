import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { detectChinaRegion, getCDNHints, isChinaRegion } from "../region.js";

const ENV_KEYS = ["NEBUTRA_REGION", "NEXT_PUBLIC_REGION"] as const;

function snapshotEnv() {
  return Object.fromEntries(ENV_KEYS.map((k) => [k, process.env[k]]));
}

function restoreEnv(snapshot: Record<string, string | undefined>) {
  for (const k of ENV_KEYS) {
    if (snapshot[k] === undefined) {
      delete process.env[k];
    } else {
      process.env[k] = snapshot[k];
    }
  }
}

describe("detectChinaRegion", () => {
  let snap: Record<string, string | undefined>;

  beforeEach(() => {
    snap = snapshotEnv();
    for (const k of ENV_KEYS) delete process.env[k];
  });

  afterEach(() => {
    restoreEnv(snap);
  });

  it("returns 'unknown' when no env is set", () => {
    expect(detectChinaRegion()).toBe("unknown");
  });

  it("prefers NEBUTRA_REGION over NEXT_PUBLIC_REGION", () => {
    process.env.NEBUTRA_REGION = "cn-mainland";
    process.env.NEXT_PUBLIC_REGION = "overseas";
    expect(detectChinaRegion()).toBe("cn-mainland");
  });

  it("falls back to NEXT_PUBLIC_REGION", () => {
    process.env.NEXT_PUBLIC_REGION = "cn-hk-mo-tw";
    expect(detectChinaRegion()).toBe("cn-hk-mo-tw");
  });

  it("normalizes synonyms (cn → cn-mainland, hk → cn-hk-mo-tw, global → overseas)", () => {
    process.env.NEBUTRA_REGION = "cn";
    expect(detectChinaRegion()).toBe("cn-mainland");

    process.env.NEBUTRA_REGION = "HK";
    expect(detectChinaRegion()).toBe("cn-hk-mo-tw");

    process.env.NEBUTRA_REGION = "global";
    expect(detectChinaRegion()).toBe("overseas");
  });

  it("returns 'unknown' for unrecognized values", () => {
    process.env.NEBUTRA_REGION = "atlantis";
    expect(detectChinaRegion()).toBe("unknown");
  });
});

describe("isChinaRegion", () => {
  let snap: Record<string, string | undefined>;

  beforeEach(() => {
    snap = snapshotEnv();
    for (const k of ENV_KEYS) delete process.env[k];
  });

  afterEach(() => {
    restoreEnv(snap);
  });

  it("returns true only for mainland", () => {
    process.env.NEBUTRA_REGION = "cn-mainland";
    expect(isChinaRegion()).toBe(true);

    process.env.NEBUTRA_REGION = "cn-hk-mo-tw";
    expect(isChinaRegion()).toBe(false);

    process.env.NEBUTRA_REGION = "overseas";
    expect(isChinaRegion()).toBe(false);
  });
});

describe("getCDNHints", () => {
  let snap: Record<string, string | undefined>;

  beforeEach(() => {
    snap = snapshotEnv();
    for (const k of ENV_KEYS) delete process.env[k];
  });

  afterEach(() => {
    restoreEnv(snap);
  });

  it("returns mainland-specific hints", () => {
    process.env.NEBUTRA_REGION = "cn-mainland";
    expect(getCDNHints()).toEqual({
      shouldAvoidGoogleFonts: true,
      shouldUseAliyunSMS: true,
      shouldUseAlipay: true,
      shouldUseWeChatPay: true,
    });
  });

  it("returns HK/MO/TW hints (Google Fonts ok, Aliyun SMS not)", () => {
    process.env.NEBUTRA_REGION = "cn-hk-mo-tw";
    expect(getCDNHints()).toEqual({
      shouldAvoidGoogleFonts: false,
      shouldUseAliyunSMS: false,
      shouldUseAlipay: true,
      shouldUseWeChatPay: true,
    });
  });

  it("returns conservative defaults for overseas / unknown", () => {
    process.env.NEBUTRA_REGION = "overseas";
    expect(getCDNHints()).toEqual({
      shouldAvoidGoogleFonts: false,
      shouldUseAliyunSMS: false,
      shouldUseAlipay: false,
      shouldUseWeChatPay: false,
    });

    delete process.env.NEBUTRA_REGION;
    expect(getCDNHints().shouldUseAlipay).toBe(false);
  });
});
