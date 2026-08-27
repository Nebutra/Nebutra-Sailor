import { existsSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { COMPOSE_EDGES, resolveToolCompose } from "./compose-edges";
import { ForgeRegistry } from "./registry";
import { renderCoreSkillMarkdown } from "./skill-template";

const registry = ForgeRegistry.openDefault();

describe("compose edges (F2 Track C)", () => {
  it("seeds at least 15 tools with next edges", () => {
    const withNext = Object.entries(COMPOSE_EDGES).filter(([, e]) => (e.next?.length ?? 0) > 0);
    expect(withNext.length).toBeGreaterThanOrEqual(15);
  });

  it("only references tools that exist in the default registry (or host-only md-to-pdf)", () => {
    const hostOnly = new Set(["doc/md-to-pdf"]);
    const missing: string[] = [];
    for (const [from, edge] of Object.entries(COMPOSE_EDGES)) {
      if (!registry.has(from) && !hostOnly.has(from)) missing.push(`from:${from}`);
      for (const id of [...(edge.next ?? []), ...(edge.prev ?? [])]) {
        if (!registry.has(id) && !hostOnly.has(id)) missing.push(`${from}->${id}`);
      }
    }
    expect(missing, missing.join(", ")).toEqual([]);
  });

  it("surfaces compose on summaries via registry", () => {
    const json = registry.list().find((t) => t.id === "data/json-format");
    expect(json?.compose?.next).toContain("llm/json-schema-validate");
    const token = registry.get("llm/token-count");
    expect(token.compose?.next).toContain("llm/cost-estimate");
  });

  it("resolveToolCompose lets explicit compose win", () => {
    const resolved = resolveToolCompose("data/json-format", {
      next: ["dev/uuid"],
    });
    expect(resolved?.next).toEqual(["dev/uuid"]);
  });
});

describe("core SKILL coverage", () => {
  const skillsRoot = join(fileURLToPath(new URL(".", import.meta.url)), "../skills");

  it("every core tool has skills/<slug>/SKILL.md", () => {
    const core = registry.list().filter((t) => t.tier === "core");
    const missing = core.filter((t) => !existsSync(join(skillsRoot, t.slug, "SKILL.md")));
    expect(
      missing.map((t) => t.id),
      `missing skills for: ${missing.map((t) => t.id).join(", ")}`,
    ).toEqual([]);
  });

  it("renderCoreSkillMarkdown includes compose next and MCP name", () => {
    const tool = registry.get("data/json-format");
    const md = renderCoreSkillMarkdown(tool);
    expect(md).toContain("data__json-format");
    expect(md).toContain("llm/json-schema-validate");
    expect(md).toMatch(/^---/m);
  });

  it("skills directory only contains dirs with SKILL.md", () => {
    for (const name of readdirSync(skillsRoot)) {
      if (name.startsWith(".")) continue;
      expect(existsSync(join(skillsRoot, name, "SKILL.md")), name).toBe(true);
    }
  });
});
