import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { parsePlayMarkdown } from "@nebutra/play-loader";
import { afterEach, describe, expect, it } from "vitest";
import {
  BrandGenesis,
  brandContextFromDraft,
  distillBrandIdea,
  readBrandGenesisDebug,
  renderBrandMarkdown,
} from "./index";

let root: string | undefined;
let genesis: BrandGenesis | undefined;

afterEach(async () => {
  if (genesis) await genesis.close();
  if (root) await rm(root, { recursive: true, force: true });
  root = undefined;
  genesis = undefined;
});

async function open(tenantId = "tenant_demo"): Promise<BrandGenesis> {
  root = await mkdtemp(join(tmpdir(), "brand-genesis-"));
  genesis = await BrandGenesis.open(root, { tenantId });
  return genesis;
}

describe("brand-genesis", () => {
  it("distills an idea into a BrandContext without owning generation primitives", () => {
    const draft = distillBrandIdea({
      idea: "AI debugging for indie devs called Loop",
      visualDirectionHint: "cyberpunk",
    });
    const brand = brandContextFromDraft(draft, "tenant_a");
    const markdown = renderBrandMarkdown(draft, brand);

    expect(draft.name).toBe("Loop");
    expect(brand).toMatchObject({
      tenantId: "tenant_a",
      brandId: "loop",
      sourcePath: "company/BRAND.md",
    });
    expect(markdown).toContain("type: brand_profile");
    expect(markdown).toContain("Debug like it is a conversation");
  });

  it("runs the brand_kit play through lower capabilities and writes checkpoints", async () => {
    const runtime = await open("tenant_a");

    const result = await runtime.run({
      idea: "AI debugging for indie devs called Loop",
      visualDirectionHint: "cyberpunk",
    });

    expect(result.brand.name).toBe("Loop");
    expect(result.logo.brandId).toBe(result.brand.brandId);
    expect(result.mesh.brandId).toBe(result.brand.brandId);
    expect(result.play).toBe("brand_kit");
    expect(result.checkpoints).toEqual([
      "brand_distillation",
      "visual_direction",
      "assets_generated",
      "landing_handoff",
    ]);
    await expect(readBrandGenesisDebug(root)).resolves.toEqual(expect.any(Array));
  });

  it("requires tenant context before persistent operations", async () => {
    root = await mkdtemp(join(tmpdir(), "brand-genesis-"));
    const runtime = await BrandGenesis.open(root);
    genesis = runtime;

    await expect(runtime.run({ tenantId: "", idea: "AI tool called Loop" })).rejects.toMatchObject({
      capability: "brand-genesis",
      suggestion: expect.stringContaining("tenantId"),
    });
  });

  it("keeps the flagship Play as SKILL.md instead of a new workflow format", async () => {
    const skill = await readFile(join(process.cwd(), "plays", "brand_kit", "SKILL.md"), {
      encoding: "utf8",
    }).catch(async () =>
      readFile(
        join(process.cwd(), "packages", "ai", "brand-genesis", "plays", "brand_kit", "SKILL.md"),
        "utf8",
      ),
    );
    const play = parsePlayMarkdown(skill);

    expect(play.meta).toMatchObject({
      name: "brand_kit",
      kind: "play",
      version: "2.0.0",
    });
    expect(play.requiredSkills).toContain("image_pipeline.generate");
    expect(play.requiredSkills).toContain("content_store.write");
    expect(play.subAgents.map((agent) => agent.role)).toContain("visual_designer");
  });

  it("reports doctor health from delegated media capabilities", async () => {
    const runtime = await open("tenant_a");

    await expect(runtime.doctor()).resolves.toMatchObject({
      capability: "brand-genesis",
      ok: true,
      play: { ok: true, name: "brand_kit" },
    });
  });
});
