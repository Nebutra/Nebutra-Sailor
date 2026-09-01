import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const page = readFileSync(path.join(__dirname, "app", "sign-in", "phone", "page.tsx"), "utf8");
const form = readFileSync(path.join(__dirname, "components", "phone-login-form.tsx"), "utf8");
const credentials = readFileSync(
  path.join(__dirname, "components", "credentials-form.tsx"),
  "utf8",
);
const signInPage = readFileSync(path.join(__dirname, "app", "sign-in", "page.tsx"), "utf8");

describe("global phone login UI contract", () => {
  it("fails closed unless Twilio and the public Turnstile key are enabled", () => {
    expect(page).toContain("detectEnabledPhoneProviders");
    expect(page).toContain("NEXT_PUBLIC_TURNSTILE_SITE_KEY");
    expect(page).toContain("redirect(");
  });

  it("only exposes the entry from sign-in when the server enables it", () => {
    expect(signInPage).toContain("phoneLoginEnabled");
    expect(credentials).toContain("phoneLoginEnabled");
    expect(credentials).toContain('withReturnTo("/sign-in/phone")');
  });

  it("normalizes international numbers and requires Turnstile before sending SMS", () => {
    expect(form).toContain("normalizePhoneNumber");
    expect(form).toContain("x-captcha-response");
    expect(form).toContain('action: "turnstile-spin-v2"');
    expect(form).toContain('"/api/auth/phone-number/send-otp"');
    expect(form).toContain('"/api/auth/phone-number/verify"');
    expect(form).toContain("InputOTP");
  });
});
