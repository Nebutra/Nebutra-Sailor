import { describe, expect, it } from "vitest";
import { createAppSignInUrl, createAppSignUpUrl, createAppUrl } from "./app-url";

describe("app URL helpers", () => {
  it("normalizes the app origin and preserves query params", () => {
    expect(
      createAppUrl(
        "/sign-up",
        { returnUrl: "/choose-plan", empty: "" },
        "https://app.nebutra.com/",
      ),
    ).toBe("https://app.nebutra.com/sign-up?returnUrl=%2Fchoose-plan");
  });

  it("builds sign-in and sign-up URLs on the app domain", () => {
    expect(createAppSignInUrl("/choose-plan", "http://localhost:3001")).toBe(
      "http://localhost:3001/sign-in?returnUrl=%2Fchoose-plan",
    );
    expect(createAppSignUpUrl("/choose-plan", "http://localhost:3001")).toBe(
      "http://localhost:3001/sign-up?returnUrl=%2Fchoose-plan",
    );
  });
});

describe("demo CTA override", () => {
  it("sends Sign in and Get started to the demo destination as given", () => {
    const demo = "https://nebutra.com/sailor";
    expect(createAppSignInUrl("/choose-plan", "https://acme.example", demo)).toBe(demo);
    expect(createAppSignUpUrl(undefined, "https://acme.example", demo)).toBe(demo);
  });

  it("is inert when unset", () => {
    expect(createAppSignInUrl(undefined, "https://app.example.com", undefined)).toBe(
      "https://app.example.com/sign-in",
    );
  });
});
