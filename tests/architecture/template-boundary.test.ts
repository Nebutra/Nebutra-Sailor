import { execFileSync } from "node:child_process";
import { existsSync, mkdtempSync, readdirSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, relative } from "node:path";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

/**
 * Nebutra-Sailor is two things in one tree: the source of the public Sailor
 * template (mirrored to Nebutra/Sailor-Template by sync-template.yml) and the
 * codebase behind one deployment of it, Nebutra's own. The mirror used to ship
 * Nebutra-only ops — DNS-pointing workflows, Fly manifests for Nebutra's org,
 * runbooks with Nebutra's invoices, tests asserting Nebutra's hosts — because
 * .templateignore was a file-by-file denylist that nobody extended.
 *
 * TEMPLATE.md now declares three homes for instance content (ops/,
 * docs/ops/nebutra/, tests/architecture/nebutra/) and a rule for the surfaces
 * that have no directory split (workflows, Fly manifests): ship only what has
 * no Nebutra instance literal. This file is the guard. It builds the template
 * the same way sync-template.yml does — scripts/template-build.ts into a temp
 * dir — and inspects the output, so it tests the artifact, not the intent.
 *
 * Why a real build rather than a static read of .templateignore: the build
 * also strips Prisma models, prunes empty dirs and injects NOTICE.md; the ignore
 * library's matching semantics (anchoring, trailing slashes, negation) are the
 * exact thing a static reimplementation gets subtly wrong. The build takes
 * ~15s locally; beforeAll has its own timeout for slower CI runners.
 *
 * Two tiers of literal:
 *  - INSTANCE_IDENTIFIERS (an IP, a Vercel team id, a project name) must appear
 *    nowhere in the output. What still does is pinned in KNOWN_RESIDUE, which
 *    may only shrink — a new carrier fails, and a fixed carrier must be removed.
 *  - "nebutra.com" / "nebutra-gateway" are the template's own default brand and
 *    gateway name across ~400 files, so they are asserted only on the workflow
 *    surface, where every survivor must be generic.
 */

const REPO_ROOT = join(import.meta.dirname, "../..");
const BUILD_TIMEOUT_MS = 240_000;

/** Identifiers that are true for exactly one deployment and nothing else. */
const INSTANCE_IDENTIFIERS = ["106.15.4.31", "team_c6eOa4", "next-seagull"] as const;
type InstanceIdentifier = (typeof INSTANCE_IDENTIFIERS)[number];

/**
 * Files in the built template that still carry an instance identifier.
 * Shrink-only: delete the entry when the carrier is moved or generalised.
 * Do not add to it — move the file into ops/, docs/ops/nebutra/ or
 * tests/architecture/nebutra/ instead, or list it in .templateignore.
 */
const KNOWN_RESIDUE: Record<InstanceIdentifier, readonly string[]> = {
  "106.15.4.31": [
    "infra/iac/cloudflare/README.md",
    "infra/iac/ecs/ecosystem.config.cjs",
    "infra/ops/dns/topology.defaults.yaml",
    "infra/runtime/nginx/README.md",
    "packages/ai/forge-dns-leak/src/authority.ts",
    "packages/ai/forge-dns-leak/src/cli.ts",
  ],
  team_c6eOa4: [],
  "next-seagull": [],
};

/** Literals no shipped workflow may carry. */
const WORKFLOW_FORBIDDEN_LITERALS = ["nebutra.com", "nebutra-gateway", ...INSTANCE_IDENTIFIERS];

/** The three declared homes for instance content, plus the dormant deploy kits. */
const INSTANCE_DIRECTORIES = [
  "ops",
  "docs/ops/nebutra",
  "tests/architecture/nebutra",
  "infra/iac/k8s",
  "infra/iac/railway",
];

/** Workflows hard-wired to Nebutra hosts, Fly apps, the ECS IP or the Vercel team. */
const NEBUTRA_ONLY_WORKFLOWS = [
  "bootstrap-forge-dns-leak.yml",
  "carina-upstream-sync.yml",
  "deploy-auth-cloudflare.yml",
  "deploy-ecs.yml",
  "deploy-fly-gateway.yml",
  "deploy-fly.yml",
  "deploy-gateway.yml",
  "deploy-kuanlan-nginx.yml",
  "deploy-kuanlan-vercel.yml",
  "issue-fly-certs.yml",
  "ops-cloudflare-whoami.yml",
  "ops-sync-auth-vercel-db.yml",
  "ops-vm-reclaim.yml",
  "ops-vm-triage.yml",
  "point-design-dns.yml",
  "point-forge-dns.yml",
  "point-kuanlan-dns.yml",
  "point-leak-dns.yml",
  "point-open-dns.yml",
  "point-status-dns.yml",
  "sync-template.yml",
  "tmp-vercel-git-deploy-docs.yml",
];

