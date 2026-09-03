import { execFileSync } from "node:child_process";
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { getPackageMaturityDiagnostics } from "../../scripts/lib/package-maturity.mjs";
import { getReleaseSurfaceDiagnostics } from "../../scripts/lib/release-surface.mjs";
import {
  checkSailorGroup,
  compareVersions,
  computeSailorGroup,
  getSailorStatus,
  getSailorVersion,
  isSailorGroupConverged,
} from "../../scripts/sailor-version.mjs";

/**
 * The sailor version: every publishable core + runtime package ships as one
 * number. `.changeset/config.json` carries that as a single `fixed` group, and
 * scripts/sailor-version.mjs computes the group from `nebutra.graph`. Nothing
 * else keeps the two aligned — changesets validates that the names in the group
 * exist, not that every package that should be there is — so a new core
 * package would quietly version on its own until this file says otherwise.
 *
 * The first block asserts the repo's config against the computed group. The
 * second runs the CLI against a throwaway workspace whose config drifts on
 * purpose, so the guard is seen failing before it is trusted to pass.
 *
 * Source-only: this file reads sync-template.yml and TEMPLATE.md, which the
 * template strips, and asserts the source repo's fixed group, which the mirror
 * deliberately does not carry (scripts/template-build.ts empties it). It is
 * listed in .templateignore, and the last block checks that it stays listed.
 */

const REPO_ROOT = join(import.meta.dirname, "../..");
const SCRIPT = join(REPO_ROOT, "scripts/sailor-version.mjs");

type RunResult = { status: number; stdout: string; stderr: string };

function runScript(cwd: string, ...args: string[]): RunResult {
  try {
    const stdout = execFileSync(process.execPath, [SCRIPT, ...args], {
      cwd,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
    });
    return { status: 0, stdout, stderr: "" };
  } catch (error) {
    const failure = error as { status?: number; stdout?: string; stderr?: string };
    return {
      status: failure.status ?? 1,
      stdout: failure.stdout?.toString() ?? "",
      stderr: failure.stderr?.toString() ?? "",
    };
  }
}

describe("sailor version — the repo's fixed group", () => {
  const result = checkSailorGroup(REPO_ROOT);

  it("lists every publishable core/runtime package in .changeset/config.json, and nothing else", () => {
    const report = [
      ...result.problems.map((p) => `  - ${p}`),
      ...result.missing.map((m) => `  missing: ${m.name} (${m.graph}, ${m.dir})`),
      ...result.extra.map((e) => `  extra:   ${e}`),
    ].join("\n");
    expect(
      result.ok,
      `.changeset/config.json fixed group drifts from the core+runtime graph — run ` +
        `\`node scripts/sailor-version.mjs --write\`:\n${report}`,
    ).toBe(true);
  });

  it("keeps labs, private packages and the unscoped CLIs out of the lockstep", () => {
    const names = new Set(result.group.map((item) => item.name));
    const maturity = getPackageMaturityDiagnostics(REPO_ROOT);
    const surface = getReleaseSurfaceDiagnostics(REPO_ROOT);
    const privateNames = new Set(
      surface.packages
        .filter((entry) => entry.manifest.private === true)
        .map((entry) => entry.manifest.name),
    );

    const labsInGroup = maturity.byGraph.labs.filter((item) => names.has(item.name));
    expect(labsInGroup.map((item) => item.name)).toEqual([]);
    expect([...names].filter((name) => privateNames.has(name))).toEqual([]);
    expect([...names].filter((name) => !name.startsWith("@"))).toEqual([]);
    expect(names.has("create-sailor")).toBe(false);
    expect(names.has("nebutra")).toBe(false);

    // The group is the whole publishable core+runtime graph, not a curated subset.
    const expected = surface.packages
      .filter((entry) => entry.manifest.private !== true && entry.manifest.name.startsWith("@"))
      .map((entry) => entry.manifest.name)
      .filter((name) => {
        const graph = maturity.packages.find((item) => item.name === name)?.graph;
        return graph === "core" || graph === "runtime";
      })
      .sort();
    expect([...names].sort()).toEqual(expected);
    expect(names.size).toBeGreaterThan(30);
  });

  it("reports the highest version in the group as the sailor version — what changesets converges on", () => {
    const highest = result.group
      .map((item) => item.version)
      .reduce((a, b) => (compareVersions(b, a) > 0 ? b : a));
    expect(getSailorVersion(REPO_ROOT)).toBe(highest);
    expect(runScript(REPO_ROOT).stdout.trim()).toBe(highest);
  });

  it("prints the same group from the CLI that the check uses", () => {
    const printed = runScript(REPO_ROOT, "--group").stdout.trim().split("\n");
    expect(printed).toEqual(result.group.map((item) => item.name));
    expect(runScript(REPO_ROOT, "--check").status).toBe(0);
  });

  it("reports convergence as a fact about every member, not just the highest one", () => {
    const status = getSailorStatus(REPO_ROOT);
    const version = getSailorVersion(REPO_ROOT);
    expect(status.version).toBe(version);
    expect(status.packages).toBe(result.group.length);
    // False until the first lockstep release moves all 41 to one number; true
    // from then on. Either way it must be the truth about the whole group.
    expect(status.converged).toBe(result.group.every((item) => item.version === version));
    expect(isSailorGroupConverged(REPO_ROOT)).toBe(status.converged);
    expect(JSON.parse(runScript(REPO_ROOT, "--json").stdout)).toEqual(status);
  });
});

