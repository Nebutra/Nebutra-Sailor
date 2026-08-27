import { describe, expect, it } from "vitest";
import { resolveOauthErrorMessageKey } from "./oauth-errors";

describe("resolveOauthErrorMessageKey", () => {
  it("returns null for empty codes", () => {
    expect(resolveOauthErrorMessageKey(null)).toBeNull();
    expect(resolveOauthErrorMessageKey(undefined)).toBeNull();
    expect(resolveOauthErrorMessageKey("")).toBeNull();
    expect(resolveOauthErrorMessageKey("   ")).toBeNull();
  });

  it("maps invalid_code (Google token exchange failure) to oauthInvalidCode", () => {
    expect(resolveOauthErrorMessageKey("invalid_code")).toBe("oauthInvalidCode");
    expect(resolveOauthErrorMessageKey("INVALID_CODE")).toBe("oauthInvalidCode");
  });

  it("maps state failures to oauthStateMismatch", () => {
    expect(resolveOauthErrorMessageKey("state_mismatch")).toBe("oauthStateMismatch");
    expect(resolveOauthErrorMessageKey("state_not_found")).toBe("oauthStateMismatch");
    expect(resolveOauthErrorMessageKey("please_restart_the_process")).toBe("oauthStateMismatch");
  });

  it("maps user cancel to oauthAccessDenied", () => {
    expect(resolveOauthErrorMessageKey("access_denied")).toBe("oauthAccessDenied");
    expect(resolveOauthErrorMessageKey("user_cancelled")).toBe("oauthAccessDenied");
  });

  it("maps provider config failures to oauthUnavailable", () => {
    expect(resolveOauthErrorMessageKey("oauth_unavailable")).toBe("oauthUnavailable");
    expect(resolveOauthErrorMessageKey("unsupported")).toBe("oauthUnavailable");
  });

  it("falls back to genericError for unknown codes", () => {
    expect(resolveOauthErrorMessageKey("something_new")).toBe("genericError");
  });
});