/** Secret-free workflows a scaffolded project should keep. */
const GENERIC_WORKFLOWS = [
  "ci.yml",
  "codeql.yml",
  "dead-code.yml",
  "dependabot-automerge.yml",
  "dependency-review.yml",
  "labeler.yml",
  "scorecard.yml",
  "secrets-scan.yml",
  "security-scan.yml",
  "stale.yml",
];

/** Generic files the `/ops/` anchoring and the directory rules must leave alone. */
const PRODUCT_SURVIVORS = [
  "package.json",
  "apps/web/package.json",
  "backends/gateway/package.json",
  "packages/ops/create-sailor/package.json",
  "infra/ops/scripts/check-env.ts",
  "infra/ops/dns/topology.defaults.yaml",
  "infra/iac/terraform/main.tf",
  "docs/ops/cloudflare-ci-token.md",
  "docs/ops/cost-guardrails.md",
  "docs/ops/enterprise-sso.md",
  "docs/ops/postgres-to-planetscale-via-cloudflare.md",
  "tests/architecture/dependency-flow.test.ts",
  "tests/architecture/doc-claims-drift.test.ts",
];

let out = "";

function walkFiles(dir: string, visit: (abs: string, rel: string) => void): void {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const abs = join(dir, entry.name);
    if (entry.isDirectory()) walkFiles(abs, visit);
    else if (entry.isFile()) visit(abs, relative(out, abs).split("\\").join("/"));
  }
}

const MAX_SCAN_BYTES = 8 * 1024 * 1024;

function readText(abs: string): string | null {
  // Read first, then bound: a stat-then-read pair is a check/use race (CodeQL js/file-system-race).
  let buf: Buffer;
  try {
    buf = readFileSync(abs);
  } catch {
    return null;
  }
  if (buf.length > MAX_SCAN_BYTES) return null;
  if (buf.subarray(0, 8192).includes(0)) return null; // binary
  return buf.toString("utf8");
}

/** rel path → set of literals it contains, for every text file under `root`. */
function scan(root: string, literals: readonly string[]): Map<string, Set<string>> {
  const hits = new Map<string, Set<string>>();
  if (!existsSync(root)) return hits;
  walkFiles(root, (abs, rel) => {
    const text = readText(abs);
    if (text === null) return;
    for (const literal of literals) {
      if (!text.includes(literal)) continue;
      const set = hits.get(rel) ?? new Set<string>();
      set.add(literal);
      hits.set(rel, set);
    }
  });
  return hits;
}