describe("sailor version — semver ordering", () => {
  it("orders numerically, not lexically, and puts prereleases before their release", () => {
    expect(compareVersions("0.10.0", "0.9.0")).toBeGreaterThan(0);
    expect(compareVersions("1.1.2", "1.1.10")).toBeLessThan(0);
    expect(compareVersions("1.0.0-beta.1", "1.0.0")).toBeLessThan(0);
    expect(compareVersions("1.0.0-beta.2", "1.0.0-beta.10")).toBeLessThan(0);
    expect(compareVersions("2.0.0", "2.0.0")).toBe(0);
    expect(() => compareVersions("workspace:*", "1.0.0")).toThrow(/not a semver version/);
  });
});

describe("sailor version — the guard fails on drift (fixture workspace)", () => {
  let root = "";

  function writePackage(
    dir: string,
    manifest: Record<string, unknown>,
    nebutra: { graph: string; status: string },
  ): void {
    const abs = join(root, dir);
    mkdirSync(abs, { recursive: true });
    writeFileSync(
      join(abs, "package.json"),
      `${JSON.stringify({ ...manifest, nebutra }, null, 2)}\n`,
    );
  }

  function writeConfig(fixed: string[][]): void {
    mkdirSync(join(root, ".changeset"), { recursive: true });
    writeFileSync(
      join(root, ".changeset/config.json"),
      `${JSON.stringify({ changelog: false, fixed, linked: [], access: "public" }, null, 2)}\n`,
    );
  }

  beforeAll(() => {
    root = mkdtempSync(join(tmpdir(), "sailor-version-"));
    writePackage(
      "packages/x/alpha",
      { name: "@probe/alpha", version: "0.9.0" },
      {
        graph: "core",
        status: "foundation",
      },
    );
    writePackage(
      "packages/x/beta",
      { name: "@probe/beta", version: "0.10.0" },
      {
        graph: "runtime",
        status: "wip",
      },
    );
    writePackage(
      "packages/x/lab",
      { name: "@probe/lab", version: "3.0.0" },
      {
        graph: "labs",
        status: "wip",
      },
    );
    writePackage(
      "packages/x/secret",
      { name: "@probe/secret", version: "4.0.0", private: true },
      { graph: "core", status: "foundation" },
    );
    writePackage(
      "packages/ops/cli",
      { name: "create-probe", version: "5.0.0", bin: { "create-probe": "dist/index.js" } },
      { graph: "core", status: "foundation" },
    );
  });

  afterAll(() => {
    if (root) rmSync(root, { recursive: true, force: true });
  });

  it("computes the group from graph + private + scope, and the version numerically", () => {
    expect(computeSailorGroup(root).map((item) => item.name)).toEqual([
      "@probe/alpha",
      "@probe/beta",
    ]);
    // 0.10.0 beats 0.9.0; the 3.0.0 lab, 4.0.0 private and 5.0.0 CLI are not in the running.
    expect(getSailorVersion(root)).toBe("0.10.0");
    expect(runScript(root).stdout.trim()).toBe("0.10.0");
  });

  it("fails --check on an empty group (origin/main's config before this guard) and names every absentee", () => {
    writeConfig([]);
    const run = runScript(root, "--check");
    expect(run.status).toBe(1);
    expect(run.stderr).toContain("exactly one fixed group (found 0)");
    expect(run.stderr).toContain("@probe/alpha (core, packages/x/alpha)");
    expect(run.stderr).toContain("@probe/beta (runtime, packages/x/beta)");
  });

  it("fails --check on a missing member and on a stowaway, listing both", () => {
    writeConfig([["@probe/alpha", "@probe/lab", "create-probe"]]);
    const run = runScript(root, "--check");
    expect(run.status).toBe(1);
    expect(run.stderr).toContain("missing");
    expect(run.stderr).toContain("@probe/beta (runtime, packages/x/beta)");
    expect(run.stderr).toContain("extra");
    expect(run.stderr).toContain("- @probe/lab");
    expect(run.stderr).toContain("- create-probe");
    expect(run.stderr).not.toContain("- @probe/alpha");
  });

  it("fails --check on a second fixed group, since the sailor version is one number", () => {
    writeConfig([["@probe/alpha", "@probe/beta"], ["@probe/lab"]]);
    const run = runScript(root, "--check");
    expect(run.status).toBe(1);
    expect(run.stderr).toContain("exactly one fixed group (found 2)");
  });

  it("passes --check once --write has regenerated the group, and touches nothing else", () => {
    writeConfig([]);
    expect(runScript(root, "--write").status).toBe(0);
    const config = JSON.parse(readFileSync(join(root, ".changeset/config.json"), "utf8"));
    expect(config.fixed).toEqual([["@probe/alpha", "@probe/beta"]]);
    expect(config.access).toBe("public");
    expect(config.linked).toEqual([]);
    const run = runScript(root, "--check");
    expect(run.status, run.stderr).toBe(0);
    expect(run.stdout).toContain("2 packages at sailor version 0.10.0 (1 still behind");
  });

  it("is not converged while one member lags, and is once every member carries the version", () => {
    expect(isSailorGroupConverged(root)).toBe(false);
    expect(JSON.parse(runScript(root, "--json").stdout)).toEqual({
      version: "0.10.0",
      converged: false,
      packages: 2,
    });

    // The first lockstep release: changesets moves alpha up to the group's number.
    writePackage(
      "packages/x/alpha",
      { name: "@probe/alpha", version: "0.10.0" },
      { graph: "core", status: "foundation" },
    );
    expect(isSailorGroupConverged(root)).toBe(true);
    expect(JSON.parse(runScript(root, "--json").stdout)).toEqual({
      version: "0.10.0",
      converged: true,
      packages: 2,
    });
    expect(runScript(root, "--check").stdout).toContain("at sailor version 0.10.0 (converged)");
  });
});

