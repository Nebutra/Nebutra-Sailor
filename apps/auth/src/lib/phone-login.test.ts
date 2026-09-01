import { describe, expect, it } from "vitest";
import {
  detectEnabledPhoneProviders,
  isE164PhoneNumber,
  normalizePhoneNumber,
  phoneNumberTempEmail,
  resolveTwilioVerifyConfig,
} from "./phone-login";

describe("phone login configuration", () => {
  it("keeps the Fly UI hidden until a provider is explicitly enabled", () => {
    expect(detectEnabledPhoneProviders({})).toEqual([]);
    expect(
      detectEnabledPhoneProviders({ AUTH_ENABLED_PHONE_PROVIDERS: " twilio,unknown " }),
    ).toEqual(["twilio"]);
  });

  it("fails closed when any Twilio Verify secret is missing", () => {
    expect(
      resolveTwilioVerifyConfig({
        TWILIO_ACCOUNT_SID: "AC123",
        TWILIO_AUTH_TOKEN: "token",
      }),
    ).toBeNull();
  });

  it("resolves a complete Twilio Verify configuration", () => {
    expect(
      resolveTwilioVerifyConfig({
        TWILIO_ACCOUNT_SID: " AC123 ",
        TWILIO_AUTH_TOKEN: " token ",
        TWILIO_VERIFY_SERVICE_SID: " VA123 ",
      }),
    ).toEqual({ accountSid: "AC123", authToken: "token", serviceSid: "VA123" });
  });
});

describe("global phone number contract", () => {
  it("accepts valid international E.164 numbers", () => {
    expect(isE164PhoneNumber("+14155552671")).toBe(true);
    expect(isE164PhoneNumber("+442079460018")).toBe(true);
  });

  it("rejects national, malformed, and impossible numbers", () => {
    expect(isE164PhoneNumber("4155552671")).toBe(false);
    expect(isE164PhoneNumber("+123")).toBe(false);
    expect(isE164PhoneNumber("+14155552671 ext 2")).toBe(false);
  });

  it("normalizes national numbers with an explicit country", () => {
    expect(normalizePhoneNumber("415 555 2671", "US")).toBe("+14155552671");
    expect(normalizePhoneNumber("020 7946 0018", "GB")).toBe("+442079460018");
    expect(normalizePhoneNumber("not-a-phone", "US")).toBeNull();
  });

  it("creates a deterministic placeholder email for phone-only users", () => {
    expect(phoneNumberTempEmail("+14155552671")).toBe("phone-14155552671@phone.nebutra.invalid");
  });
});
