import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

/**
 * deploy-ecs.yml enumerates its apps in ten places, and the remote script it
 * drives in five more. Nothing made the fifteen agree until this test existed.
 *
 * The failure that prompted it: `admin` was in the dispatch input description,
 * the path filter, the `resolve` outputs and the allow-list `case`, but not the
 * build matrix. Dispatching `apps=admin` was accepted, resolved to admin=true,
 * matched no matrix entry, built nothing, skipped the deploy job — and reported
 * SUCCESS in 17 seconds. A deploy that deploys nothing and calls itself green is
 * the worst available outcome; at the only place anybody looks it is
 * indistinguishable from a real one.
 *
 * Adding the matrix entry was not enough, which is the whole argument for this
 * file: build-next has its OWN `if:` gate listing the same apps again, and a
 * matrix entry missing from it never runs. Two enumerations were out of step,
 * one behind the other, and each looked like the last one.
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
 * Apps named in build-next's own `if:` gate — a FIFTH enumeration, and the one
 * that bit after the matrix was fixed. The gate exists so that selecting only
 * `api` does not spin a runner per matrix entry to no-op; the cost of that
 * optimisation is a list that has to stay in step with the matrix, and it did
 * not. A matrix entry absent from the gate never runs at all.
 */
function buildNextGateApps(): string[] {
  const gate = yml.match(
    /name: Build \$\{\{ matrix\.app \}\}[\s\S]*?\n\s+if: \|\n([\s\S]*?)\n\s+runs-on:/,
  );
  expect(gate, "build-next job must keep an `if:` gate").toBeTruthy();
  return [
    ...(gate?.[1] ?? "").matchAll(/outputs(?:\.([a-z0-9-]+)|\['([a-z0-9-]+)'\])\s*==\s*'true'/g),
  ].map((m) => m[1] ?? m[2]);
}

/**
 * Apps the deploy job pulls a bundle back down for. The build matrix uploads
 * `bundle-${{ matrix.app }}` generically, but the download side is one hand-
 * written step per app — so a built bundle with no download step reaches the
 * upload as nothing at all: "No bundle artifacts to upload", after a green
 * build. That was the seventh enumeration to bite.
 */
function downloadedApps(): string[] {
  return [...yml.matchAll(/^\s+name: bundle-([a-z0-9-]+)\s*$/gm)].map((m) => m[1]);
}

/**
 * Apps appended to a shell accumulator by a chain of
 * `[ "…outputs.<app>" = "true" ] && VAR="$VAR <app>"` lines. There are two such
 * chains — APPS, handed to the remote script, and prune_apps, which decides
 * whose old releases get cleaned — and they are the last two enumerations.
 *
 * APPS was the one that mattered most and looked least like a bug: with admin
 * missing, dispatching apps=admin resolved APPS to the empty string, the remote
 * script's own `APPS="${APPS:-landing web …}"` default turned that into every
 * app, and the run reported `deploy complete: landing web api idp auth …`. A
 * green deploy of nine apps nobody asked for, and no admin.
 */
function accumulatorChains(variable: string): string[][] {
  // Split per `VAR=""` reset, NOT flattened. There are two APPS chains — the
  // deploy step's and the rollback step's — and a flat union hides a gap in
  // either one behind the other's completeness. That exact false pass happened
  // here: the union contained admin, the rollback chain did not.
  const blocks = yml.split(new RegExp(String.raw`^\s+${variable}=""$`, "m")).slice(1);
  const pattern = new RegExp(
    String.raw`outputs(?:\.([a-z0-9-]+)|\['([a-z0-9-]+)'\])\s*\}\}"\s*=\s*"true"\s*\]\s*&&\s*${variable}="\$${variable} `,
    "g",
  );
  const chains = blocks.map((block) => [...block.matchAll(pattern)].map((m) => m[1] ?? m[2]));
  expect(chains.length, `expected at least one ${variable} accumulator chain`).toBeGreaterThan(0);
  for (const chain of chains) {
    expect(chain.length, `a ${variable} chain parsed as empty`).toBeGreaterThan(0);
  }
  return chains;
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

/** Apps with a change-detection output on the detect-changes job. */
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

  it("every build matrix entry is named in build-next's own if gate", () => {
    const ungated = matrixApps().filter((app) => !buildNextGateApps().includes(app));
    expect(
      ungated,
      `these matrix entries are absent from the build-next \`if:\` gate, so the whole ` +
        `job is skipped and they never build no matter what selects them: ${ungated.join(", ")}`,
    ).toEqual([]);
  });

  it("every buildable app has a download step in the deploy job", () => {
    // The upload side's `bundle-${{ matrix.app }}` does not match the literal
    // pattern, so downloadedApps() sees only the hand-written per-app steps —
    // which is exactly the list this compares against.
    const missing = buildableApps().filter((app) => !downloadedApps().includes(app));
    expect(
      missing,
      `these apps build a bundle that the deploy job never downloads, so the upload ` +
        `step finds nothing and fails after a green build: ${missing.join(", ")}`,
    ).toEqual([]);
  });

  it("every buildable app reaches the remote script through APPS — in every chain", () => {
    // Both chains: the deploy step's, and the rollback step's. A gap in the
    // rollback chain means a failed deploy of that app cannot be undone.
    for (const [index, chain] of accumulatorChains("APPS").entries()) {
      const missing = buildableApps().filter((app) => !chain.includes(app));
      expect(
        missing,
        `APPS chain ${index + 1} never appends these, so selecting only one of them ` +
          `resolves APPS to empty; the remote \`\${APPS:-…}\` default then expands that ` +
          `to every app: ${missing.join(", ")}`,
      ).toEqual([]);
    }
  });

  it("every buildable app is pruned when it is the deploy target", () => {
    for (const chain of accumulatorChains("prune_apps")) {
      const missing = buildableApps().filter((app) => !chain.includes(app));
      expect(
        missing,
        `these apps never appear in prune_apps, so their old releases accumulate on a ` +
          `disk the preflight is specifically there to keep clear: ${missing.join(", ")}`,
      ).toEqual([]);
    }
  });

  it("refuses to hand an empty APPS to the remote script", () => {
    // Without this the remote `${APPS:-…}` default silently turns "nothing
    // selected" into "everything", which is how a dispatch for one app reported
    // a successful deploy of nine others.
    expect(yml).toMatch(/if \[ -z "\$APPS" \]; then\n\s+echo "::error::/);
  });

  it("admin is wired end to end", () => {
    // Named explicitly because it is the case that was broken, and because a
    // control plane silently absent from the fleet is exactly the thing it
    // exists to make visible.
    expect(matrixApps()).toContain("admin");
    for (const chain of accumulatorChains("APPS")) expect(chain).toContain("admin");
    for (const chain of accumulatorChains("prune_apps")) expect(chain).toContain("admin");
    expect(allowListApps()).toContain("admin");
    expect(resolvedOutputs()).toContain("admin");
    expect(buildNextGateApps()).toContain("admin");
    expect(downloadedApps()).toContain("admin");
    expect(yml).toContain("'apps/admin/**'");
  });
});

