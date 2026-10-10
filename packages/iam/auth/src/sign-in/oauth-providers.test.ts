import { describe, expect, it } from "vitest";
import { detectEnabledOAuthProviders } from "./oauth-providers";

describe("detectEnabledOAuthProviders", () => {
  it("uses the non-secret provider declaration on a UI-only origin", () => {
    expect(
      detectEnabledOAuthProviders({
        AUTH_ENABLED_OAUTH_PROVIDERS: "google, github",
      }),
    ).toEqual(["google", "github"]);
  });

  it("merges declared providers with providers configured by secrets", () => {
    expect(
      detectEnabledOAuthProviders({
        AUTH_ENABLED_OAUTH_PROVIDERS: "google,unknown,google",
        GITHUB_CLIENT_ID: "github-id",
        GITHUB_CLIENT_SECRET: "github-secret",
      }),
    ).toEqual(["google", "github"]);
  });
});
