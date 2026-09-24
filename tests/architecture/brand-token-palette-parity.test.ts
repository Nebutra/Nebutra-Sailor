import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { colors } from "@nebutra/brand";
import { describe, expect, it } from "vitest";

/**
 * @nebutra/brand carries the palettes as JS objects (favicons, OG images, the
 * design site's brand page); the DTCG core.json carries them as tokens. Two
 * copies of one palette drift silently: until 2026-09-24 the brand package
 * still held Slate after the token source had moved to the House gray, and the
 * brand page presented it as "the object the tokens are generated from".
 */

const ROOT = process.cwd();

type Leaf = { $value?: string };
type Ramp = Record<string, Leaf | string>;

async function coreRamp(name: string): Promise<Record<string, string>> {
  const core = JSON.parse(
    await readFile(join(ROOT, "packages/design/design-tokens/tokens/core.json"), "utf8"),
  ) as { color: Record<string, Ramp> };
  const ramp = core.color[name];
  if (!ramp) throw new Error(`core.json has no color.${name}`);
  return Object.fromEntries(
    Object.entries(ramp)
      .filter(([step, leaf]) => !step.startsWith("$") && typeof leaf === "object")
      .map(([step, leaf]) => [step, String((leaf as Leaf).$value).toLowerCase()]),
  );
}

function brandRamp(ramp: Record<string, string>): Record<string, string> {
  return Object.fromEntries(
    Object.entries(ramp)
      .filter(([step]) => step !== "0")
      .map(([step, hex]) => [step, hex.toLowerCase()]),
  );
}

describe("brand palette matches the DTCG token source", () => {
  it("neutral ramp", async () => {
    expect(brandRamp(colors.neutral)).toEqual(await coreRamp("nebutra-neutral"));
  });
});
