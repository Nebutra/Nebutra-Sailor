import { readFile } from "node:fs/promises";
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
});
