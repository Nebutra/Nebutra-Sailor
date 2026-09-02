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

const VERCEL_WORKFLOW = ".github/workflows/deploy-vercel.yml";
const VERCEL_APPS = ["landing", "web", "auth", "pebble", "kuanlan", "carina", "docs"];

// Per-app Vercel workflows folded into deploy-vercel.yml. Each one that comes
// back is a second path to the same project, and two of them ran a remote
// build on Vercel's meter.
const RETIRED_VERCEL_WORKFLOWS = [
  "deploy-landing-vercel.yml",
  "deploy-web-vercel.yml",
  "deploy-auth-vercel.yml",
  "deploy-pebble-vercel.yml",
  "deploy-kuanlan-vercel.yml",
  "deploy-carina-vercel.yml",
  "tmp-vercel-git-deploy-docs.yml",
];

function pushPathsOf(workflow: string): string {
  const block = workflow.match(
    /^\s+push:\n\s+branches: \[main\]\n\s+paths:\n((?:\s+(?:#.*|- .*)\n)+)/m,
  );
  expect(block, "push.paths block").not.toBeNull();
  return block?.[1] ?? "";
}

describe("Vercel spend: every app ships prebuilt from one workflow, kuanlan is Fly-primary", () => {
  it("disables Git auto-deploy on every Vercel project that ships from CI", () => {
    expect(readJson("apps/web/vercel.json").git?.deploymentEnabled).toBe(false);
    expect(readJson("apps/auth/vercel.json").git?.deploymentEnabled).toBe(false);
    // landing is deployed by deploy-vercel.yml; a live Git integration would
    // open a second remote build of the same commit.
    expect(readJson("apps/landing/vercel.json").git?.deploymentEnabled).toBe(false);
  });

  it("builds every app on the GitHub runner and uploads prebuilt output", () => {
    const workflow = readText(VERCEL_WORKFLOW);
    expect(workflow).toMatch(/vercel pull /);
    expect(workflow).toMatch(/vercel build /);
    expect(workflow).toMatch(/vercel deploy --prebuilt/);
    // A bare `vercel deploy` (no --prebuilt) would move the build back onto
    // Vercel's meter.
    expect(workflow).not.toMatch(/vercel deploy --prod/);
  });

  it("keeps the landing-only push trigger; every other app is workflow_dispatch", () => {
    const workflow = readText(VERCEL_WORKFLOW);
    const paths = pushPathsOf(workflow);
    expect(paths).toContain('- "apps/landing/**"');
    expect(paths).toContain(`- "${VERCEL_WORKFLOW}"`);
    for (const app of VERCEL_APPS.filter((a) => a !== "landing")) {
      expect(paths, `${app} must not auto-deploy on push`).not.toContain(`apps/${app}/**`);
    }
    expect(paths).not.toContain("apps/sailor-docs/**");
    // The plan job maps a push to landing and a dispatch to the chosen app.
    expect(workflow).toContain(
      "APP: $" + "{{ github.event_name == 'push' && 'landing' || inputs.app }}",
    );
  });

  it("offers every Vercel app from the one dispatch and configures each in the plan table", () => {
    const workflow = readText(VERCEL_WORKFLOW);
    expect(workflow).toContain(`options: [${VERCEL_APPS.join(", ")}]`);
    for (const app of VERCEL_APPS) {
      expect(workflow, `plan table entry for ${app}`).toMatch(
        new RegExp(`^\\s+"${app}": \\{$`, "m"),
      );
    }
    expect(workflow).toContain("strategy:");
    expect(workflow).toContain("matrix: $" + "{{ fromJson(needs.plan.outputs.matrix) }}");
  });

  it("drops empty Sensitive entries after vercel pull and exports the app's vercel.json env", () => {
    const workflow = readText(VERCEL_WORKFLOW);
    expect(workflow).toMatch(/envfile="\.vercel\/\.env\.\$\{environment\}\.local"/);
    expect(workflow).toMatch(/dropped \$\{empties\} empty \(Sensitive\) entries/);
    expect(workflow).toMatch(/if \[ -f "\$\{APP_ROOT\}\/vercel\.json" \]; then/);
    expect(workflow).toMatch(/"\$PWD\/\$\{APP_ROOT\}\/vercel\.json"/);
  });

  it("does not redeploy on a schedule", () => {
    // The nightly retry existed for the Hobby daily deployment cap. Under
    // metered builds it rebuilt an unchanged site every evening.
    const workflow = readText(VERCEL_WORKFLOW);
    expect(workflow).not.toMatch(/^\s*schedule:/m);
    expect(workflow).not.toMatch(/cron:/);
  });

  it("keeps the retired per-app Vercel workflows retired", () => {
    for (const file of RETIRED_VERCEL_WORKFLOWS) {
      expect(existsSync(resolve(repoRoot, ".github/workflows", file)), file).toBe(false);
    }
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
