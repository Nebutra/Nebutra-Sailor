import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const PATTERNS_BARREL = join(process.cwd(), "src/patterns/index.ts");
const KINETIC_MARKETING = join(process.cwd(), "src/patterns/kinetic-marketing.tsx");
const EXTERNAL_TASTE_PREFIX = ["cu", "lt-"].join("");

describe("@nebutra/ui kinetic marketing pattern governance", () => {
  it("exports Cult-inspired marketing patterns through the patterns barrel", () => {
    const barrelSource = readFileSync(PATTERNS_BARREL, "utf8");

    expect(barrelSource).toContain("KineticFeatureCard");
    expect(barrelSource).toContain("KineticCodePreview");
    expect(barrelSource).toContain("KineticConsoleFrame");
    expect(barrelSource).toContain("KineticStepRail");
    expect(barrelSource).toContain("KineticStep");
    expect(barrelSource).toContain("KineticMorphSurface");
    expect(barrelSource).toContain("KineticSignalMarquee");
    expect(barrelSource).toContain("KineticCommandBox");
    expect(barrelSource).toContain("./kinetic-marketing");
  });

  it("keeps texture, terminal, and grid-beam taste inside the design-system pattern", () => {
    const source = readFileSync(KINETIC_MARKETING, "utf8");

    expect(source).toContain('data-taste="nebutra-texture-cutout-card"');
    expect(source).toContain('data-taste="nebutra-terminal-animation"');
    expect(source).toContain('data-taste="nebutra-grid-beam"');
    expect(source).toContain('data-taste="nebutra-morph-surface"');
    expect(source).toContain('data-taste="nebutra-provider-grid"');
    expect(source).toContain('data-taste="nebutra-texture-command"');
    expect(source).not.toContain(EXTERNAL_TASTE_PREFIX);
    expect(source).toContain("bg-[radial-gradient");
    expect(source).toContain("group-hover/kinetic");
    expect(source).toContain("maskImage");
  });
});
