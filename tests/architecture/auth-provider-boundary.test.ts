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
});
