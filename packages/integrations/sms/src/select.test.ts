import { describe, expect, it } from "vitest";
import { createSmsProvider, resolveSmsProviderId } from "./select";

const ALIYUN = {
  ALIYUN_SMS_ACCESS_KEY_ID: "id",
  ALIYUN_SMS_ACCESS_KEY_SECRET: "secret",
  ALIYUN_SMS_SIGN_NAME: "Acme",
  ALIYUN_SMS_TEMPLATE_CODE: "SMS_1",
};
const TWILIO = {
  TWILIO_ACCOUNT_SID: "AC1",
  TWILIO_AUTH_TOKEN: "token",
  TWILIO_VERIFY_SERVICE_SID: "VA1",
};

describe("resolveSmsProviderId", () => {
  it("is null when nothing is configured", () => {
    expect(resolveSmsProviderId({})).toBeNull();
    expect(createSmsProvider({})).toBeNull();
  });

  it("uses Twilio Verify outside mainland China when both are configured", () => {
    expect(resolveSmsProviderId({ ...ALIYUN, ...TWILIO })).toBe("twilio-verify");
  });

  it("uses Aliyun under NEBUTRA_LOCALE=cn", () => {
    expect(resolveSmsProviderId({ ...ALIYUN, ...TWILIO, NEBUTRA_LOCALE: "cn" })).toBe("aliyun");
    expect(createSmsProvider({ ...ALIYUN, ...TWILIO, NEBUTRA_LOCALE: "cn" })?.name).toBe("aliyun");
  });

  it("honours the NEBUTRA_REGION alias", () => {
    expect(resolveSmsProviderId({ ...ALIYUN, ...TWILIO, NEBUTRA_REGION: "cn-mainland" })).toBe(
      "aliyun",
    );
  });

  it("falls back to whichever one is configured", () => {
    expect(resolveSmsProviderId({ ...TWILIO, NEBUTRA_LOCALE: "cn" })).toBe("twilio-verify");
    expect(resolveSmsProviderId({ ...ALIYUN })).toBe("aliyun");
  });

  it("lets SMS_PROVIDER override detection", () => {
    expect(resolveSmsProviderId({ ...ALIYUN, ...TWILIO, SMS_PROVIDER: "aliyun" })).toBe("aliyun");
  });
});
