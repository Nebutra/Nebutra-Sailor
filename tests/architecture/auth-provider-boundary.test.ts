import { readdir, readFile } from "node:fs/promises";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

describe("auth provider boundary", () => {
  it("lazy auth providers keep children inside an auth context while loading", async () => {
    const authProvider = await readFile(
      join(process.cwd(), "packages/iam/auth/src/react/auth-provider.tsx"),
      "utf8",
    );

    expect(authProvider).toContain('createUnauthenticatedAuthContext("clerk", false)');
    expect(authProvider).toContain('createUnauthenticatedAuthContext("better-auth", false)');
    expect(authProvider).toContain('createUnauthenticatedAuthContext("nextauth", false)');
  });

  it("concrete auth providers do not render children outside AuthContextProvider during init", async () => {
    const betterAuthProvider = await readFile(
      join(process.cwd(), "packages/iam/auth/src/react/providers/better-auth-provider.tsx"),
      "utf8",
    );
    const clerkProvider = await readFile(
      join(process.cwd(), "packages/iam/auth/src/react/providers/clerk-provider.tsx"),
      "utf8",
    );
    const nextAuthProvider = await readFile(
      join(process.cwd(), "packages/iam/auth/src/react/providers/nextauth-provider.tsx"),
      "utf8",
    );

    expect(betterAuthProvider).not.toContain("return <>{children}</>;");
    expect(clerkProvider).not.toContain("return <>{children}</>;");
    expect(nextAuthProvider).not.toContain("return <>{children}</>;");
  });

  it("AuthProviderId includes clerk + better-auth + nextauth", async () => {
    const types = await readFile(join(process.cwd(), "packages/iam/auth/src/types.ts"), "utf8");

    expect(types).toMatch(/export type AuthProviderId\s*=/);
    expect(types).toContain('"clerk"');
    expect(types).toContain('"better-auth"');
    expect(types).toContain('"nextauth"');
  });

  it("all three provider files exist in packages/auth", async () => {
    const serverProviders = await readdir(join(process.cwd(), "packages/iam/auth/src/providers"));
    const reactProviders = await readdir(
      join(process.cwd(), "packages/iam/auth/src/react/providers"),
    );

    expect(serverProviders).toEqual(
      expect.arrayContaining(["clerk.ts", "better-auth.ts", "nextauth.ts"]),
    );
    expect(reactProviders).toEqual(
      expect.arrayContaining([
        "clerk-provider.tsx",
        "better-auth-provider.tsx",
        "nextauth-provider.tsx",
      ]),
    );
  });

  it("@nebutra/auth declares next-auth as an optional peer dependency, not a hard dep", async () => {
    const pkg = await readFile(join(process.cwd(), "packages/iam/auth/package.json"), "utf8");

    const parsed = JSON.parse(pkg) as {
      dependencies?: Record<string, string>;
      peerDependencies?: Record<string, string>;
      peerDependenciesMeta?: Record<string, { optional?: boolean }>;
    };

    // next-auth must NOT be a hard dependency — it's an optional integration.
    expect(Object.keys(parsed.dependencies ?? {})).not.toContain("next-auth");
    expect(Object.keys(parsed.peerDependencies ?? {})).toContain("next-auth");
    expect(parsed.peerDependenciesMeta?.["next-auth"]?.optional).toBe(true);
  });

  it("ships a static multi-provider matrix with tiers and declared capabilities", async () => {
    const matrix = await readFile(
      join(process.cwd(), "packages/iam/auth/src/provider-matrix.ts"),
      "utf8",
    );
    expect(matrix).toContain("AUTH_PROVIDER_MATRIX");
    expect(matrix).toContain('tier: "first-class"');
    expect(matrix).toContain('tier: "optional-enterprise"');
    expect(matrix).toContain('tier: "migration"');
    expect(matrix).toContain("impersonation: false");
    expect(matrix).toContain("isCapabilityEffective");
  });

  it("product apps do not import provider SDKs outside the allowlist", async () => {
    /**
     * Multi-provider parallel is allowed **inside** @nebutra/auth adapters.
     * Product apps must go through the package surface.
     *
     * Allowlist known exceptions (tracked debt / standalone apps):
     *   - tsekaluk-dev: portfolio site with its own better-auth wiring
     *   - sleptons: legacy Clerk shell (migrate later)
     *   - web google-one-tap: next-auth/jwt encode helper only
     *   - web clerk-enterprise-sso-handoff: temporary Clerk client bridge
     */
    const { readdir, readFile: rf, stat } = await import("node:fs/promises");
    const root = join(process.cwd(), "apps");
    const FORBIDDEN =
      /from\s+["'](@clerk\/|better-auth|better-auth\/|next-auth|next-auth\/|@supabase\/supabase-js)/;

    const ALLOW_PATH_SNIPPETS = [
      "/tsekaluk-dev/",
      "/sleptons/",
      "/web/src/lib/auth/google-one-tap.ts",
      "/web/src/lib/auth/__tests__/google-one-tap.test.ts",
      "/web/src/components/auth/clerk-enterprise-sso-handoff.tsx",
    ];

    async function* walk(dir: string): AsyncGenerator<string> {
      const entries = await readdir(dir, { withFileTypes: true });
      for (const e of entries) {
        const p = join(dir, e.name);
        if (e.isDirectory()) {
          if (
            e.name === "node_modules" ||
            e.name === ".next" ||
            e.name === "dist" ||
            e.name === "coverage"
          ) {
            continue;
          }
          yield* walk(p);
        } else if (/\.(ts|tsx)$/.test(e.name) && !e.name.endsWith(".d.ts")) {
          yield p;
        }
      }
    }

    const violations: string[] = [];
    for await (const file of walk(root)) {
      if (ALLOW_PATH_SNIPPETS.some((s) => file.includes(s))) continue;
      const text = await rf(file, "utf8");
      if (FORBIDDEN.test(text)) {
        violations.push(file.replace(process.cwd(), ""));
      }
    }

    expect(violations, `Direct provider SDK imports:\n${violations.join("\n")}`).toEqual([]);
  });
});