function nebutraFlyManifests(): string[] {
  const dir = join(REPO_ROOT, "infra/fly");
  return readdirSync(dir)
    .filter((name) => name.endsWith(".toml"))
    .filter((name) => /^app\s*=\s*"nebutra-/m.test(readFileSync(join(dir, name), "utf8")))
    .map((name) => `infra/fly/${name}`)
    .sort();
}

beforeAll(() => {
  out = mkdtempSync(join(tmpdir(), "sailor-template-boundary-"));
  try {
    execFileSync(
      process.execPath,
      ["--import", "tsx", "scripts/template-build.ts", `--out=${out}`],
      {
        cwd: REPO_ROOT,
        stdio: ["ignore", "pipe", "pipe"],
        timeout: BUILD_TIMEOUT_MS - 10_000,
        maxBuffer: 64 * 1024 * 1024,
      },
    );
  } catch (error) {
    const stderr = (error as { stderr?: Buffer }).stderr?.toString("utf8") ?? "";
    throw new Error(`scripts/template-build.ts failed:\n${stderr}`, { cause: error });
  }
  if (!existsSync(join(out, ".sailor-template.json"))) {
    throw new Error(`template build produced no .sailor-template.json marker in ${out}`);
  }
}, BUILD_TIMEOUT_MS);

afterAll(() => {
  if (out) rmSync(out, { recursive: true, force: true });
});

describe("template boundary — .templateignore declares it", () => {
  const ignore = readFileSync(join(REPO_ROOT, ".templateignore"), "utf8").split("\n");

  it("has one directory rule per declared instance home, anchored where it must be", () => {
    for (const rule of ["/ops/", "docs/ops/nebutra/", "tests/architecture/nebutra/"]) {
      expect(ignore, `.templateignore lost the directory rule \`${rule}\``).toContain(rule);
    }
    // A bare `ops/` matches at any depth and would strip packages/ops and infra/ops.
    expect(ignore, "an unanchored `ops/` rule would strip packages/ops/").not.toContain("ops/");
  });

  it("lists every Fly manifest whose app is in Nebutra's org, so a new one must be classified", () => {
    const manifests = nebutraFlyManifests();
    expect(
      manifests.length,
      "no infra/fly/*.toml with app = nebutra-… — probe is broken",
    ).toBeGreaterThan(5);
    const missing = manifests.filter((m) => !ignore.includes(m));
    expect(
      missing,
      `Fly manifests bound to Nebutra's org that .templateignore does not list:\n${missing
        .map((m) => `  - ${m}`)
        .join("\n")}`,
    ).toEqual([]);
  });

  it("points at homes that exist, so the rules are not dead", () => {
    for (const dir of ["ops/nebutra/README.md", "docs/ops/nebutra", "tests/architecture/nebutra"]) {
      expect(existsSync(join(REPO_ROOT, dir)), `${dir} is missing from the source repo`).toBe(true);
    }
  });
});

describe("template boundary — the built template", () => {
  it("has none of the instance directories", () => {
    const leaked = INSTANCE_DIRECTORIES.filter((dir) => existsSync(join(out, dir)));
    expect(
      leaked,
      `instance directories present in the built template: ${leaked.join(", ")}`,
    ).toEqual([]);
  });

  it("keeps the product surfaces the `/ops/` anchoring and directory rules sit next to", () => {
    const missing = PRODUCT_SURVIVORS.filter((p) => !existsSync(join(out, p)));
    expect(missing, `product files stripped by the boundary rules: ${missing.join(", ")}`).toEqual(
      [],
    );
  });

  it("ships no Nebutra-only workflow and every generic one", () => {
    const dir = join(out, ".github/workflows");
    const leaked = NEBUTRA_ONLY_WORKFLOWS.filter((w) => existsSync(join(dir, w)));
    expect(leaked, `Nebutra-only workflows in the built template: ${leaked.join(", ")}`).toEqual(
      [],
    );
    const missing = GENERIC_WORKFLOWS.filter((w) => !existsSync(join(dir, w)));
    expect(missing, `generic workflows stripped from the template: ${missing.join(", ")}`).toEqual(
      [],
    );
  });

  it("ships only workflows free of Nebutra instance literals", () => {
    const hits = scan(join(out, ".github/workflows"), WORKFLOW_FORBIDDEN_LITERALS);
    const report = [...hits].map(([rel, set]) => `  - ${rel}: ${[...set].join(", ")}`).sort();
    expect(
      report,
      `shipped workflows carry Nebutra instance literals — list them in .templateignore:\n${report.join("\n")}`,
    ).toEqual([]);
  });

  it("ships no Fly manifest bound to Nebutra's org, nor the carina / dns-leak build files", () => {
    const leaked = [
      ...nebutraFlyManifests(),
      "infra/fly/Dockerfile.carina",
      "infra/fly/Dockerfile.dns-leak",
      "infra/fly/carina.nginx.conf",
    ].filter((p) => existsSync(join(out, p)));
    expect(leaked, `Nebutra Fly files in the built template: ${leaked.join(", ")}`).toEqual([]);
  });

  it("carries no Nebutra instance identifier outside the shrink-only residue list", () => {
    const hits = scan(out, INSTANCE_IDENTIFIERS);
    for (const literal of INSTANCE_IDENTIFIERS) {
      const carriers = [...hits]
        .filter(([, set]) => set.has(literal))
        .map(([rel]) => rel)
        .sort();
      const known = [...KNOWN_RESIDUE[literal]].sort();
      const fresh = carriers.filter((c) => !known.includes(c));
      const fixed = known.filter((k) => !carriers.includes(k));
      expect(
        fresh,
        `"${literal}" now ships in the template from files not in KNOWN_RESIDUE — move them into ` +
          `ops/, docs/ops/nebutra/ or tests/architecture/nebutra/, or list them in .templateignore:\n${fresh
            .map((f) => `  - ${f}`)
            .join("\n")}`,
      ).toEqual([]);
      expect(
        fixed,
        `"${literal}" no longer ships from these files — delete them from KNOWN_RESIDUE so the list shrinks:\n${fixed
          .map((f) => `  - ${f}`)
          .join("\n")}`,
      ).toEqual([]);
    }
  });
});
