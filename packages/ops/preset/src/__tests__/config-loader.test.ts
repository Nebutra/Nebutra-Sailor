import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { loadPresetConfig } from "../config-loader";

describe("loadPresetConfig", () => {
  let dir: string | undefined;

  afterEach(() => {
    if (dir) {
      rmSync(dir, { recursive: true, force: true });
      dir = undefined;
    }
  });

  it("loads create-sailor's nebutra.config.json fallback", async () => {
    dir = mkdtempSync(join(tmpdir(), "preset-json-config-"));
    writeFileSync(
      join(dir, "nebutra.config.json"),
      JSON.stringify(
        {
          deployTargets: {
            web: "cloudflare-pages",
            gateway: "cloudflare-workers",
            "python-ai": "ecs-docker",
          },
        },
        null,
        2,
      ),
    );

    const result = await loadPresetConfig(dir);

    expect(result.source).toBe("nebutra.config.json");
    expect(result.deprecated).toBe(false);
    expect(result.config.deployTargets.web).toBe("cloudflare-pages");
    expect(result.config.deployTargets.gateway).toBe("cloudflare-workers");
    expect(result.config.deployTargets["python-ai"]).toBe("ecs-docker");
    expect(result.config.deployTargets["landing"]).toBe("fly");
  });

  it("prefers preset.config over legacy and JSON configs", async () => {
    dir = mkdtempSync(join(tmpdir(), "preset-modern-config-"));
    writeFileSync(join(dir, "preset.config.mjs"), 'export default { theme: "vanta" };\n');
    writeFileSync(join(dir, "nebutra.config.mjs"), 'export default { theme: "factory" };\n');
    writeFileSync(join(dir, "nebutra.config.json"), "{}\n");

    const result = await loadPresetConfig(dir);

    expect(result.source).toBe("preset.config.mjs");
    expect(result.deprecated).toBe(false);
    expect(result.config.theme).toBe("vanta");
  });

  it("still loads a legacy nebutra.config and flags it as deprecated", async () => {
    dir = mkdtempSync(join(tmpdir(), "preset-legacy-config-"));
    writeFileSync(join(dir, "nebutra.config.mjs"), 'export default { theme: "vanta" };\n');

    const result = await loadPresetConfig(dir);

    expect(result.source).toBe("nebutra.config.mjs");
    expect(result.deprecated).toBe(true);
    expect(result.config.theme).toBe("vanta");
  });

  it("rejects a config module without a default export", async () => {
    dir = mkdtempSync(join(tmpdir(), "preset-no-default-"));
    writeFileSync(join(dir, "preset.config.mjs"), 'export const theme = "vanta";\n');

    await expect(loadPresetConfig(dir)).rejects.toThrow(/must export a default config/);
  });

  it("explains where it looked when no config exists", async () => {
    dir = mkdtempSync(join(tmpdir(), "preset-missing-config-"));

    await expect(loadPresetConfig(dir)).rejects.toThrow(/Preset config not found/);
  });
});
