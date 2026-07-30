import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

/**
 * deploy-ecs.yml enumerates its apps in four independent places, and nothing
 * made them agree until this test existed.
 *
 * The failure that prompted it: `admin` had been added to the dispatch input
 * description, the path filter, the `resolve` outputs and the allow-list `case`,
 * but NOT to the build matrix. Dispatching `apps=admin` was therefore accepted,
 * resolved to admin=true, matched no matrix entry, built nothing, skipped the
 * deploy job — and reported the run as SUCCESS in 17 seconds. A deploy that
 * deploys nothing and calls itself green is the worst possible outcome; it is
 * indistinguishable from a real one at the only place anybody looks.
 *
 * Parsed with regexes rather than a YAML library on purpose: the file is full of
 * `${{ }}` expressions and the point is to compare the literal enumerations a
 * human edits, not a normalised object graph.
 */

const WORKFLOW = resolve(process.cwd(), ".github/workflows/deploy-ecs.yml");
const yml = readFileSync(WORKFLOW, "utf-8");

/** Apps the build matrix can produce a bundle for. */
function matrixApps(): string[] {
  return [...yml.matchAll(/^\s+- app:\s*(\S+)\s*$/gm)].map((m) => m[1]);
}

/**
 * Apps built by a dedicated job rather than the matrix, identified by a
 * job-level gate on their own change-detection output. `api` is the real case:
 * the gateway needs `pnpm deploy` to hoist production deps, which the
 * next-standalone matrix does not do. Detected rather than listed, so a second
 * such job does not need this test edited.
 */
function dedicatedJobApps(): string[] {
  return [
    ...yml.matchAll(/^\s+if:\s*needs\.detect-changes\.outputs\.([a-z0-9-]+)\s*==\s*'true'/gm),
  ].map((m) => m[1]);
}

/** Everything that can actually produce a deployable bundle. */
function buildableApps(): string[] {
  return [...new Set([...matrixApps(), ...dedicatedJobApps()])];
}

/**
 * Apps the dispatch input accepts. The `case` arm is the gate that rejects
 * anything else, so it is the authoritative accept-list.
 */
function allowListApps(): string[] {
  const arm = yml.match(/^\s+([a-z0-9|-]*admin[a-z0-9|-]*)\)\s*;;\s*$/m);
  expect(arm, "deploy-ecs.yml must keep a case arm allow-listing dispatchable apps").toBeTruthy();
  return (arm?.[1] ?? "").split("|").filter(Boolean);
}

/** Apps with a dochange-detection output on the detect-changes job. */
function resolvedOutputs(): string[] {
  const block = yml.match(/outputs:\s*\n([\s\S]*?)\n\s{4}steps:/);
  expect(block, "deploy-ecs.yml detect-changes job must declare outputs").toBeTruthy();
  return [...(block?.[1] ?? "").matchAll(/^\s+([a-z0-9-]+):\s*\$\{\{\s*steps\./gm)].map(
    (m) => m[1],
  );
}

describe("deploy-ecs app enumeration closure", () => {
  it("every dispatchable app is built by something", () => {
    const missing = allowListApps().filter((app) => !buildableApps().includes(app));
    expect(
      missing,
      `these apps are accepted by the dispatch allow-list but nothing builds them — ` +
        `neither a matrix entry nor a dedicated job. Selecting one leaves both build ` +
        `jobs skipped, which makes the deploy job's ` +
        `\`!(build-next skipped && build-api skipped)\` guard skip it too, and the run ` +
        `reports success having deployed nothing: ${missing.join(", ")}`,
    ).toEqual([]);
  });

  it("every build matrix entry is dispatchable", () => {
    // The reverse direction: a matrix entry nobody can select only ever deploys
    // by accident of a path filter, which is not a thing anyone can reason about
    // during an incident.
    const unreachable = matrixApps().filter((app) => !allowListApps().includes(app));
    expect(
      unreachable,
      `these apps can be built but not dispatched by name: ${unreachable.join(", ")}`,
    ).toEqual([]);
  });

  it("every build matrix entry has a change-detection output to gate it", () => {
    const outputs = resolvedOutputs();
    const ungated = matrixApps().filter((app) => !outputs.includes(app));
    expect(
      ungated,
      `these matrix entries have no detect-changes output, so their \`condition\` ` +
        `resolves to empty and they never build: ${ungated.join(", ")}`,
    ).toEqual([]);
  });

  it("admin is wired end to end", () => {
    // Named explicitly because it is the case that was broken, and because a
    // control plane silently absent from the fleet is exactly the thing it
    // exists to make visible.
    expect(matrixApps()).toContain("admin");
    expect(allowListApps()).toContain("admin");
    expect(resolvedOutputs()).toContain("admin");
    expect(yml).toContain("'apps/admin/**'");
  });
});
