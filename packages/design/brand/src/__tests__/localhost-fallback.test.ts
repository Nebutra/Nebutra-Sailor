import { describe, expect, it } from "vitest";
import { localhostFallback, missingPublicUrlMessage } from "../metadata-helpers";

const URL_ = "http://localhost:3001";

describe("localhostFallback", () => {
  it("gives the dev default outside production", () => {
    expect(localhostFallback(URL_, { NODE_ENV: "development" })).toBe(URL_);
    expect(localhostFallback(URL_, { NODE_ENV: "test" })).toBe(URL_);
    expect(localhostFallback(URL_, {})).toBe(URL_);
  });

  it("gives nothing in production, so the schema reports the variable missing", () => {
    expect(localhostFallback(URL_, { NODE_ENV: "production" })).toBeUndefined();
  });

  it("honours only explicit opt-outs in production", () => {
    expect(
      localhostFallback(URL_, { NODE_ENV: "production", NEBUTRA_ALLOW_LOCALHOST_URLS: "1" }),
    ).toBe(URL_);
    expect(localhostFallback(URL_, { NODE_ENV: "production", SKIP_ENV_VALIDATION: "true" })).toBe(
      URL_,
    );
    expect(
      localhostFallback(URL_, { NODE_ENV: "production", SKIP_ENV_VALIDATION: "false" }),
    ).toBeUndefined();
    expect(
      localhostFallback(URL_, { NODE_ENV: "production", NEBUTRA_ALLOW_LOCALHOST_URLS: "0" }),
    ).toBeUndefined();
  });

  it("names the variable in the message", () => {
    expect(missingPublicUrlMessage("NEXT_PUBLIC_APP_URL")).toContain("NEXT_PUBLIC_APP_URL");
  });
});
