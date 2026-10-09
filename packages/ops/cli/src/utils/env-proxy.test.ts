import { describe, expect, it, vi } from "vitest";
import { useProxyFromEnv } from "./env-proxy";

describe("useProxyFromEnv", () => {
  it("installs the env proxy when HTTPS_PROXY is set", () => {
    const setGlobalProxyFromEnv = vi.fn();
    const env = { HTTPS_PROXY: "http://127.0.0.1:7890" };
    expect(useProxyFromEnv(env, { setGlobalProxyFromEnv })).toBe(true);
    expect(setGlobalProxyFromEnv).toHaveBeenCalledWith(env);
  });

  it("accepts the lowercase form", () => {
    const setGlobalProxyFromEnv = vi.fn();
    expect(useProxyFromEnv({ http_proxy: "http://p:1" }, { setGlobalProxyFromEnv })).toBe(true);
  });

  it("does nothing without a proxy variable", () => {
    const setGlobalProxyFromEnv = vi.fn();
    expect(useProxyFromEnv({}, { setGlobalProxyFromEnv })).toBe(false);
    expect(setGlobalProxyFromEnv).not.toHaveBeenCalled();
  });

  it("is a no-op on Node versions without the API", () => {
    expect(useProxyFromEnv({ HTTPS_PROXY: "http://p:1" }, {})).toBe(false);
  });
});
