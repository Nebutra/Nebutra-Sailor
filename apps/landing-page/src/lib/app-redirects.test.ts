import { describe, expect, it } from "vitest";
import { createLegacyAppRedirectUrl } from "./app-redirects";

describe("createLegacyAppRedirectUrl", () => {
  it("redirects the legacy login success callback to the app dashboard", () => {
    expect(
      createLegacyAppRedirectUrl("/login/success", "https://app.nebutra.com")?.toString(),
    ).toBe("https://app.nebutra.com/login/success");
  });

  it("normalizes trailing slashes", () => {
    expect(
      createLegacyAppRedirectUrl("/login/success/", "https://app.nebutra.com")?.toString(),
    ).toBe("https://app.nebutra.com/login/success");
  });

  it("ignores non-legacy marketing paths", () => {
    expect(createLegacyAppRedirectUrl("/pricing", "https://app.nebutra.com")).toBeNull();
  });
});
