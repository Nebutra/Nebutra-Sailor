import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const COMPONENTS_BARREL = join(process.cwd(), "src/components/index.ts");

describe("@nebutra/ui/components barrel governance", () => {
  it("does not import the @lobehub/ui awesome barrel, which eagerly loads Spline", () => {
    const source = readFileSync(COMPONENTS_BARREL, "utf8");

    expect(source).not.toContain('from "@lobehub/ui/awesome"');
    expect(source).toContain("export { default as Spotlight }");
    expect(source).toContain('from "@lobehub/ui/es/awesome/Spotlight/Spotlight"');
  });
});
