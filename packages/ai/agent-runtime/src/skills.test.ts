import { describe, expect, it, vi } from "vitest";
import { DefinitionResolver } from "./definitions";
import { buildSkillListing, expandSkill, type SkillRecord } from "./skills";

const skill = (
  over: Partial<SkillRecord> &
    Pick<SkillRecord, "slug" | "tenantId" | "sourceTier"> & {
      name?: string;
      description?: string;
      whenToUse?: string;
      allowedTools?: string[];
      model?: string;
      effort?: "low" | "medium" | "high";
      executionMode?: "inline" | "fork";
      paths?: string[];
    },
): SkillRecord => ({
  bodyRef: over.bodyRef ?? `${over.slug}.body`,
  ...over,
  frontmatter: {
    name: over.name ?? over.slug,
    description: over.description ?? "",
    allowedTools: over.allowedTools ?? [],
    disallowedTools: [],
    argNames: [],
    modelInvocable: true,
    userInvocable: true,
    executionMode: over.executionMode ?? "inline",
    paths: over.paths ?? [],
    whenToUse: over.whenToUse,
    model: over.model,
    effort: over.effort,
  },
});

describe("buildSkillListing", () => {
  it("lists only name/description/whenToUse per skill", () => {
    const r = new DefinitionResolver<SkillRecord>([
      skill({
        slug: "deploy",
        tenantId: "t",
        sourceTier: "workspace",
        description: "ship it",
        whenToUse: "when releasing",
      }),
    ]);
    const out = buildSkillListing(r, { tenantId: "t" });
    expect(out.entries).toHaveLength(1);
    expect(out.entries[0]).toMatchObject({
      name: "deploy",
      description: "ship it",
      whenToUse: "when releasing",
    });
    expect(out.text).toContain("deploy");
    expect(out.text).toContain("ship it");
  });

  it("truncates per-entry description to maxListingDescChars", () => {
    const long = "x".repeat(500);
    const r = new DefinitionResolver<SkillRecord>([
      skill({ slug: "a", tenantId: "t", sourceTier: "workspace", description: long }),
    ]);
    const out = buildSkillListing(r, { tenantId: "t" }, { maxListingDescChars: 10 });
    expect(out.entries[0]?.description.length).toBeLessThanOrEqual(10);
  });

  it("first-party (bundled/builtin) is never truncated and always included even past budget", () => {
    const long = "y".repeat(400);
    const r = new DefinitionResolver<SkillRecord>([
      skill({ slug: "fp", tenantId: "t", sourceTier: "bundled", description: long }),
      skill({ slug: "lo", tenantId: "t", sourceTier: "workspace", description: long }),
    ]);
    const out = buildSkillListing(
      r,
      { tenantId: "t" },
      { contextWindowTokens: 1, budgetPercent: 0.01, maxListingDescChars: 1000 },
    );
    const fp = out.entries.find((e) => e.name === "fp");
    expect(fp).toBeDefined();
    expect(fp?.description).toBe(long);
    expect(fp?.degraded).toBe(false);
  });

  it("lower-tier skills degrade to names-only then drop when budget exceeded", () => {
    const long = "z".repeat(400);
    const r = new DefinitionResolver<SkillRecord>([
      skill({ slug: "s1", tenantId: "t", sourceTier: "workspace", description: long }),
      skill({ slug: "s2", tenantId: "t", sourceTier: "workspace", description: long }),
      skill({ slug: "s3", tenantId: "t", sourceTier: "workspace", description: long }),
    ]);
    const tight = buildSkillListing(
      r,
      { tenantId: "t" },
      { contextWindowTokens: 100, budgetPercent: 0.01, maxListingDescChars: 1000 },
    );
    // some degrade to names-only (no description)
    expect(tight.entries.some((e) => e.degraded && e.description === "")).toBe(true);

    const veryTight = buildSkillListing(
      r,
      { tenantId: "t" },
      { contextWindowTokens: 1, budgetPercent: 0.01, maxListingDescChars: 1000 },
    );
    // beyond names-only, lower-tier entries drop entirely
    expect(veryTight.entries.length).toBeLessThan(3);
    expect(tight.entries.length).toBeGreaterThanOrEqual(veryTight.entries.length);
  });

  it("suppresses skills whose slug is in ctx.loadedSlugs", () => {
    const r = new DefinitionResolver<SkillRecord>([
      skill({ slug: "loaded", tenantId: "t", sourceTier: "workspace" }),
      skill({ slug: "fresh", tenantId: "t", sourceTier: "workspace" }),
    ]);
    const out = buildSkillListing(r, {
      tenantId: "t",
      loadedSlugs: new Set(["loaded"]),
    });
    expect(out.entries.map((e) => e.name)).toEqual(["fresh"]);
  });

  it("path-activated skills hidden until a touched path matches its glob", () => {
    const r = new DefinitionResolver<SkillRecord>([
      skill({
        slug: "gated",
        tenantId: "t",
        sourceTier: "workspace",
        paths: ["src/**/*.ts"],
      }),
      skill({ slug: "always", tenantId: "t", sourceTier: "workspace" }),
    ]);
    const hidden = buildSkillListing(r, { tenantId: "t" });
    expect(hidden.entries.map((e) => e.name)).toEqual(["always"]);

    const shown = buildSkillListing(r, { tenantId: "t" }, { touchedPaths: ["src/foo/bar.ts"] });
    expect(shown.entries.map((e) => e.name).sort()).toEqual(["always", "gated"]);
  });

  it("glob supports *, ** and exact match", () => {
    const r = new DefinitionResolver<SkillRecord>([
      skill({ slug: "star", tenantId: "t", sourceTier: "workspace", paths: ["*.md"] }),
      skill({ slug: "exact", tenantId: "t", sourceTier: "workspace", paths: ["a/b.txt"] }),
    ]);
    const a = buildSkillListing(r, { tenantId: "t" }, { touchedPaths: ["README.md"] });
    expect(a.entries.map((e) => e.name)).toEqual(["star"]);
    const b = buildSkillListing(r, { tenantId: "t" }, { touchedPaths: ["a/b.txt"] });
    expect(b.entries.map((e) => e.name)).toEqual(["exact"]);
    const none = buildSkillListing(r, { tenantId: "t" }, { touchedPaths: ["a/c.txt"] });
    expect(none.entries).toHaveLength(0);
  });

  it("empty tenant fails closed", () => {
    const r = new DefinitionResolver<SkillRecord>([]);
    expect(() => buildSkillListing(r, { tenantId: "" })).toThrow(/tenant/i);
  });

  it("cross-tenant isolation (resolver enforced)", () => {
    const r = new DefinitionResolver<SkillRecord>([
      skill({ slug: "a", tenantId: "t_a", sourceTier: "workspace" }),
    ]);
    expect(buildSkillListing(r, { tenantId: "t_b" }).entries).toHaveLength(0);
  });

  it("is deterministic — same inputs produce same output", () => {
    const r = new DefinitionResolver<SkillRecord>([
      skill({ slug: "a", tenantId: "t", sourceTier: "workspace", description: "aa" }),
      skill({ slug: "b", tenantId: "t", sourceTier: "workspace", description: "bb" }),
    ]);
    const o1 = buildSkillListing(r, { tenantId: "t" });
    const o2 = buildSkillListing(r, { tenantId: "t" });
    expect(o1.text).toBe(o2.text);
  });
});