describe("sailor version — the mirror carries it", () => {
  const workflow = readFileSync(join(REPO_ROOT, ".github/workflows/sync-template.yml"), "utf8");
  const build = readFileSync(join(REPO_ROOT, "scripts/template-build.ts"), "utf8");

  it("template-build stamps sailorVersion and sailorVersionConverged into the marker from the script", () => {
    expect(build).toContain("scripts/sailor-version.mjs");
    expect(build).toContain('"--json"');
    expect(build).toMatch(/sailorVersion: sailor\.version/);
    expect(build).toMatch(/sailorVersionConverged: sailor\.converged/);
  });

  it("template-build empties the mirror's fixed group, since the mirror never publishes and scaffolds prune members", () => {
    expect(build).toMatch(/config\.fixed = \[\]/);
    expect(build).toContain("clearChangesetFixedGroup(out)");
  });

  it("sync-template tags the mirror v<sailorVersion> only once converged and only when absent, keeping source-<sha>", () => {
    expect(workflow).toContain('TEMPLATE_TAG="source-$' + '{SRC_SHA}"');
    expect(workflow).toContain(".sailorVersion");
    expect(workflow).toContain(".sailorVersionConverged");
    expect(workflow).toContain('SAILOR_TAG="v$' + '{SAILOR_VERSION}"');
    // The convergence gate sits in front of the tag lookup: no tag for a
    // tree in which only one package carries the number.
    const gate = workflow.indexOf('if [ "$' + '{SAILOR_CONVERGED}" != "true" ]; then');
    const lookup = workflow.search(
      /git ls-remote --exit-code --tags origin "refs\/tags\/\$\{SAILOR_TAG\}"/,
    );
    expect(gate).toBeGreaterThan(-1);
    expect(lookup).toBeGreaterThan(gate);
    expect(workflow).toContain('git push -q origin "refs/tags/$' + '{SAILOR_TAG}"');
    // Never a forced tag push: a tag that exists is left where it is.
    expect(workflow).not.toMatch(/push[^\n]*--force[^\n]*refs\/tags\/\$\{SAILOR_TAG\}/);
    expect(workflow).not.toMatch(/git tag -[a-z]*f/);
  });

  it("sync-template reports the tag outcome from the push step, not unconditionally", () => {
    // A workflow_dispatch dry run skips the push step; the summary must not
    // claim a tag was created. The outcome is a step output, empty when skipped.
    expect(workflow).toContain("steps.push.outputs.sailor_tag");
    expect(workflow).not.toContain("(created on first sync at this version)");
    expect(workflow).toMatch(/^\s+id: push$/m);
  });

  it("TEMPLATE.md explains the lockstep, the convergence gate and the emptied mirror group", () => {
    const doc = readFileSync(join(REPO_ROOT, "TEMPLATE.md"), "utf8");
    expect(doc).toMatch(/^## Sailor version$/m);
    expect(doc).toContain("scripts/sailor-version.mjs");
    expect(doc).toContain("sailorVersion");
    expect(doc).toContain("sailorVersionConverged");
    expect(doc).toContain("`fixed: []`");
  });

  it("stays out of the template: this file reads what the template strips", () => {
    const ignore = readFileSync(join(REPO_ROOT, ".templateignore"), "utf8").split("\n");
    expect(ignore).toContain("tests/architecture/sailor-version.test.ts");
    expect(ignore).toContain(".github/workflows/sync-template.yml");
    expect(ignore).toContain("TEMPLATE.md");
  });
});
