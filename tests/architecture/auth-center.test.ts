import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const root = process.cwd();

function read(path: string): string {
  return readFileSync(join(root, path), "utf8");
}

describe("auth center multi-app governance", () => {
  it("ships apps/auth as the login center package", () => {
    expect(existsSync(join(root, "apps/auth/package.json"))).toBe(true);
    const pkg = JSON.parse(read("apps/auth/package.json")) as { name: string };
    expect(pkg.name).toBe("@nebutra/auth-center");
  });

  it("documents auth.nebutra.com + permanent sso issuer", () => {
    const domains = read("docs/DOMAINS.md");
    expect(domains).toContain("auth.nebutra.com");
    expect(domains).toContain("sso.nebutra.com");
    expect(domains).toContain("OIDC_ISSUER=https://sso.nebutra.com");
    expect(domains).toMatch(/Login center/i);
  });

  it("web proxy redirects product sign-in to the auth center", () => {
    const proxy = read("apps/web/src/proxy.ts");
    expect(proxy).toContain("buildAuthCenterSignInUrl");
    expect(proxy).toContain("getAuthCenterOrigin");
  });

  it("nginx routes auth.nebutra.com to the auth-center upstream", () => {
    const nginx = read("infra/runtime/nginx/nginx.conf");
    expect(nginx).toContain("server_name auth.nebutra.com");
    expect(nginx).toContain("nebutra_auth");
    expect(nginx).toContain("127.0.0.1:3101");
  });

  it("Better Auth trusts NEXT_PUBLIC_AUTH_URL for cross-origin", () => {
    const trusted = read("packages/iam/auth/src/providers/better-auth/trusted-origins.ts");
    expect(trusted).toContain("NEXT_PUBLIC_AUTH_URL");
  });

  it("ECS web bootstrap defaults BETTER_AUTH_URL to the login center", () => {
    const remote = read("infra/ops/scripts/ecs-deploy-remote.sh");
    expect(remote).toContain('BETTER_AUTH_URL="${BETTER_AUTH_URL:-https://auth.nebutra.com}"');
    expect(remote).toContain(
      'NEXT_PUBLIC_AUTH_URL="${NEXT_PUBLIC_AUTH_URL:-https://auth.nebutra.com}"',
    );
    // Legacy product-app-as-auth-origin must not reappear as the default.
    expect(remote).not.toMatch(
      /BETTER_AUTH_URL="\$\{BETTER_AUTH_URL:-https:\/\/app\.nebutra\.com\}"/,
    );
  });

  it("deploy-ecs workflow defaults BETTER_AUTH_URL to auth-center (not app)", () => {
    const yml = read(".github/workflows/deploy-ecs.yml");
    expect(yml).toMatch(/BETTER_AUTH_URL:.*auth\.nebutra\.com/);
    expect(yml).toMatch(/NEXT_PUBLIC_AUTH_URL:.*auth\.nebutra\.com/);
    // Workflow env overrides remote defaults — must not reintroduce app-as-issuer.
    expect(yml).not.toMatch(/BETTER_AUTH_URL:.*\|\|\s*'https:\/\/app\.nebutra\.com'/);
  });

  it("DOMAINS.md records production truth for auth + permanent sso", () => {
    const domains = read("docs/DOMAINS.md");
    expect(domains).toContain("Production truth");
    expect(domains).toContain("auth-center");
    expect(domains).toContain("permanent");
  });
});