describe("expandSkill", () => {
  const base = (slug: string) => `/skills/${slug}`;

  it("expands body, prepends resource base line, substitutes args + vars", async () => {
    const s = skill({
      slug: "deploy",
      tenantId: "t",
      sourceTier: "workspace",
      allowedTools: ["Bash", "Edit"],
    });
    const bodyLoader = vi.fn(async () => "deploy ${env} via ${SESSION}");
    const out = await expandSkill(s, {
      tenantId: "t",
      args: { env: "prod" },
      vars: { SESSION: "s1" },
      bodyLoader,
      skillResourceBase: base,
    });
    expect(bodyLoader).toHaveBeenCalledTimes(1);
    expect(bodyLoader).toHaveBeenCalledWith("deploy.body");
    const content = out.messages.map((m) => m.content).join("\n");
    expect(content).toContain("Base directory for this skill: /skills/deploy");
    expect(content).toContain("deploy prod via s1");
    expect(out.allowedTools).toEqual(["Bash", "Edit"]);
    expect(out.executionMode).toBe("inline");
  });

  it("returns model override + effort + fork mode", async () => {
    const s = skill({
      slug: "heavy",
      tenantId: "t",
      sourceTier: "workspace",
      model: "big-model",
      effort: "high",
      executionMode: "fork",
    });
    const out = await expandSkill(s, {
      tenantId: "t",
      args: {},
      vars: {},
      bodyLoader: async () => "body",
      skillResourceBase: base,
    });
    expect(out.modelOverride).toBe("big-model");
    expect(out.effort).toBe("high");
    expect(out.executionMode).toBe("fork");
  });

  it("body loader is lazy — only invoked on expand", async () => {
    const r = new DefinitionResolver<SkillRecord>([
      skill({ slug: "lazy", tenantId: "t", sourceTier: "workspace" }),
    ]);
    const bodyLoader = vi.fn(async () => "b");
    buildSkillListing(r, { tenantId: "t" });
    expect(bodyLoader).not.toHaveBeenCalled();
    await expandSkill(r.resolveOne("lazy", { tenantId: "t" })!, {
      tenantId: "t",
      args: {},
      vars: {},
      bodyLoader,
      skillResourceBase: base,
    });
    expect(bodyLoader).toHaveBeenCalledTimes(1);
  });

  it("empty tenant fails closed on expand", async () => {
    const s = skill({ slug: "x", tenantId: "t", sourceTier: "workspace" });
    await expect(
      expandSkill(s, {
        tenantId: "",
        args: {},
        vars: {},
        bodyLoader: async () => "b",
        skillResourceBase: base,
      }),
    ).rejects.toThrow(/tenant/i);
  });

  it("cross-tenant expand fails closed", async () => {
    const s = skill({ slug: "x", tenantId: "t_a", sourceTier: "workspace" });
    await expect(
      expandSkill(s, {
        tenantId: "t_b",
        args: {},
        vars: {},
        bodyLoader: async () => "b",
        skillResourceBase: base,
      }),
    ).rejects.toThrow(/tenant/i);
  });

  it("does not execute any shell from the body (no command substitution)", async () => {
    const s = skill({ slug: "x", tenantId: "t", sourceTier: "workspace" });
    const out = await expandSkill(s, {
      tenantId: "t",
      args: {},
      vars: {},
      bodyLoader: async () => "literal !`rm -rf /` stays literal",
      skillResourceBase: base,
    });
    const content = out.messages.map((m) => m.content).join("\n");
    expect(content).toContain("!`rm -rf /`");
  });
});
