import { describe, expect, it } from "vitest";
import { appHref } from "../starter-copy";

describe("appHref", () => {
  it("leaves a site path alone", () => {
    expect(appHref("/pricing", undefined)).toBeNull();
  });

  it("sends every product-app link to the demo destination when one is set", () => {
    expect(appHref("app:/sign-in", "https://example.com/start")).toBe("https://example.com/start");
    expect(appHref("app:/sign-in?mode=sign-up", "https://example.com/start")).toBe(
      "https://example.com/start",
    );
  });

  it("otherwise points at the product app", () => {
    expect(appHref("app:/sign-in", undefined)).toMatch(/\/sign-in$/);
  });
});
