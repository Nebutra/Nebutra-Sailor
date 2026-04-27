import { existsSync } from "node:fs";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const ROOT = process.cwd();

async function readJson<T>(path: string): Promise<T> {
  return JSON.parse(await readFile(join(ROOT, path), "utf8")) as T;
}

type PackageJson = {
  name?: string;
  scripts?: Record<string, string>;
  dependencies?: Record<string, string>;
  devDependencies?: Record<string, string>;
};

describe("scoped AGENTS execution contracts", () => {
  it.each([
    {
      scope: "packages/email",
      command: "pnpm --filter @nebutra/email test",
      script: "test",
    },
    {
      scope: "packages/notifications",
      command: "pnpm --filter @nebutra/notifications test",
      script: "test",
    },
  ])("$scope exposes the validation script promised by AGENTS.md", async ({
    scope,
    command,
    script,
  }) => {
    const agents = await readFile(join(ROOT, scope, "AGENTS.md"), "utf8");
    const manifest = await readJson<PackageJson>(join(scope, "package.json"));

    expect(agents).toContain(command);
    expect(manifest.scripts?.[script]).toBeTruthy();
  });

  it("apps/mail-preview is a real workspace consumer of @nebutra/email", async () => {
    const agents = await readFile(join(ROOT, "apps/mail-preview/AGENTS.md"), "utf8");
    const manifestPath = join(ROOT, "apps/mail-preview/package.json");
    const readmePath = join(ROOT, "apps/mail-preview/README.md");

    expect(agents).toContain("pnpm --filter mail-preview check");
    expect(agents).toContain("pnpm --filter mail-preview export");
    expect(existsSync(manifestPath)).toBe(true);
    expect(existsSync(readmePath)).toBe(true);

    const manifest = await readJson<PackageJson>("apps/mail-preview/package.json");
    expect(manifest.name).toBe("mail-preview");
    expect(manifest.scripts?.check).toBeTruthy();
    expect(manifest.scripts?.export).toBeTruthy();
    expect(manifest.dependencies?.["@nebutra/email"]).toBe("workspace:*");
  });

  it("email and mail-preview AGENTS describe the implemented catalog-first contract", async () => {
    const emailAgents = await readFile(join(ROOT, "packages/email/AGENTS.md"), "utf8");
    const previewAgents = await readFile(join(ROOT, "apps/mail-preview/AGENTS.md"), "utf8");

    expect(emailAgents).toContain("EMAIL_TEMPLATE_CATALOG");
    expect(previewAgents).toContain("EMAIL_TEMPLATE_CATALOG");
    expect(emailAgents).not.toContain("src/emails/*.tsx");
    expect(previewAgents).not.toContain("packages/email/src/emails");
  });
});
