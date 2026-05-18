import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { parsePlayMarkdown } from "@nebutra/play-loader";
import { afterEach, describe, expect, it } from "vitest";
import {
  LandingBuilder,
  readLandingBuilderDebug,
  renderOnePagerHtml,
  renderTailwindTheme,
} from "./index";

let root: string | undefined;
let builder: LandingBuilder | undefined;

const brand = {
  tenantId: "tenant_a",
  brandId: "loop",
  name: "Loop",
  palette: [
    { name: "electric cyan", hex: "#00D4FF", role: "primary" },
    { name: "carbon black", hex: "#111318", role: "background" },
    { name: "signal amber", hex: "#F3C14B", role: "accent" },
  ],
  typography: { heading: "Geist Mono", body: "Geist Sans", accent: "Geist Mono" },
  visualStyle: {
    name: "cyberpunk",
    keywords: ["electric", "terminal-native"],
    avoid: ["generic stock"],
  },
  referenceImages: [],
  forbidden: ["generic stock"],
  toneKeywords: ["technical", "direct", "warm"],
  sourcePath: "company/BRAND.md",
} as const;

afterEach(async () => {
  if (builder) await builder.close();
  if (root) await rm(root, { recursive: true, force: true });
  root = undefined;
  builder = undefined;
});

async function open(): Promise<LandingBuilder> {
  root = await mkdtemp(join(tmpdir(), "landing-builder-"));
  builder = await LandingBuilder.open(root, { tenantId: "tenant_a" });
  return builder;
}

describe("landing-builder", () => {
  it("renders a brand-aware one pager without owning BrandContext", () => {
    const theme = renderTailwindTheme(brand);
    const html = renderOnePagerHtml({
      brand,
      productDesc: "AI debugging for indie devs",
      ctaText: "Join the waitlist",
    });

    expect(theme.cssVariables).toContain("--brand-primary: #00D4FF");
    expect(html).toContain("Loop");
    expect(html).toContain("AI debugging for indie devs");
    expect(html).toContain("Join the waitlist");
    expect(html).toContain('data-brand-id="loop"');
  });

  it("runs one_pager and writes site files plus a deploy handoff", async () => {
    const runtime = await open();

    const result = await runtime.runOnePager({
      brand,
      productDesc: "AI debugging for indie devs",
      ctaText: "Join the waitlist",
    });

    expect(result.play).toBe("one_pager");
    expect(result.files.map((file) => file.path)).toEqual([
      "company/landing/index.html",
      "company/landing/theme.css",
      "company/landing/deploy.json",
    ]);
    expect(result.preview.kind).toBe("static-content-store");
    expect(result.deploy.status).toBe("handoff");
    expect(result.eventId).toEqual(expect.any(String));
    await expect(readLandingBuilderDebug(root)).resolves.toEqual(expect.any(Array));
  });

  it("requires tenant context before persistent operations", async () => {
    root = await mkdtemp(join(tmpdir(), "landing-builder-"));
    const runtime = await LandingBuilder.open(root, { tenantId: "" });
    builder = runtime;

    await expect(
      runtime.runOnePager({
        brand: { ...brand, tenantId: "" },
        productDesc: "AI debugging",
        ctaText: "Join",
      }),
    ).rejects.toMatchObject({
      capability: "landing-builder",
      suggestion: expect.stringContaining("tenantId"),
    });
  });

  it("keeps the landing Play as SKILL.md instead of a new workflow format", async () => {
    const skill = await readFile(join(process.cwd(), "plays", "one_pager", "SKILL.md"), "utf8");
    const play = parsePlayMarkdown(skill);

    expect(play.meta).toMatchObject({ name: "one_pager", kind: "play", version: "1.0.0" });
    expect(play.requiredSkills).toContain("content_store.write");
    expect(play.subAgents.map((agent) => agent.role)).toContain("web_builder");
  });
});
