import { describe, expect, it } from "vitest";
import {
  buildOAuthStartPath,
  detectEnabledOAuthProviders,
  isOAuthProvider,
} from "../oauth-providers";

describe("oauth provider helpers", () => {
  it("detects only providers configured with both id and secret", () => {
    expect(
      detectEnabledOAuthProviders({
        GOOGLE_CLIENT_ID: "gid",
        GOOGLE_CLIENT_SECRET: "gsecret",
        GITHUB_CLIENT_ID: "ghid",
        APPLE_CLIENT_SECRET: "missing-id",
        FEISHU_APP_ID: "cli_a",
        FEISHU_APP_SECRET: "feishu-secret",
      }),
    ).toEqual(["google", "feishu"]);
  });

  it("guards the supported provider list", () => {
    expect(isOAuthProvider("google")).toBe(true);
    expect(isOAuthProvider("feishu")).toBe(true);
    expect(isOAuthProvider("dropbox")).toBe(false);
  });

  it("builds the legacy OAuth start path with Better Auth's callbackURL parameter", () => {
    expect(buildOAuthStartPath("google", "/dashboard?tab=billing")).toBe(
      "/api/auth/oauth/google?callbackURL=%2Fdashboard%3Ftab%3Dbilling",
    );
  });
});
