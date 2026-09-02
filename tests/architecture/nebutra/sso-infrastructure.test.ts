import { existsSync, readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, "../../..");

function readText(relativePath: string): string {
  return readFileSync(join(root, relativePath), "utf8");
}

describe("Enterprise SSO infrastructure contract", () => {
  it("keeps SSO discovery, Clerk handoff, and provider parsing wired together", () => {
    const discoveryRoute = readText("apps/web/src/app/api/auth/sso/discovery/route.ts");
    const signInPage = readText("apps/web/src/app/(auth)/sign-in/[[...sign-in]]/page.tsx");
    const handoff = readText("apps/web/src/components/auth/clerk-enterprise-sso-handoff.tsx");
    const clerkSsoHook = readText("packages/iam/auth/src/react/use-clerk-enterprise-sso.ts");
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
    // Kickoff SSOT lives in @nebutra/auth; web is UI-only (no direct Clerk SDK import).
    expect(handoff).toContain("useClerkEnterpriseSso");
    expect(handoff).toContain("@nebutra/auth/react/clerk-enterprise-sso");
    expect(handoff).not.toMatch(/from\s+["']@clerk\//);
    expect(clerkSsoHook).toContain('CLERK_ENTERPRISE_SSO_STRATEGY = "enterprise_sso"');
    expect(clerkSsoHook).toContain('DEFAULT_CLERK_ENTERPRISE_SSO_CALLBACK = "/sign-in"');
    expect(clerkSsoHook).toContain("strategy: CLERK_ENTERPRISE_SSO_STRATEGY");
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
      "docs/ops/nebutra/ecs-mvp-env.md",
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

  it("keeps Nebutra-owned sso.nebutra.com deployable and standard OIDC-routed", () => {
    const rootEnv = readText(".env.example");
    const idpEnv = readText("apps/idp/.env.example");
    const domains = readText("docs/DOMAINS.md");
    const runbook = readText("docs/ops/nebutra/nebutra-owned-sso.md");
    const ecsEnv = readText("docs/ops/nebutra/ecs-mvp-env.md");
    const composeProd = readText("docker-compose.prod.yml");
    const nginx = readText("infra/runtime/nginx/nginx.conf");
    const nginxReadme = readText("infra/runtime/nginx/README.md");
    const deployWorkflow = readText(".github/workflows/deploy-ecs.yml");
    const pm2 = readText("infra/iac/ecs/ecosystem.config.cjs");
    const remoteDeploy = readText("infra/ops/scripts/ecs-deploy-remote.sh");

    for (const text of [rootEnv, idpEnv, domains, runbook, ecsEnv]) {
      expect(text).toContain("sso.nebutra.com");
      expect(text).toContain("OIDC_ISSUER");
      expect(text).toContain("OIDC_COOKIE_KEYS");
    }

    expect(composeProd).toContain("idp:");
    expect(composeProd).toContain(
      ["OIDC_ISSUER=", "{OIDC_ISSUER:-https://sso.nebutra.com}"].join("$"),
    );
    expect(composeProd).toContain("OIDC_COOKIE_KEYS=${OIDC_COOKIE_KEYS:?");
    expect(composeProd).toContain("http://localhost:3100/ready");

    expect(nginx).toContain("upstream nebutra_idp");
    expect(nginx).toContain("server_name sso.nebutra.com");
    expect(nginx).toContain("proxy_pass http://nebutra_idp");
    expect(nginxReadme).toContain("-d sso.nebutra.com");

    // docker-build-push.yml carried idp in its image matrix until it was retired
    // on 2026-09-02; the Dockerfile is the durable claim that idp is containerisable.
    expect(existsSync(join(root, "apps/idp/Dockerfile"))).toBe(true);
    // JSON matrix entry, not a YAML key — see emit_next_matrix.
    expect(deployWorkflow).toContain('"package":"@nebutra/idp"');
    expect(deployWorkflow).toContain("https://sso.nebutra.com/.well-known/openid-configuration");
    expect(deployWorkflow).toContain(
      ["OIDC_COOKIE_KEYS: ", "{{ secrets.OIDC_COOKIE_KEYS }}"].join("$"),
    );
    expect(pm2).toContain('name: "idp"');
    expect(pm2).toContain("PORT: 3100");
    expect(remoteDeploy).toContain("persist_idp_runtime_env");
    expect(remoteDeploy).toContain("idp runtime env missing required keys");

    for (const route of [
      "apps/idp/src/app/.well-known/openid-configuration/route.ts",
      "apps/idp/src/app/auth/route.ts",
      "apps/idp/src/app/token/route.ts",
      "apps/idp/src/app/userinfo/route.ts",
      "apps/idp/src/app/jwks/route.ts",
      "apps/idp/src/app/health/route.ts",
      "apps/idp/src/app/ready/route.ts",
    ]) {
      expect(existsSync(join(root, route)), route).toBe(true);
    }
  });
});
