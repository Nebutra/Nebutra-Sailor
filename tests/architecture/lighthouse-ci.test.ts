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
    expect(script).toContain("pnpm exec next build");
    expect(script).toContain("curl -fsS -o /dev/null");
    expect(script).not.toContain("pnpm --filter @nebutra/brand build");
    expect(script).not.toContain("--experimental-build-mode=compile");
  });

  it("uses a public route for pull-request Lighthouse checks", async () => {
    const workflow = await readFile(
      join(process.cwd(), ".github/workflows/lighthouse-dashboard.yml"),
      "utf8",
    );

    expect(workflow).toContain('TARGET_PATH="/demo/embed"');
  });
});
