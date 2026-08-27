import { afterEach, describe, expect, it } from "vitest";
import { resolvePostLoginReturnTo } from "./return-to";

describe("resolvePostLoginReturnTo", () => {
  afterEach(() => {
    delete process.env.NEXT_PUBLIC_APP_URL;
  });

  it("defaults to product workspace home", () => {
    process.env.NEXT_PUBLIC_APP_URL = "https://app.nebutra.com";
    expect(resolvePostLoginReturnTo(null)).toBe("https://app.nebutra.com/workspace");
  });

  it("joins relative paths to app origin", () => {
    process.env.NEXT_PUBLIC_APP_URL = "https://app.nebutra.com";
    expect(resolvePostLoginReturnTo("/settings")).toBe("https://app.nebutra.com/settings");
  });

  it("allows absolute app host", () => {
    process.env.NEXT_PUBLIC_APP_URL = "https://app.nebutra.com";
    expect(resolvePostLoginReturnTo("https://app.nebutra.com/billing")).toBe(
      "https://app.nebutra.com/billing",
    );
  });

  it("rejects evil absolute hosts", () => {
    process.env.NEXT_PUBLIC_APP_URL = "https://app.nebutra.com";
    expect(resolvePostLoginReturnTo("https://evil.com/phish")).toBe(
      "https://app.nebutra.com/workspace",
    );
  });
});
