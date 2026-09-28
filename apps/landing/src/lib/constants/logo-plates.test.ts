import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { plateFor, renderPlates } from "../../../scripts/gen-logo-plates.mjs";

const ROOT = join(__dirname, "../../..");

describe("logo plates", () => {
  it("are computed from the logos that ship — regenerate after adding or replacing one", async () => {
    const committed = readFileSync(join(__dirname, "logo-plates.generated.ts"), "utf8");
    expect(committed).toBe(await renderPlates());
  }, 30_000);

  it("put a white mark on a dark plate, never on white", async () => {
    // 英诺天使基金: white on transparent — invisible on the old fixed white mat.
    const { plate, own } = await plateFor(join(ROOT, "public/logos/vc/33.png"));
    expect(own).toBe(false);
    expect(Number.parseInt((plate ?? "#ffffff").slice(1, 3), 16)).toBeLessThan(64);
  });

  it("keep a logo that brings its own background on that colour", async () => {
    // 纪源资本 (GGV): a black tile of its own.
    const { plate, own } = await plateFor(join(ROOT, "public/logos/vc/229.png"));
    expect(own).toBe(true);
    expect(plate).toBe("#010101");
  });
});
