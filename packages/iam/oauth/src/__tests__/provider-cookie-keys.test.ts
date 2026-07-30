import { afterEach, describe, expect, it, vi } from "vitest";
import { resolveCookieKeys } from "../provider";

const ORIGINAL_NODE_ENV = process.env.NODE_ENV;

function setNodeEnv(value: string) {
  vi.stubEnv("NODE_ENV", value);
}

describe("OIDC provider cookie key governance", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    if (ORIGINAL_NODE_ENV !== undefined) {
      process.env.NODE_ENV = ORIGINAL_NODE_ENV;
    }
  });

  it("refuses to boot production without explicit cookie keys", () => {
    setNodeEnv("production");

    expect(() => resolveCookieKeys(undefined)).toThrow("no cookie signing keys were provided");
  });

  it("refuses known development defaults in production", () => {
    setNodeEnv("production");

    expect(() => resolveCookieKeys(["dev-cookie-key-1", "dev-cookie-key-2"])).toThrow(
      "known-weak/default cookie signing keys",
    );
  });

  it("requires at least two production keys for rotation", () => {
    setNodeEnv("production");

    expect(() => resolveCookieKeys(["a".repeat(48)])).toThrow("fewer than two cookie signing keys");
  });

  it("requires high-entropy-looking production keys", () => {
    setNodeEnv("production");

    expect(() => resolveCookieKeys(["short-key", "another-short-key"])).toThrow(
      "cookie signing keys shorter than 32 characters",
    );
  });

  it("accepts two long production keys", () => {
    setNodeEnv("production");

    expect(resolveCookieKeys(["a".repeat(48), "b".repeat(48)])).toEqual([
      "a".repeat(48),
      "b".repeat(48),
    ]);
  });

  it("substitutes ephemeral keys in development instead of shipping weak defaults", () => {
    setNodeEnv("development");

    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const keys = resolveCookieKeys(["dev-key-1", "dev-key-2"]);

    expect(keys).toHaveLength(2);
    expect(keys.every((key) => key.startsWith("dev-only-ephemeral-"))).toBe(true);
    expect(warn).toHaveBeenCalledOnce();
  });
});
