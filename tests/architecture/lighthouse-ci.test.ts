import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

describe("lighthouse dashboard ci harness", () => {
  it("builds the web dependency closure before running Next.js", async () => {
    const script = await readFile(
      join(process.cwd(), "scripts/lighthouse/ci-dashboard-compare.sh"),
      "utf8",
    );

    expect(script).toContain("export NEBUTRA_SKIP_GIT_HOOKS=1");
    expect(script).toContain("pnpm turbo run build --filter=@nebutra/web^...");
    expect(script).not.toContain("pnpm --filter @nebutra/brand build");
  });
});
