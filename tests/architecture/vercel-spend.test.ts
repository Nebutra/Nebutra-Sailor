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

describe("Vercel spend: keep kuanlan, stop web/auth auto-deploy", () => {
  it("disables Git auto-deploy on ECS-primary Vercel projects only", () => {
    expect(readJson("apps/web/vercel.json").git?.deploymentEnabled).toBe(false);
    expect(readJson("apps/auth/vercel.json").git?.deploymentEnabled).toBe(false);
    expect(readJson("apps/landing/vercel.json").git?.deploymentEnabled).not.toBe(false);
  });

  it("does not treat kuanlan as an ECS-optional skip", () => {
    const script = readFileSync(resolve(repoRoot, "scripts/vercel-ignore-build.sh"), "utf8");
    expect(script).toContain("apps/kuanlan");
    expect(script).toMatch(/apps\/web\|apps\/auth\|backends\/gateway/);
    expect(script).not.toMatch(/apps\/kuanlan[^\n]*is_ecs_optional/);
    expect(script).not.toContain("apps/web|apps/auth|apps/kuanlan");
  });

  it("keeps kuanlan on Git ignoreCommand and skips until package.json exists", () => {
    const kuanlan = readJson("apps/kuanlan/vercel.json");
    expect(kuanlan.ignoreCommand).toBe("bash ../../scripts/vercel-ignore-build.sh apps/kuanlan");
    expect(kuanlan.git?.deploymentEnabled).not.toBe(false);
    expect(existsSync(resolve(repoRoot, "apps/kuanlan/package.json"))).toBe(false);
    const result = execFileSync("bash", ["scripts/vercel-ignore-build.sh", "apps/kuanlan"], {
      cwd: repoRoot,
      encoding: "utf8",
    });
    expect(result).toContain("apps/kuanlan is not in this tree yet — skip.");
  });
});
