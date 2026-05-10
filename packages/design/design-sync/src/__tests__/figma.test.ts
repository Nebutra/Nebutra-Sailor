import { mkdir, mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { beforeEach, describe, expect, it } from "vitest";
import { FigmaProvider } from "../providers/figma.js";

async function makeFixture(): Promise<{
  tokensDir: string;
  tokensStudioDir: string;
}> {
  const root = await mkdtemp(join(tmpdir(), "design-sync-figma-"));
  const tokensDir = join(root, "tokens");
  const tokensStudioDir = join(root, ".tokens-studio");
  await mkdir(tokensDir, { recursive: true });
  await mkdir(tokensStudioDir, { recursive: true });

  await writeFile(
    join(tokensDir, "core.json"),
    JSON.stringify(
      {
        color: { brand: { primary: { $value: "#0033FE", $type: "color" } } },
      },
      null,
      2,
    ),
    "utf8",
  );

  await writeFile(
    join(tokensStudioDir, "config.json"),
    JSON.stringify({ name: "fixture", syncProvider: "github" }),
    "utf8",
  );
  await writeFile(
    join(tokensStudioDir, "metadata.json"),
    JSON.stringify({ tokenSetOrder: ["core"] }),
    "utf8",
  );
  await writeFile(
    join(tokensStudioDir, "themes.json"),
    JSON.stringify([{ id: "base", name: "Base", selectedTokenSets: { core: "source" } }]),
    "utf8",
  );

  return { tokensDir, tokensStudioDir };
}

describe("FigmaProvider", () => {
  let fixture: { tokensDir: string; tokensStudioDir: string };

  beforeEach(async () => {
    fixture = await makeFixture();
  });

  it("pull reads DTCG via the local mirror written by Tokens Studio", async () => {
    const provider = new FigmaProvider({
      provider: "figma",
      tokensDir: fixture.tokensDir,
      tokensStudioDir: fixture.tokensStudioDir,
    });

    const result = await provider.pull();

    expect(result.provider).toBe("figma");
    expect(result.sets).toHaveLength(1);
    expect(result.sets[0]?.name).toBe("core");
  });

  it("push falls back to dry-run when credentials are missing", async () => {
    const provider = new FigmaProvider({
      provider: "figma",
      tokensDir: fixture.tokensDir,
      tokensStudioDir: fixture.tokensStudioDir,
      // intentionally no PAT or fileId
    });

    const result = await provider.push();

    expect(result.dryRun).toBe(true);
    expect(result.pushed).toBe(false);
    expect(result.summary).toMatch(/dry-run/u);
  });

  it("push with credentials but explicit dryRun stays in dry-run mode", async () => {
    const provider = new FigmaProvider({
      provider: "figma",
      tokensDir: fixture.tokensDir,
      tokensStudioDir: fixture.tokensStudioDir,
      personalAccessToken: "fake-token",
      fileId: "fake-file",
    });

    const result = await provider.push({ dryRun: true });

    expect(result.dryRun).toBe(true);
    expect(result.summary).toMatch(/dry-run/u);
  });

  it("push throws (live integration not implemented) when credentials present and dryRun=false", async () => {
    const provider = new FigmaProvider({
      provider: "figma",
      tokensDir: fixture.tokensDir,
      tokensStudioDir: fixture.tokensStudioDir,
      personalAccessToken: "fake-token",
      fileId: "fake-file",
    });

    await expect(provider.push({ dryRun: false })).rejects.toThrow(
      /live push to Figma Variables REST API is not yet implemented/u,
    );
  });

  it("healthcheck reports missing credentials", async () => {
    const provider = new FigmaProvider({
      provider: "figma",
      tokensDir: fixture.tokensDir,
      tokensStudioDir: fixture.tokensStudioDir,
    });

    const status = await provider.healthcheck();

    expect(status.ok).toBe(false);
    expect(status.missingEnv).toContain("FIGMA_PERSONAL_ACCESS_TOKEN");
    expect(status.missingEnv).toContain("FIGMA_FILE_ID");
  });

  it("healthcheck reports OK when tokens-studio metadata + creds are present", async () => {
    const provider = new FigmaProvider({
      provider: "figma",
      tokensDir: fixture.tokensDir,
      tokensStudioDir: fixture.tokensStudioDir,
      personalAccessToken: "fake-token",
      fileId: "fake-file",
    });

    const status = await provider.healthcheck();

    expect(status.ok).toBe(true);
    expect(status.detectedEnv).toContain("FIGMA_PERSONAL_ACCESS_TOKEN");
    expect(status.detectedEnv).toContain("FIGMA_FILE_ID");
  });
});
