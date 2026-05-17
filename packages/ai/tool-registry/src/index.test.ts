import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { parseSkillMarkdown, ToolRegistry } from "./index";

let root: string | undefined;

afterEach(async () => {
  if (root) await rm(root, { recursive: true, force: true });
  root = undefined;
});

describe("ToolRegistry", () => {
  it("stores SKILL.md in content-store and progressively loads body on demand", async () => {
    root = await mkdtemp(join(tmpdir(), "tool-registry-"));
    const registry = await ToolRegistry.open(root, { tenantId: "tenant_a" });

    await registry.writeSkill(
      "brand_film_60s",
      [
        "---",
        "name: brand_film_60s",
        "description: From idea to a 60s brand film",
        "version: 1.0.0",
        "allowed_tools:",
        "  - image.generate",
        "mcp_servers: []",
        "---",
        "## What this skill does",
        "Turns an idea into a production checklist.",
      ].join("\n"),
    );

    const all = await registry.list();
    expect(all).toEqual([
      expect.objectContaining({
        name: "brand_film_60s",
        description: "From idea to a 60s brand film",
        version: "1.0.0",
      }),
    ]);
    expect(JSON.stringify(all)).not.toContain("production checklist");

    await expect(registry.load("brand_film_60s")).resolves.toMatchObject({
      body: expect.stringContaining("production checklist"),
      meta: expect.objectContaining({ allowedTools: ["image.generate"] }),
    });
  });

  it("reloads direct file edits without restarting the registry", async () => {
    root = await mkdtemp(join(tmpdir(), "tool-registry-"));
    const registry = await ToolRegistry.open(root, { tenantId: "tenant_a" });
    const skillPath = join(registry.filesRoot(), "skills", "landing_page", "SKILL.md");
    await mkdir(dirname(skillPath), { recursive: true });
    await writeFile(
      skillPath,
      "---\nname: landing_page\ndescription: Build a landing page\nversion: 1.0.0\n---\nBody",
      "utf8",
    );

    await registry.reload();

    await expect(registry.list()).resolves.toEqual([
      expect.objectContaining({ name: "landing_page" }),
    ]);
  });

  it("validates skill tests with suggestion-bearing failures", async () => {
    root = await mkdtemp(join(tmpdir(), "tool-registry-"));
    const registry = await ToolRegistry.open(root);

    await expect(registry.test("missing")).resolves.toMatchObject({
      ok: false,
      suggestion: expect.stringContaining("skill:new"),
    });
  });
});

describe("parseSkillMarkdown", () => {
  it("parses SKILL.md frontmatter arrays and body", () => {
    expect(
      parseSkillMarkdown(
        "---\nname: demo\ndescription: Demo skill\nversion: 1.0.0\nallowed_tools:\n  - tool.run\n---\nBody",
      ),
    ).toMatchObject({
      meta: { name: "demo", allowedTools: ["tool.run"] },
      body: "Body",
    });
  });
});
