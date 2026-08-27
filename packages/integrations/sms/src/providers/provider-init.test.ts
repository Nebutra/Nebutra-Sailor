import { afterEach, describe, expect, it, vi } from "vitest";
import { createAliyunProvider } from "./aliyun";
import { createTencentProvider } from "./tencent";

describe("SMS provider initialization", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("fails closed when Aliyun credentials or template config are missing", () => {
    vi.stubEnv("ALIYUN_SMS_ACCESS_KEY_ID", "");
    vi.stubEnv("ALIYUN_SMS_ACCESS_KEY_SECRET", "");
    vi.stubEnv("ALIYUN_SMS_SIGN_NAME", "");
    vi.stubEnv("ALIYUN_SMS_TEMPLATE_CODE", "");

    expect(() => createAliyunProvider()).toThrow(/Aliyun SMS configuration missing/i);
  });

  it("fails closed when Tencent credentials or template config are missing", () => {
    vi.stubEnv("TENCENT_SMS_SECRET_ID", "");
    vi.stubEnv("TENCENT_SMS_SECRET_KEY", "");
    vi.stubEnv("TENCENT_SMS_APP_ID", "");
    vi.stubEnv("TENCENT_SMS_SIGN_NAME", "");
    vi.stubEnv("TENCENT_SMS_TEMPLATE_ID", "");

    expect(() => createTencentProvider()).toThrow(/Tencent SMS configuration missing/i);
  });

  it("creates providers when all required SMS config values are present", () => {
    expect(
      createAliyunProvider({
        accessKeyId: "aliyun-key-id",
        accessKeySecret: "aliyun-key-secret",
        signName: "Nebutra",
        templateCode: "SMS_123456",
      }).name,
    ).toBe("aliyun");

    expect(
      createTencentProvider({
        secretId: "tencent-secret-id",
        secretKey: "tencent-secret-key",
        appId: "1400000000",
        signName: "Nebutra",
        templateId: "123456",
      }).name,
    ).toBe("tencent");
  });
});
