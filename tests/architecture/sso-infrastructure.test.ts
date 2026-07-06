import { existsSync, readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, "../..");

function readText(relativePath: string): string {
  return readFileSync(join(root, relativePath), "utf8");
}

describe("Enterprise SSO infrastructure contract", () => {
  it("keeps SSO discovery, Clerk handoff, and provider parsing wired together", () => {
    const discoveryRoute = readText("apps/web/src/app/api/auth/sso/discovery/route.ts");
    const signInPage = readText("apps/web/src/app/(auth)/sign-in/[[...sign-in]]/page.tsx");
    const handoff = readText("apps/web/src/components/auth/clerk-enterprise-sso-handoff.tsx");
    const parser = readText("apps/web/src/lib/auth/sso-discovery.ts");
    const oauthProviders = readText("apps/web/src/lib/auth/oauth-providers.ts");
    const betterAuth = readText("packages/iam/auth/src/providers/better-auth.ts");
    const feishuOAuth = readText("packages/iam/auth/src/providers/better-auth/feishu-oauth.ts");

    expect(discoveryRoute).toContain("parseConfiguredSsoProviders");
    expect(discoveryRoute).toContain("toSsoDiscoveryProvider");
    expect(parser).toContain('provider: z.enum(["clerk", "generic", "feishu"]).default("generic")');
    expect(parser).toContain('FEISHU_OAUTH_START_PATH = "/api/auth/oauth/feishu"');
    expect(parser).toContain("allowSubdomains: z.boolean().default(false)");
    expect(oauthProviders).toContain('"feishu"');
    expect(signInPage).toContain('subroute === "sso"');
    expect(signInPage).toContain("ClerkEnterpriseSsoHandoff");
    expect(handoff).toContain('strategy: "enterprise_sso"');
    expect(handoff).toContain('redirectCallbackUrl: "/sign-in"');
    expect(betterAuth).toContain("loadBetterAuthFeishuOAuthPlugin");
    expect(feishuOAuth).toContain("providerId: FEISHU_PROVIDER_ID");
    expect(feishuOAuth).toContain("normalizeFeishuOAuthTokens");
    expect(feishuOAuth).toContain("normalizeFeishuUserInfo");
  });

  it("documents and deploys the SSO provider environment contract", () => {
    const ecsWorkflow = readText(".github/workflows/deploy-ecs.yml");

    for (const file of [
      ".env.example",
      "apps/web/.env.example",
      "docs/DOMAINS.md",
      "docs/ops/ecs-mvp-env.md",
      "docs/ops/enterprise-sso.md",
      "apps/sailor-docs/content/docs/en/configuration/environment-variables.mdx",
      "apps/sailor-docs/content/docs/zh/configuration/environment-variables.mdx",
    ]) {
      expect(readText(file), file).toContain("AUTH_SSO_DISCOVERY_PROVIDERS");
      expect(readText(file), file).toContain("FEISHU_APP_ID");
    }

    expect(existsSync(join(root, "docs/ops/enterprise-sso.md"))).toBe(true);
    expect(ecsWorkflow).toContain("NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY");
    expect(ecsWorkflow).toContain("CLERK_SECRET_KEY");
    expect(ecsWorkflow).toContain("CLERK_WEBHOOK_SECRET");
    expect(ecsWorkflow).toContain("AUTH_SSO_DISCOVERY_PROVIDERS");
    expect(ecsWorkflow).toContain("FEISHU_APP_ID");
    expect(ecsWorkflow).toContain("FEISHU_APP_SECRET");
    expect(ecsWorkflow).toContain("FEISHU_REDIRECT_URI");
  });
});