/**
 * The workflow hands APPS to ecs-deploy-remote.sh, which enumerates the same
 * apps another five times — an accept `case`, a pm2-name map, two iteration
 * lists, and a deploy dispatch. `admin` appeared in none of them, so even a
 * correct workflow would have uploaded a bundle to a script that iterates past
 * it in silence: no error, nothing deployed.
 *
 * The APPS *default* is intentionally excluded. It is what a bare invocation
 * deploys, and the control plane should move only when named.
 */
describe("ecs-deploy-remote.sh app closure", () => {
  const sh = readFileSync(
    resolve(process.cwd(), "infra/ops/scripts/ecs-deploy-remote.sh"),
    "utf-8",
  );

  /** Apps the script will accept in APPS at all. */
  function acceptedApps(): string[] {
    const arm = sh.match(/^\s*(\*[a-z0-9*|-]*admin[a-z0-9*|-]*)\)\s*:\s*;;/m);
    expect(arm, "ecs-deploy-remote.sh must keep the APPS validation case").toBeTruthy();
    return (arm?.[1] ?? "")
      .split("|")
      .map((p) => p.replaceAll("*", ""))
      .filter(Boolean);
  }

  function pm2MappedApps(): string[] {
    const fn = sh.match(/pm2_name_for_app\(\)\s*\{([\s\S]*?)\n\}/);
    expect(fn, "ecs-deploy-remote.sh must keep pm2_name_for_app").toBeTruthy();
    return [...(fn?.[1] ?? "").matchAll(/^\s{4}([a-z0-9-]+)\)\s*printf/gm)].map((m) => m[1]);
  }

  function iterationLists(): string[][] {
    const lists = [...sh.matchAll(/^\s*for app in ([a-z0-9 -]+); do$/gm)].map((m) =>
      m[1].trim().split(/\s+/),
    );
    expect(lists.length, "expected the two `for app in …` iteration lists").toBeGreaterThanOrEqual(
      2,
    );
    return lists;
  }

  function dispatchedApps(): string[] {
    return [...sh.matchAll(/^\s+([a-z0-9-]+)\)\s+deploy_one\s/gm)].map((m) => m[1]);
  }

  const dispatchable = allowListApps();

  it("accepts every app the workflow can dispatch", () => {
    const missing = dispatchable.filter((app) => !acceptedApps().includes(app));
    expect(
      missing,
      `ecs-deploy-remote.sh rejects these, so the deploy fails at the validation ` +
        `case after the bundle has already been uploaded: ${missing.join(", ")}`,
    ).toEqual([]);
  });

  it("maps every dispatchable app to a pm2 process name", () => {
    const missing = dispatchable.filter((app) => !pm2MappedApps().includes(app));
    expect(missing, `pm2_name_for_app calls fail() for these: ${missing.join(", ")}`).toEqual([]);
  });

  it("iterates over every dispatchable app in both loops", () => {
    for (const [index, list] of iterationLists().entries()) {
      const missing = dispatchable.filter((app) => !list.includes(app));
      expect(
        missing,
        `iteration list ${index + 1} skips these silently — no error, nothing ` +
          `deployed: ${missing.join(", ")}`,
      ).toEqual([]);
    }
  });

  it("has a deploy_one dispatch arm for every dispatchable app", () => {
    const missing = dispatchable.filter((app) => !dispatchedApps().includes(app));
    expect(missing, `no deploy_one arm for: ${missing.join(", ")}`).toEqual([]);
  });
});
