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
