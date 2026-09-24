import { readdir, readFile } from "node:fs/promises";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

describe("auth provider boundary", () => {
  it("lazy auth providers keep children inside an auth context while loading", async () => {
    const authProvider = await readFile(
      join(process.cwd(), "packages/iam/auth/src/react/auth-provider.tsx"),
      "utf8",
    );

    expect(authProvider).toContain('createUnauthenticatedAuthContext("better-auth", false)');
    expect(authProvider).toContain('createUnauthenticatedAuthContext("dev", false)');
  });

  it("concrete auth providers do not render children outside AuthContextProvider during init", async () => {
    const betterAuthProvider = await readFile(
      join(process.cwd(), "packages/iam/auth/src/react/providers/better-auth-provider.tsx"),
      "utf8",
    );

    expect(betterAuthProvider).not.toContain("return <>{children}</>;");
  });

  it("AuthProviderId is Better Auth plus the dev fallback, nothing else (ADR 2026-09-24)", async () => {
    const types = await readFile(join(process.cwd(), "packages/iam/auth/src/types.ts"), "utf8");

    expect(types).toMatch(/export type AuthProviderId\s*=\s*"better-auth"\s*\|\s*"dev";/);
  });

  it("ships only the Better Auth and dev provider files", async () => {
    const serverProviders = await readdir(join(process.cwd(), "packages/iam/auth/src/providers"));
    const reactProviders = await readdir(
      join(process.cwd(), "packages/iam/auth/src/react/providers"),
    );

    expect(serverProviders.filter((f) => /\.ts$/.test(f) && !f.includes(".test.")).sort()).toEqual([
      "better-auth.ts",
      "dev.ts",
    ]);
    expect(reactProviders.filter((f) => !f.includes(".test.")).sort()).toEqual([
      "better-auth-provider.tsx",
      "dev-provider.tsx",
    ]);
  });

  it("@nebutra/auth does not depend on removed provider SDKs", async () => {
    const pkg = await readFile(join(process.cwd(), "packages/iam/auth/package.json"), "utf8");
    const parsed = JSON.parse(pkg) as {
      dependencies?: Record<string, string>;
      peerDependencies?: Record<string, string>;
    };
    const declared = [
      ...Object.keys(parsed.dependencies ?? {}),
      ...Object.keys(parsed.peerDependencies ?? {}),
    ];

    for (const sdk of ["next-auth", "@clerk/nextjs", "@supabase/supabase-js"]) {
      expect(declared).not.toContain(sdk);
    }
  });

  it("ships a static provider matrix with tiers and declared capabilities", async () => {
    const matrix = await readFile(
      join(process.cwd(), "packages/iam/auth/src/provider-matrix.ts"),
      "utf8",
    );
    expect(matrix).toContain("AUTH_PROVIDER_MATRIX");
    expect(matrix).toContain('tier: "first-class"');
    expect(matrix).toContain('tier: "dev-only"');
    expect(matrix).toContain("impersonation: false");
    expect(matrix).toContain("isCapabilityEffective");
  });

  it("product apps do not import provider SDKs outside the allowlist", async () => {
    /**
     * Multi-provider parallel is allowed **inside** @nebutra/auth adapters.
     * Product apps must go through the package surface.
     *
     * Intentional standalone apps (NOT product debt — permanent exception):
     *   - tsekaluk-dev: extracted to github.com/TsekaLuk/tsekaluk-dev
     *   - sleptons: demo shell with direct Clerk (not a Sailor product app)
     *
     * Product apps (web/auth/etc.) must go through @nebutra/auth only.
     * Closed product debt: clerk-enterprise-sso-handoff, google-one-tap.
     */
    const { readdir, readFile: rf } = await import("node:fs/promises");
    const root = join(process.cwd(), "apps");
    const FORBIDDEN =
      /from\s+["'](@clerk\/|better-auth|better-auth\/|next-auth|next-auth\/|@supabase\/supabase-js)/;

    /**
     * Permanent exceptions (not shrink-only product debt).
     *
     * apps/auth/src/worker-edge.ts is a Cloudflare Workers build, not a Next
     * app: the full OpenNext auth bundle is ~8.5 MiB gzip against a 3 MiB Free
     * plan ceiling, so this edge exists to stay near 200 KiB. Routing it
     * through @nebutra/auth would pull the multi-provider abstraction — every
     * adapter, not just the one in use — into the one bundle that cannot
     * afford it. That is a size constraint rather than a decision anyone is
     * putting off, so it belongs here and not in PENDING_DECISION.
     */
    const STANDALONE_APP_PATH_SNIPPETS = ["/sleptons/", "/apps/auth/src/worker-edge.ts"];

    /**
     * SHRINK-ONLY product debt, kept separate from the permanent list above
     * because the two mean different things and collapsing them loses the only
     * signal that a decision is still open.
     *
     * apps/admin gained a direct better-auth session store on 2026-07-30. It may
     * well deserve a permanent exception — admin.nebutra.com sits behind
     * Cloudflare Access, so it is an internal control plane rather than a product
     * surface, and the argument for routing it through @nebutra/auth is weaker
     * than for web or auth. But that is the admin owner's call, not this test's,
     * so it is recorded as debt until someone makes it. Either promote these to
     * STANDALONE_APP_PATH_SNIPPETS with the reasoning, or route them through the
     * package. Do not leave them here indefinitely.
     *
     * The list may only shrink: an entry that no longer violates fails the test,
     * so a fixed file cannot keep its exemption.
     */
    const PENDING_DECISION = [
      "/apps/admin/src/app/api/auth/[...all]/route.ts",
      "/apps/admin/src/lib/auth.ts",
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
      if (STANDALONE_APP_PATH_SNIPPETS.some((s) => file.includes(s))) continue;
      const text = await rf(file, "utf8");
      if (FORBIDDEN.test(text)) {
        violations.push(file.replace(process.cwd(), ""));
      }
    }

    const unlisted = violations.filter((v) => !PENDING_DECISION.includes(v)).sort();
    const stale = PENDING_DECISION.filter((v) => !violations.includes(v)).sort();

    expect(
      unlisted,
      `Direct provider SDK imports outside the allowlist:\n${unlisted.join("\n")}\n` +
        "Product apps must go through @nebutra/auth so the provider stays swappable.",
    ).toEqual([]);

    expect(
      stale,
      `PENDING_DECISION lists files that no longer import a provider SDK directly:\n${stale.join("\n")}\n` +
        "Delete these entries — the list is shrink-only, and a fixed file must not keep its exemption.",
    ).toEqual([]);
  });
});
