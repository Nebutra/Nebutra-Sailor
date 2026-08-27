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
    expect(result.config.deployTargets["landing"]).toBe("vercel");
  });
});
