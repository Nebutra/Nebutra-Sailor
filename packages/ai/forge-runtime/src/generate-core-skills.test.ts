/**
 * Side-effect script loaded by vitest: write any missing Core SKILL.md files.
 * Run: pnpm --filter @nebutra/forge-runtime exec vitest run src/generate-core-skills.run.ts
 */
import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { ForgeRegistry } from "./registry";
import { renderCoreSkillMarkdown } from "./skill-template";

const skillsRoot = join(fileURLToPath(new URL(".", import.meta.url)), "../skills");
const force = process.env.FORGE_SKILL_FORCE === "1";

describe("generate missing core skills", () => {
  it("writes skills/<slug>/SKILL.md for every core tool", () => {
    const registry = ForgeRegistry.openDefault();
    const core = registry.list().filter((t) => t.tier === "core");
    let written = 0;
    for (const summary of core) {
      const tool = registry.get(summary.id);
      const dir = join(skillsRoot, tool.slug);
      const file = join(dir, "SKILL.md");
      if (existsSync(file) && !force) continue;
      mkdirSync(dir, { recursive: true });
      const body = renderCoreSkillMarkdown(tool);
      writeFileSync(file, body.endsWith("\n") ? body : `${body}\n`, "utf8");
      written++;
    }
    // Always pass — assertion of coverage is in compose-edges.test.ts
    expect(written).toBeGreaterThanOrEqual(0);
    expect(core.length).toBeGreaterThan(0);
  });
});
