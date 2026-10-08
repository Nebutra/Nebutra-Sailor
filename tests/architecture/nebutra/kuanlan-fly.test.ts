import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const ROOT = process.cwd();

describe("retired Kuanlan Fly surface", () => {
  it("does not remain in active Fly deployment matrices", () => {
    const fly = readFileSync(resolve(ROOT, ".github/workflows/deploy-fly.yml"), "utf-8");
    expect(fly).not.toContain('"app":"kuanlan"');
    expect(fly).not.toContain('"fly_app":"nebutra-kuanlan"');
    expect(fly).not.toContain('"host":"kuanlan"');
    expect(fly).not.toContain("apps/kuanlan/**");
  });
});
