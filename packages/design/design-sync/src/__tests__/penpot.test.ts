import { mkdir, mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { beforeEach, describe, expect, it } from "vitest";
import { PenpotProvider } from "../providers/penpot";

async function makeFixture(): Promise<{ tokensDir: string; tokensStudioDir: string }> {
  const root = await mkdtemp(join(tmpdir(), "design-sync-penpot-"));
  const tokensDir = join(root, "tokens");
  const tokensStudioDir = join(root, ".tokens-studio");
  await mkdir(tokensDir, { recursive: true });
  await mkdir(tokensStudioDir, { recursive: true });

  await writeFile(
    join(tokensDir, "core.json"),
    JSON.stringify(
      { color: { brand: { primary: { $value: "#0033FE", $type: "color" } } } },
      null,
      2,
    ),
    "utf8",
  );

  return { tokensDir, tokensStudioDir };
}

describe("PenpotProvider", () => {
  let fixture: { tokensDir: string; tokensStudioDir: string };

  beforeEach(async () => {
    fixture = await makeFixture();
  });

  it("pull falls back to local DTCG when PENPOT_TOKEN is missing", async () => {
    const provider = new PenpotProvider({
      provider: "penpot",
      tokensDir: fixture.tokensDir,
      tokensStudioDir: fixture.tokensStudioDir,
      // no token, no fileId
    });

    const result = await provider.pull();

    expect(result.provider).toBe("penpot");
    expect(result.sets).toHaveLength(1);
    expect(result.summary).toMatch(/PENPOT_TOKEN missing/u);
  });

  it("pull throws when credentials are present (live integration not implemented)", async () => {
    const provider = new PenpotProvider({
      provider: "penpot",
      tokensDir: fixture.tokensDir,
      tokensStudioDir: fixture.tokensStudioDir,
      token: "fake-token",
      fileId: "fake-file",
    });

    await expect(provider.pull()).rejects.toThrow(/live pull is not yet implemented/u);
  });

  it("push defaults to dry-run when credentials are missing", async () => {
    const provider = new PenpotProvider({
      provider: "penpot",
      tokensDir: fixture.tokensDir,
      tokensStudioDir: fixture.tokensStudioDir,
    });

    const result = await provider.push();

    expect(result.dryRun).toBe(true);
    expect(result.pushed).toBe(false);
    expect(result.summary).toMatch(/PENPOT_TOKEN or PENPOT_FILE_ID missing/u);
  });

  it("push throws (live integration not implemented) when credentials present and dryRun=false", async () => {
    const provider = new PenpotProvider({
      provider: "penpot",
      tokensDir: fixture.tokensDir,
      tokensStudioDir: fixture.tokensStudioDir,
      token: "fake-token",
      fileId: "fake-file",
    });

    await expect(provider.push({ dryRun: false })).rejects.toThrow(
      /live push is not yet implemented/u,
    );
  });

  it("healthcheck flags missing credentials but exposes the API URL", async () => {
    const provider = new PenpotProvider({
      provider: "penpot",
      apiUrl: "https://penpot.example/api",
      tokensDir: fixture.tokensDir,
      tokensStudioDir: fixture.tokensStudioDir,
    });

    const status = await provider.healthcheck();

    expect(status.ok).toBe(false);
    expect(status.missingEnv).toContain("PENPOT_TOKEN");
    expect(status.missingEnv).toContain("PENPOT_FILE_ID");
    expect(status.detectedEnv.some((e) => e.startsWith("PENPOT_API_URL="))).toBe(true);
  });

  it("healthcheck OK when credentials are configured", async () => {
    const provider = new PenpotProvider({
      provider: "penpot",
      apiUrl: "https://penpot.example/api",
      token: "fake-token",
      fileId: "fake-file",
      tokensDir: fixture.tokensDir,
      tokensStudioDir: fixture.tokensStudioDir,
    });

    const status = await provider.healthcheck();

    expect(status.ok).toBe(true);
    expect(status.detectedEnv).toContain("PENPOT_TOKEN");
    expect(status.detectedEnv).toContain("PENPOT_FILE_ID");
  });
});
