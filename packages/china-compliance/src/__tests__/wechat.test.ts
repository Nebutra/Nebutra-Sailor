import { describe, expect, it } from "vitest";
import { buildWeChatAuthUrl } from "../wechat.js";

describe("buildWeChatAuthUrl", () => {
  const base = {
    appId: "wx1234567890abcdef",
    redirectUri: "https://app.nebutra.com/api/auth/wechat/callback",
    state: "csrf-abc123",
  };

  it("builds the QR-code (snsapi_login) URL by default", () => {
    const url = buildWeChatAuthUrl(base);
    expect(url.startsWith("https://open.weixin.qq.com/connect/qrconnect?")).toBe(true);
    expect(url).toContain("appid=wx1234567890abcdef");
    expect(url).toContain("response_type=code");
    expect(url).toContain("scope=snsapi_login");
    expect(url).toContain("state=csrf-abc123");
    expect(url).toContain(encodeURIComponent("https://app.nebutra.com/api/auth/wechat/callback"));
    expect(url.endsWith("#wechat_redirect")).toBe(true);
  });

  it("uses the in-app authorize endpoint for snsapi_userinfo / snsapi_base", () => {
    const url = buildWeChatAuthUrl({ ...base, scope: "snsapi_userinfo" });
    expect(url.startsWith("https://open.weixin.qq.com/connect/oauth2/authorize?")).toBe(true);
    expect(url).toContain("scope=snsapi_userinfo");
  });

  it("URL-encodes the redirect URI", () => {
    const url = buildWeChatAuthUrl({ ...base, redirectUri: "https://x.com/cb?foo=bar&baz=1" });
    expect(url).toContain(`redirect_uri=${encodeURIComponent("https://x.com/cb?foo=bar&baz=1")}`);
  });

  it("throws when appId is missing", () => {
    expect(() => buildWeChatAuthUrl({ ...base, appId: "" })).toThrow(/appId is required/);
  });

  it("throws when redirectUri is missing", () => {
    expect(() => buildWeChatAuthUrl({ ...base, redirectUri: "" })).toThrow(
      /redirectUri is required/,
    );
  });

  it("throws when state (CSRF) is missing", () => {
    expect(() => buildWeChatAuthUrl({ ...base, state: "" })).toThrow(/state is required/);
  });
});
