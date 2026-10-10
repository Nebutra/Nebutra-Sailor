import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const PATTERNS_BARREL = join(process.cwd(), "src/patterns/index.ts");
const ARTIFACT_SHIFT_CARD = join(process.cwd(), "src/patterns/artifact-shift-card.tsx");
const EXTERNAL_TASTE_PREFIX = ["cu", "lt-"].join("");

describe("@nebutra/ui ArtifactShiftCard pattern governance", () => {
  it("exports the taste-preserving artifact card through the patterns barrel", () => {
    const barrelSource = readFileSync(PATTERNS_BARREL, "utf8");

    expect(barrelSource).toContain("ArtifactShiftCard");
    expect(barrelSource).toContain("./artifact-shift-card");
  });

  it("keeps texture and shift behavior inside the design-system pattern", () => {
    const source = readFileSync(ARTIFACT_SHIFT_CARD, "utf8");

    expect(source).toContain('data-taste="nebutra-shift-card"');
    expect(source).not.toContain(EXTERNAL_TASTE_PREFIX);
    expect(source).toContain("bg-[radial-gradient");
    // An exhibit, not a control: the shift is a border spotlight on hover and
    // keyboard focus, never a lift (docs/design-system/hover-motion.md).
    expect(source).toContain("transition-[border-color]");
    expect(source).toContain("group-hover/card:border-");
    expect(source).toContain("group-focus-within/card:border-");
    expect(source).not.toMatch(/(?:hover|focus-within)(?:\/card)?:-translate-y-/u);
  });
});
