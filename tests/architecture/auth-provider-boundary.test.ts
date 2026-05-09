import { readdir, readFile } from "node:fs/promises";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

describe("auth provider boundary", () => {
  it("lazy auth providers keep children inside an auth context while loading", async () => {
    const authProvider = await readFile(
      join(process.cwd(), "packages/auth/src/react/auth-provider.tsx"),
      "utf8",
    );

    expect(authProvider).toContain('createUnauthenticatedAuthContext("clerk", false)');
    expect(authProvider).toContain('createUnauthenticatedAuthContext("better-auth", false)');
  });

  it("concrete auth providers do not render children outside AuthContextProvider during init", async () => {
    const betterAuthProvider = await readFile(
      join(process.cwd(), "packages/auth/src/react/providers/better-auth-provider.tsx"),
      "utf8",
    );
    const clerkProvider = await readFile(
      join(process.cwd(), "packages/auth/src/react/providers/clerk-provider.tsx"),
      "utf8",
    );

    expect(betterAuthProvider).not.toContain("return <>{children}</>;");
    expect(clerkProvider).not.toContain("return <>{children}</>;");
  });

  it("AuthProviderId is exactly clerk + better-auth (no NextAuth)", async () => {
    const types = await readFile(join(process.cwd(), "packages/auth/src/types.ts"), "utf8");

    expect(types).toContain('export type AuthProviderId = "clerk" | "better-auth";');
    expect(types).not.toMatch(/nextauth|next-auth/i);
  });

  it("no NextAuth provider files remain in packages/auth", async () => {
    const serverProviders = await readdir(join(process.cwd(), "packages/auth/src/providers"));
    const reactProviders = await readdir(join(process.cwd(), "packages/auth/src/react/providers"));

    const matchesNextAuth = (name: string) => /nextauth/i.test(name);

    expect(serverProviders.filter(matchesNextAuth)).toEqual([]);
    expect(reactProviders.filter(matchesNextAuth)).toEqual([]);
  });

  it("@nebutra/auth package description does not mention NextAuth", async () => {
    const pkg = await readFile(join(process.cwd(), "packages/auth/package.json"), "utf8");

    const parsed = JSON.parse(pkg) as {
      description?: string;
      dependencies?: Record<string, string>;
    };

    expect(parsed.description ?? "").not.toMatch(/nextauth|next-auth/i);
    expect(Object.keys(parsed.dependencies ?? {})).not.toContain("next-auth");
  });
});
