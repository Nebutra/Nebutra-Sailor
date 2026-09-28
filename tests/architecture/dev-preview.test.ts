/**
 * `pnpm dev` — the zero-key local preview (scripts/dev/preview.ts).
 *
 * A fresh project must reach a working product with one command. These pin
 * the pieces that broke it before: a root `dev` that started every persistent
 * task at once, dev servers that started before the packages they import were
 * built, and a gateway that imported route directories the template strips.
 */
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { fastBuildCommand, packagesToBuild, readWorkspace } from "../../scripts/dev/prebuild";

const ROOT = path.resolve(__dirname, "../..");
const read = (file: string) => readFileSync(path.join(ROOT, file), "utf8");

describe("pnpm dev — the local preview", () => {
  it("root dev runs the preview; everything else is dev:all with an explicit concurrency", () => {
    const pkg = JSON.parse(read("package.json")) as { scripts: Record<string, string> };
    expect(pkg.scripts.dev).toBe("tsx scripts/dev/preview.ts");
    expect(pkg.scripts["dev:all"]).toMatch(/^turbo run dev --concurrency=\d+$/);
  });

  it("turbo dev builds the packages an app imports before starting it", () => {
    const turbo = JSON.parse(read("turbo.json")) as {
      tasks: Record<string, { dependsOn?: string[] }>;
    };
    expect(turbo.tasks.dev?.dependsOn).toContain("^build");
  });

  it("rewrites build scripts to their JavaScript-only form", () => {
    expect(fastBuildCommand("tsup")).toBe("tsup --no-dts");
    expect(fastBuildCommand("NODE_OPTIONS='--max-old-space-size=6144' tsup")).toBe(
      "NODE_OPTIONS='--max-old-space-size=6144' tsup --no-dts",
    );
    expect(fastBuildCommand("tsc -p tsconfig.json")).toBe("tsc -p tsconfig.json --noCheck");
    expect(fastBuildCommand("tsc --noEmit")).toBeNull();
    expect(fastBuildCommand("tsc -p tsconfig.json && cp a b")).toBe(
      "tsc -p tsconfig.json --noCheck && cp a b",
    );
    expect(fastBuildCommand("node style-dictionary.config.mjs")).toBe(
      "node style-dictionary.config.mjs",
    );
    expect(fastBuildCommand(undefined)).toBeNull();
  });

  it("builds every workspace dependency of the preview apps, and not the apps", () => {
    const workspace = readWorkspace(ROOT);
    const apps = ["@nebutra/web", "@nebutra/landing", "@nebutra/gateway"];
    const names = packagesToBuild(workspace, apps).map((pkg) => pkg.name);
    expect(names).toContain("@nebutra/ui");
    expect(names).toContain("@nebutra/auth");
    expect(names).toContain("@nebutra/db");
    for (const app of apps) expect(names).not.toContain(app);
  });

  it("the gateway reaches product-line routes only through the product-routes seam", () => {
    const app = read("backends/gateway/src/app.ts");
    for (const dir of ["startup-os", "agent-runtime", "pebble"]) {
      expect(app).not.toContain(`./routes/${dir}/`);
    }
    // Where product routes are mounted, a template variant must stand in for
    // them (template-build 2c) — a scaffold, which has the variant in place, passes.
    const seam = read("backends/gateway/src/routes/product-routes.ts");
    if (/from "\.\/(startup-os|agent-runtime|pebble)\//.test(seam)) {
      expect(
        existsSync(path.join(ROOT, "backends/gateway/src/routes/product-routes.for-template.ts")),
      ).toBe(true);
    }
  });
});
