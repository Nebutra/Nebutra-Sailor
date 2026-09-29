import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { STUDIO_URL } from "@nebutra/tokens/preset";
import { describe, expect, it } from "vitest";
import { previewOf, readPresetArgument } from "./studio";

describe("nebutra studio", () => {
  it("reads a preset from JSON, a file, a code or a Studio link", () => {
    const json = '{"base":"linear","radius":"lg"}';
    expect(readPresetArgument(json)).toEqual({ base: "linear", radius: "lg" });

    const dir = mkdtempSync(join(tmpdir(), "sailor-studio-"));
    const file = join(dir, "preset.json");
    writeFileSync(file, json);
    expect(readPresetArgument(file)).toEqual({ base: "linear", radius: "lg" });
    rmSync(dir, { recursive: true, force: true });

    const preview = previewOf({ base: "linear", radius: "lg" });
    expect(readPresetArgument(preview.code)).toEqual({ base: "linear", radius: "lg" });
    expect(readPresetArgument(preview.reviewUrl)).toEqual({ base: "linear", radius: "lg" });
  });

  it("hands back the review link and both ways to apply", () => {
    const preview = previewOf({ base: "vercel" });
    expect(preview.code).toBe("vercel");
    expect(preview.reviewUrl).toBe(`${STUDIO_URL}?preset=vercel&proposed=1`);
    expect(preview.apply).toBe("nebutra studio pull vercel");
    expect(preview.create).toBe("npx create-sailor@latest my-app --preset vercel");
  });
});
