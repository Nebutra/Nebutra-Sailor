import { execFileSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const repoRoot = process.cwd();

function readJson(rel: string): {
  git?: { deploymentEnabled?: boolean };
  ignoreCommand?: string;
} {
  return JSON.parse(readFileSync(resolve(repoRoot, rel), "utf8")) as {
    git?: { deploymentEnabled?: boolean };
    ignoreCommand?: string;
  };
}

function readText(rel: string): string {
  return readFileSync(resolve(repoRoot, rel), "utf8");
}

describe("Vercel spend: landing ships prebuilt from GitHub, kuanlan is Fly-primary", () => {
  it("disables Git auto-deploy on every Vercel project that ships from CI", () => {
    expect(readJson("apps/web/vercel.json").git?.deploymentEnabled).toBe(false);
    expect(readJson("apps/auth/vercel.json").git?.deploymentEnabled).toBe(false);
    // landing is deployed by deploy-landing-vercel.yml; a live Git integration
    // would open a second remote build of the same commit.
    expect(readJson("apps/landing/vercel.json").git?.deploymentEnabled).toBe(false);
  });

  it("builds landing on the GitHub runner and uploads prebuilt output", () => {
    const workflow = readText(".github/workflows/deploy-landing-vercel.yml");
    expect(workflow).toMatch(/vercel pull /);
    expect(workflow).toMatch(/vercel build /);
    expect(workflow).toMatch(/vercel deploy --prebuilt/);
    // A bare `vercel deploy` (no --prebuilt) would move the build back onto
    // Vercel's meter.
    expect(workflow).not.toMatch(/vercel deploy --prod/);
  });

  it("does not redeploy landing on a schedule", () => {
    // The nightly retry existed for the Hobby daily deployment cap. Under
    // metered builds it rebuilt an unchanged site every evening.
    const workflow = readText(".github/workflows/deploy-landing-vercel.yml");
    expect(workflow).not.toMatch(/^\s*schedule:/m);
    expect(workflow).not.toMatch(/cron:/);
  });

  it("does not rebuild sailor-docs for a lockfile-only change", () => {
    const workflow = readText(".github/workflows/deploy-sailor-docs.yml");
    const pushPaths = workflow.match(
      /^\s+push:\n\s+branches: \[main\]\n\s+paths:\n((?:\s+(?:#.*|- .*)\n)+)/m,
    );
    expect(pushPaths, "push.paths block").not.toBeNull();
    expect(pushPaths?.[1]).not.toMatch(/^\s+- "pnpm-lock\.yaml"/m);
  });

  it("skips a non-main branch when run the way Vercel runs it (inside the Root Directory, no git)", () => {
    // Vercel executes the Ignored Build Step with cwd = the project's Root
    // Directory and no usable git checkout. The script used to derive the repo
    // root from `git rev-parse` with a `pwd` fallback, which resolved to
    // apps/landing itself; "$REPO_ROOT/apps/landing" then did not exist and the
    // unknown-directory branch built every deployment. Every Vercel build log
    // from 2026-08-26 to 2026-09-02 carried "→ Building to avoid a false skip."
    const result = execFileSync("bash", ["../../scripts/vercel-ignore-build.sh", "apps/landing"], {
      cwd: resolve(repoRoot, "apps/landing"),
      encoding: "utf8",
      env: { ...process.env, GIT_DIR: "/nonexistent", VERCEL_GIT_COMMIT_REF: "feature/anything" },
    });
    expect(result).toContain("Non-main ref 'feature/anything' — skip");
    expect(result).not.toContain("Building to avoid a false skip");
  });

  it("treats kuanlan as Fly-primary, not an ECS-optional skip", () => {
    const script = readText("scripts/vercel-ignore-build.sh");
    expect(script).toContain("apps/kuanlan) is_fly_primary=1");
    expect(script).toMatch(/apps\/web\|apps\/auth\|backends\/gateway/);
    expect(script).not.toMatch(/apps\/kuanlan[^\n]*is_ecs_optional/);
    expect(script).not.toContain("apps/web|apps/auth|apps/kuanlan");
  });

  it("keeps kuanlan on Git ignoreCommand and skips Vercel now that the app is on main", () => {
    const kuanlan = readJson("apps/kuanlan/vercel.json");
    expect(kuanlan.ignoreCommand).toBe("bash ../../scripts/vercel-ignore-build.sh apps/kuanlan");
    expect(kuanlan.git?.deploymentEnabled).not.toBe(false);
    expect(existsSync(resolve(repoRoot, "apps/kuanlan/package.json"))).toBe(true);
    const result = execFileSync("bash", ["scripts/vercel-ignore-build.sh", "apps/kuanlan"], {
      cwd: repoRoot,
      encoding: "utf8",
      env: { ...process.env, VERCEL_GIT_COMMIT_REF: "main" },
    });
    expect(result).toContain("Fly-primary app (apps/kuanlan) — skip Vercel auto-deploy.");
  });
});
