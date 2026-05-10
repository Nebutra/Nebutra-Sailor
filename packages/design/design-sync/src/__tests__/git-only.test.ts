import { mkdir, mkdtemp, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { GitOnlyProvider } from "../providers/git-only.js";

async function makeFixture(): Promise<{ tokensDir: string; tokensStudioDir: string }> {
  const root = await mkdtemp(join(tmpdir(), "design-sync-git-only-"));
  const tokensDir = join(root, "tokens");
  const tokensStudioDir = join(root, ".tokens-studio");
  await mkdir(tokensDir, { recursive: true });
  await mkdir(tokensStudioDir, { recursive: true });

  // core.json — well-formed DTCG
  await writeFile(
    join(tokensDir, "core.json"),
    `${JSON.stringify(
      {
        color: {
          brand: {
            primary: { $value: "#0033FE", $type: "color" },
            accent: { $value: "#0BF1C3", $type: "color" },
          },
        },
      },
      null,
      2,
    )}\n`,
    "utf8",
  );

  // themes/light.json — nested file to test recursive walk + relative path
  await mkdir(join(tokensDir, "themes"), { recursive: true });
  await writeFile(
    join(tokensDir, "themes", "light.json"),
    `${JSON.stringify(
      {
        background: { $value: "#ffffff", $type: "color" },
      },
      null,
      2,
    )}\n`,
    "utf8",
  );

  return { tokensDir, tokensStudioDir };
}

describe("GitOnlyProvider", () => {
  let fixture: { tokensDir: string; tokensStudioDir: string };

  beforeEach(async () => {
    fixture = await makeFixture();
  });

  afterEach(async () => {
    // Cleanup is best-effort — node's tmpdir is wiped by the OS eventually.
    void fixture;
  });

  it("pulls every DTCG file under tokensDir", async () => {
    const provider = new GitOnlyProvider({
      provider: "git-only",
      tokensDir: fixture.tokensDir,
      tokensStudioDir: fixture.tokensStudioDir,
    });

    const result = await provider.pull();

    expect(result.provider).toBe("git-only");
    expect(result.written).toBe(false);
    expect(result.sets).toHaveLength(2);
    const paths = result.sets.map((s) => s.relativePath).sort();
    expect(paths).toEqual(["core.json", "themes/light.json"]);
  });

  it("filters by theme name when --themes is supplied", async () => {
    const provider = new GitOnlyProvider({
      provider: "git-only",
      tokensDir: fixture.tokensDir,
      tokensStudioDir: fixture.tokensStudioDir,
    });

    const result = await provider.pull({ themes: ["core"] });

    expect(result.sets).toHaveLength(1);
    expect(result.sets[0]?.relativePath).toBe("core.json");
  });

  it("push reformats existing DTCG files in place", async () => {
    // Mangle whitespace so we can assert reformatting.
    await writeFile(
      join(fixture.tokensDir, "core.json"),
      '{"color":{"brand":{"primary":{"$value":"#0033FE","$type":"color"}}}}',
      "utf8",
    );

    const provider = new GitOnlyProvider({
      provider: "git-only",
      tokensDir: fixture.tokensDir,
      tokensStudioDir: fixture.tokensStudioDir,
    });

    const result = await provider.push();

    expect(result.pushed).toBe(true);
    expect(result.dryRun).toBe(false);
    const reformatted = await readFile(join(fixture.tokensDir, "core.json"), "utf8");
    expect(reformatted).toContain('"$value": "#0033FE"');
    expect(reformatted.endsWith("\n")).toBe(true);
  });

  it("push --dry-run does not modify files", async () => {
    const path = join(fixture.tokensDir, "core.json");
    const original = await readFile(path, "utf8");

    const provider = new GitOnlyProvider({
      provider: "git-only",
      tokensDir: fixture.tokensDir,
      tokensStudioDir: fixture.tokensStudioDir,
    });

    const result = await provider.push({ dryRun: true });

    expect(result.pushed).toBe(false);
    expect(result.dryRun).toBe(true);
    expect(await readFile(path, "utf8")).toBe(original);
  });

  it("push fails closed when DTCG validation fails", async () => {
    // Leaf without $type — invalid per DTCG.
    await writeFile(
      join(fixture.tokensDir, "core.json"),
      JSON.stringify({ color: { primary: { $value: "#000" } } }),
      "utf8",
    );

    const provider = new GitOnlyProvider({
      provider: "git-only",
      tokensDir: fixture.tokensDir,
      tokensStudioDir: fixture.tokensStudioDir,
    });

    await expect(provider.push()).rejects.toThrow(/DTCG validation failed/u);
  });

  it("healthcheck reports OK when tokensDir exists", async () => {
    const provider = new GitOnlyProvider({
      provider: "git-only",
      tokensDir: fixture.tokensDir,
      tokensStudioDir: fixture.tokensStudioDir,
    });

    const status = await provider.healthcheck();

    expect(status.ok).toBe(true);
    expect(status.provider).toBe("git-only");
    expect(status.detectedEnv).toContain("tokensDir");
  });

  it("healthcheck reports failure when tokensDir is missing", async () => {
    const provider = new GitOnlyProvider({
      provider: "git-only",
      tokensDir: join(fixture.tokensDir, "does-not-exist"),
      tokensStudioDir: fixture.tokensStudioDir,
    });

    const status = await provider.healthcheck();

    expect(status.ok).toBe(false);
    expect(status.missingEnv.some((m) => m.includes("tokensDir"))).toBe(true);
  });
});
