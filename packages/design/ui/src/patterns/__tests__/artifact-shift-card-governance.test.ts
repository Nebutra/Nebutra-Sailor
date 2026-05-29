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
    expect(source).toContain("transition-[transform,border-color,box-shadow]");
    expect(source).toContain("group-hover/card:-translate-y-");
    expect(source).toContain("group-focus-within/card:-translate-y-");
  });
});
