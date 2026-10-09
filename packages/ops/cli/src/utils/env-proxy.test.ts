import { describe, expect, it, vi } from "vitest";
import { applyProxyFromEnv } from "./env-proxy";

describe("applyProxyFromEnv", () => {
  it("installs the env proxy when HTTPS_PROXY is set", () => {
    const setGlobalProxyFromEnv = vi.fn();
    const env = { HTTPS_PROXY: "http://127.0.0.1:7890" };
    expect(applyProxyFromEnv(env, { setGlobalProxyFromEnv })).toBe(true);
    expect(setGlobalProxyFromEnv).toHaveBeenCalledWith(env);
  });

  it("accepts the lowercase form", () => {
    const setGlobalProxyFromEnv = vi.fn();
    expect(applyProxyFromEnv({ http_proxy: "http://p:1" }, { setGlobalProxyFromEnv })).toBe(true);
  });

  it("does nothing without a proxy variable", () => {
    const setGlobalProxyFromEnv = vi.fn();
    expect(applyProxyFromEnv({}, { setGlobalProxyFromEnv })).toBe(false);
    expect(setGlobalProxyFromEnv).not.toHaveBeenCalled();
  });

  it("is a no-op on Node versions without the API", () => {
    expect(applyProxyFromEnv({ HTTPS_PROXY: "http://p:1" }, {})).toBe(false);
  });
});
