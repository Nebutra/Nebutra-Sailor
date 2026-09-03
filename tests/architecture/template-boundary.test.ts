import { execFileSync } from "node:child_process";
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { basename, dirname, join, relative } from "node:path";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { getSailorStatus } from "../../scripts/sailor-version.mjs";

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
 * The residue ratchet: every text file in the built template is read once and
 * tested against every IDENTIFIER. What carries one is pinned, per identifier,
 * in tests/architecture/template-residue.baseline.json — generated once from
 * the build and committed. The baseline may only shrink: a shipped file
 * outside it fails ("move it or .templateignore it"), and an entry that no
 * longer matches fails ("delete the entry"). The one carve-out is a rule, not
 * an entry: package.json `repository` / `bugs` / `homepage` and
 * .changeset/config.json may point at the source repo — see slugScanText.
 *
 * Host identifiers also match their regex-escaped form (`api\.nebutra\.com`),
 * the shape a URL matcher takes in shipped source: apps/web/sentry.client.config.ts
 * pointed Sentry trace headers at Nebutra's API that way, and the plain
 * literals never saw it.
 *
 * Local runs scan whatever the build copied from disk, minus the files
 * `git check-ignore` reports: the mirror is built by CI from a clean checkout,
 * so a gitignored local file (a scratch note, a *.tsbuildinfo, an
 * apps/web/.env.development) never ships and must not fail here. An untracked
 * file that is not ignored is scanned — it ships the moment it is committed.
 * CI is authoritative. Text files over MAX_SCAN_BYTES are left unread and
 * reported, not dropped: KNOWN_OVERSIZED pins the lockfile as the one such
 * file, so the blind spot is declared rather than silent.
 */

const REPO_ROOT = join(import.meta.dirname, "../..");
const BUILD_TIMEOUT_MS = 240_000;
const BASELINE_REL = "tests/architecture/template-residue.baseline.json";
const BASELINE_PATH = join(REPO_ROOT, BASELINE_REL);

/**
 * Every literal that is true for Nebutra's deployment or its source repo and
 * for no other scaffold. Keys name the identifier in the baseline file; values
 * are tested against each shipped text file. Dotted hosts and the IP accept
 * an optional backslash before each dot (`\\?\.`), so the escaped form inside
 * a regex literal counts too. No `g` flags — `test()` on a global regex keeps
 * `lastIndex` between calls.
 */
const IDENTIFIERS = {
  "nebutra.com": /\bnebutra\\?\.com\b/i, // the zone and every subdomain of it
  "api.nebutra.com": /\bapi\\?\.nebutra\\?\.com\b/i, // the gateway host, counted on its own
  "nebutra-*.fly.dev": /\bnebutra-[\w-]*\\?\.fly\\?\.dev\b/i, // Fly apps in Nebutra's org
  "nebutra-gateway": /\bnebutra-gateway\b/i, // Fly app, `-edge` Worker, `-secret` env
  "nebutra-auth": /\bnebutra-auth\b/i,
  "nebutra-web": /\bnebutra-web\b/i, // `\b` keeps the nebutra-web3 container name out
  "106.15.4.31": /\b106\\?\.15\\?\.4\\?\.31\b/, // the ECS origin — numeric, case-insensitivity is a no-op
  team_c6eOa4: /\bteam_c6eOa4/i, // the Vercel team id (prefix — the full id is longer)
  "next-seagull": /\bnext-seagull\b/i,
  "Nebutra/Nebutra-Sailor": /\bNebutra\/Nebutra-Sailor\b/i, // the source-repo slug
} satisfies Record<string, RegExp>;
type Identifier = keyof typeof IDENTIFIERS;
const IDENTIFIER_NAMES = Object.keys(IDENTIFIERS) as Identifier[];

/**
 * Identifiers no shipped workflow may carry, baseline or not — every survivor
 * on that surface must be generic. The source-repo slug is the one exception:
 * scorecard.yml links its results viewer by slug, and the whole-tree baseline
 * already tracks that file.
 */
const WORKFLOW_FORBIDDEN_IDENTIFIERS = IDENTIFIER_NAMES.filter(
  (id) => id !== "Nebutra/Nebutra-Sailor",
);

/** package.json fields that may legitimately point at the source repo. */
const SLUG_FIELDS_ALLOWED = ["repository", "bugs", "homepage"] as const;

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

/**
 * Name patterns that mark a workflow as Nebutra-instance work even when it
 * carries no forbidden literal (ops-kuanlan-r2-uploads.yml shipped to the
 * mirror on 2026-09-02 that way). Anything matching must be listed in
 * .templateignore. A generic kit gets a generic name; instance work says so.
 */
const INSTANCE_WORKFLOW_NAME_PATTERN =
  /^(ops-|point-|bootstrap-|deploy-kuanlan|deploy-carina)|kuanlan|carina|forge|pebble|typelens|new-api|dns-leak/;

/** Secret-free workflows a scaffolded project should keep. */
const GENERIC_WORKFLOWS = [
  "ci.yml",
  "clean-install.yml",
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

/**
 * Shipped text files above MAX_SCAN_BYTES, which the scan leaves unread. The
 * lockfile is the only one today — and the one place a git dependency on the
 * source repo or a Nebutra-hosted registry URL would land, so it sits outside
 * the ratchet by the size cap, on record here. A new one must be classified:
 * add it here or .templateignore it.
 */
const KNOWN_OVERSIZED = ["pnpm-lock.yaml"];

/** identifier → the shipped files (posix paths from the template root) that carry it. */
type Residue = Record<Identifier, Set<string>>;
/** The same shape on disk: identifier → sorted, duplicate-free path list. */
type Baseline = Record<Identifier, string[]>;
/** What one pass found: carriers per identifier, plus the text files the size cap left unread. */
type Scan = { residue: Residue; oversized: string[] };

let out = "";
let residue: Residue;
let oversized: string[] = [];

/** Every regular file under `root`, with its posix path relative to `root`. */
function listFiles(root: string): { abs: string; rel: string }[] {
  const files: { abs: string; rel: string }[] = [];
  const walk = (dir: string) => {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      const abs = join(dir, entry.name);
      if (entry.isDirectory()) walk(abs);
      else if (entry.isFile()) files.push({ abs, rel: relative(root, abs).split("\\").join("/") });
    }
  };
  walk(root);
  return files;
}

/** Files above this are skipped: nothing that size is a workflow, manifest, doc or source file. */
const MAX_SCAN_BYTES = 1024 * 1024;

/** A file's text, or why the scan leaves it unread. */
type Contents = { text: string } | { skip: "binary" | "oversized" | "unreadable" };

function readContents(abs: string): Contents {
  // Read first, then bound: a stat-then-read pair is a check/use race (CodeQL js/file-system-race).
  let buf: Buffer;
  try {
    buf = readFileSync(abs);
  } catch {
    return { skip: "unreadable" };
  }
  if (buf.subarray(0, 8192).includes(0)) return { skip: "binary" };
  if (buf.length > MAX_SCAN_BYTES) return { skip: "oversized" };
  return { text: buf.toString("utf8") };
}

/**
 * The subset of `rels` (paths from the repo root) that .gitignore rules cover.
 * The built template is a straight copy of the source tree, so a template
 * path is a source path. Tracked files are never reported; build-injected
 * ones (NOTICE.md, .sailor-template.json) match no rule. If git is missing
 * or exits non-zero — exit 1 is "nothing ignored" — everything is scanned,
 * the strict direction.
 */
function gitIgnored(rels: string[]): ReadonlySet<string> {
  if (rels.length === 0) return new Set();
  try {
    const stdout = execFileSync("git", ["check-ignore", "--stdin", "-z"], {
      cwd: REPO_ROOT,
      input: rels.join("\0"),
      stdio: ["pipe", "pipe", "ignore"],
      maxBuffer: 64 * 1024 * 1024,
    });
    return new Set(stdout.toString("utf8").split("\0").filter(Boolean));
  } catch {
    return new Set();
  }
}

/**
 * The text a file is tested against for the source-repo slug. A package.json
 * is tested with its `repository` / `bugs` / `homepage` removed, so the slug
 * anywhere else in it still counts; .changeset/config.json is exempt outright
 * (its `repo` is what makes changelog links resolve). Returns null for "skip".
 */
function slugScanText(rel: string, text: string): string | null {
  if (rel === ".changeset/config.json") return null;
  if (basename(rel) !== "package.json") return text;
  let pkg: unknown;
  try {
    pkg = JSON.parse(text);
  } catch {
    return text;
  }
  if (typeof pkg !== "object" || pkg === null || Array.isArray(pkg)) return text;
  const rest: Record<string, unknown> = { ...(pkg as Record<string, unknown>) };
  for (const field of SLUG_FIELDS_ALLOWED) delete rest[field];
  return JSON.stringify(rest);
}

function emptyResidue(): Residue {
  return Object.fromEntries(IDENTIFIER_NAMES.map((id) => [id, new Set<string>()])) as Residue;
}

/**
 * One pass over `root`: every text file is read once and tested against every
 * identifier. `skipRels` sees the whole path list first and names the files to
 * leave unread (the gitignored ones, for the real build).
 */
function scanResidue(
  root: string,
  skipRels: (rels: string[]) => ReadonlySet<string> = () => new Set(),
): Scan {
  const found = emptyResidue();
  const large: string[] = [];
  if (!existsSync(root)) return { residue: found, oversized: large };
  const files = listFiles(root);
  const skip = skipRels(files.map((f) => f.rel));
  for (const { abs, rel } of files) {
    if (skip.has(rel)) continue;
    const contents = readContents(abs);
    if ("skip" in contents) {
      if (contents.skip === "oversized") large.push(rel);
      continue;
    }
    for (const id of IDENTIFIER_NAMES) {
      const haystack =
        id === "Nebutra/Nebutra-Sailor" ? slugScanText(rel, contents.text) : contents.text;
      if (haystack !== null && IDENTIFIERS[id].test(haystack)) found[id].add(rel);
    }
  }
  return { residue: found, oversized: large.sort() };
}

function readBaseline(): Baseline {
  return JSON.parse(readFileSync(BASELINE_PATH, "utf8")) as Baseline;
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
  ({ residue, oversized } = scanResidue(out, gitIgnored));
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

  it("strips the residue baseline itself — it names every identifier it pins", () => {
    expect(ignore, `.templateignore must list ${BASELINE_REL}`).toContain(BASELINE_REL);
  });
});

describe("template boundary — the built template", () => {
  it("stamps the sailor version and its convergence into the marker, so the mirror tag and the tree agree", () => {
    const marker = JSON.parse(readFileSync(join(out, ".sailor-template.json"), "utf8"));
    const status = getSailorStatus(REPO_ROOT);
    expect(marker.type).toBe("sailor-template-mirror");
    expect(marker.sailorVersion).toBe(status.version);
    // sync-template.yml tags v<x> only when this is true; a string "false"
    // would pass a truthiness check, so the type is pinned.
    expect(typeof marker.sailorVersionConverged).toBe("boolean");
    expect(marker.sailorVersionConverged).toBe(status.converged);
  });

  it("ships an empty changesets fixed group, so a scaffold that prunes a member can still run `pnpm changeset`", () => {
    const source = JSON.parse(readFileSync(join(REPO_ROOT, ".changeset/config.json"), "utf8"));
    const shipped = JSON.parse(readFileSync(join(out, ".changeset/config.json"), "utf8"));
    // The source carries the lockstep; the proof is that the build removed it.
    expect(source.fixed).toHaveLength(1);
    expect(source.fixed[0].length).toBeGreaterThan(30);
    expect(shipped.fixed).toEqual([]);
    // Nothing else about the config changes.
    const { fixed: _sourceFixed, ...sourceRest } = source;
    const { fixed: _shippedFixed, ...shippedRest } = shipped;
    expect(shippedRest).toEqual(sourceRest);
  });

  it("ships no test that reads what the template strips", () => {
    const sourceOnly = [
      "tests/architecture/sailor-version.test.ts",
      "tests/architecture/template-boundary.test.ts",
      ".github/workflows/sync-template.yml",
      "TEMPLATE.md",
    ];
    const leaked = sourceOnly.filter((p) => existsSync(join(out, p)));
    expect(leaked, `source-only files in the built template: ${leaked.join(", ")}`).toEqual([]);
  });

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
    const byName = existsSync(dir)
      ? readdirSync(dir).filter((w) => INSTANCE_WORKFLOW_NAME_PATTERN.test(w))
      : [];
    expect(byName, "instance-named workflows must be in .templateignore").toEqual([]);
    expect(leaked, `Nebutra-only workflows in the built template: ${leaked.join(", ")}`).toEqual(
      [],
    );
    const missing = GENERIC_WORKFLOWS.filter((w) => !existsSync(join(dir, w)));
    expect(missing, `generic workflows stripped from the template: ${missing.join(", ")}`).toEqual(
      [],
    );
  });

  it("ships only workflows free of Nebutra instance literals", () => {
    const hits = new Map<string, string[]>();
    for (const id of WORKFLOW_FORBIDDEN_IDENTIFIERS) {
      for (const rel of residue[id]) {
        if (!rel.startsWith(".github/workflows/")) continue;
        hits.set(rel, [...(hits.get(rel) ?? []), id]);
      }
    }
    const report = [...hits].map(([rel, ids]) => `  - ${rel}: ${ids.join(", ")}`).sort();
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
});

describe("template boundary — residue baseline (shrink-only)", () => {
  it("is well-formed: one sorted, duplicate-free path list per identifier", () => {
    const baseline = readBaseline();
    expect(
      Object.keys(baseline).sort(),
      `${BASELINE_REL} keys must be exactly the identifiers this test scans for`,
    ).toEqual([...IDENTIFIER_NAMES].sort());
    for (const id of IDENTIFIER_NAMES) {
      const list = baseline[id];
      expect(Array.isArray(list), `${BASELINE_REL}["${id}"] must be an array`).toBe(true);
      expect(
        [...new Set(list)].sort(),
        `${BASELINE_REL}["${id}"] must be sorted and free of duplicates`,
      ).toEqual(list);
    }
  });

  it("ships no file outside the baseline that carries a Nebutra identifier", () => {
    const baseline = readBaseline();
    const fresh: string[] = [];
    for (const id of IDENTIFIER_NAMES) {
      const known = new Set(baseline[id] ?? []);
      for (const rel of [...residue[id]].sort()) {
        if (!known.has(rel)) fresh.push(`  - ${rel}  (${id})`);
      }
    }
    expect(
      fresh,
      `${fresh.length} shipped file(s) carry a Nebutra identifier and are not in ${BASELINE_REL} — ` +
        "move each into ops/, docs/ops/nebutra/ or tests/architecture/nebutra/, or .templateignore it. " +
        `Do not add baseline entries; the list may only shrink:\n${fresh.join("\n")}`,
    ).toEqual([]);
  });

  it("has no entry that stopped matching — the list may only shrink", () => {
    const baseline = readBaseline();
    const fixed: string[] = [];
    for (const id of IDENTIFIER_NAMES) {
      for (const rel of baseline[id] ?? []) {
        if (!residue[id].has(rel)) fixed.push(`  - ${rel}  (${id})`);
      }
    }
    const noun = fixed.length === 1 ? "entry no longer matches" : "entries no longer match";
    expect(
      fixed,
      `${fixed.length} ${BASELINE_REL} ${noun} the built template — delete the entry, ` +
        `the list may only shrink:\n${fixed.join("\n")}`,
    ).toEqual([]);
  });

  it("leaves only the lockfile unread for size — anything else over 1 MiB must be classified", () => {
    expect(
      oversized,
      `shipped text files over ${MAX_SCAN_BYTES} bytes are outside the ratchet; ` +
        "add each to KNOWN_OVERSIZED or .templateignore it",
    ).toEqual(KNOWN_OVERSIZED);
  });
});

describe("template boundary — residue scanner rules", () => {
  let fixture = "";

  const write = (rel: string, content: string | Buffer) => {
    const abs = join(fixture, rel);
    mkdirSync(dirname(abs), { recursive: true });
    writeFileSync(abs, content);
  };

  beforeAll(() => {
    fixture = mkdtempSync(join(tmpdir(), "sailor-template-residue-"));
    write("docs/host.md", "curl https://api.nebutra.com/health");
    write("docs/zone.md", "mail is user@nebutra.com; docs at docs.nebutra.com");
    write("docs/fly.md", "app nebutra-gateway-edge, origin nebutra-web.fly.dev, ip 106.15.4.31");
    write("docs/near-miss.md", "nebutra-web3 nebutra.community 106.15.4.310 @nebutra/webhooks");
    // The regex-escaped host, as sentry.client.config.ts wrote it — and the escaped near-misses.
    write("src/sentry.ts", "tracePropagationTargets: [/^https:\\/\\/api\\.nebutra\\.com/]");
    write(
      "src/matchers.ts",
      "/nebutra-web\\.fly\\.dev$/ /^106\\.15\\.4\\.31$/ /nebutra\\.community/",
    );
    write(
      "package.json",
      JSON.stringify({
        name: "x",
        repository: { url: "git+https://github.com/Nebutra/Nebutra-Sailor.git" },
        bugs: { url: "https://github.com/Nebutra/Nebutra-Sailor/issues" },
        homepage: "https://github.com/Nebutra/Nebutra-Sailor#readme",
      }),
    );
    write(
      "apps/x/package.json",
      JSON.stringify({
        name: "y",
        repository: "Nebutra/Nebutra-Sailor",
        description: "see github.com/nebutra/nebutra-sailor",
      }),
    );
    write(
      ".changeset/config.json",
      JSON.stringify({ changelog: ["x", { repo: "Nebutra/Nebutra-Sailor" }] }),
    );
    write("docs/slug.md", "open PRs against Nebutra/Nebutra-Sailor");
    write(
      "assets/blob.bin",
      Buffer.concat([Buffer.from([0, 1, 2]), Buffer.from("api.nebutra.com")]),
    );
    write("assets/huge.txt", `${"x".repeat(MAX_SCAN_BYTES)}api.nebutra.com`);
  });

  afterAll(() => {
    if (fixture) rmSync(fixture, { recursive: true, force: true });
  });

  it("reports each identifier's carriers, subdomains and escaped forms included, and nothing adjacent", () => {
    const found = scanResidue(fixture).residue;
    expect([...found["api.nebutra.com"]].sort()).toEqual(["docs/host.md", "src/sentry.ts"]);
    expect([...found["nebutra.com"]].sort()).toEqual([
      "docs/host.md",
      "docs/zone.md",
      "src/sentry.ts",
    ]);
    expect([...found["nebutra-gateway"]]).toEqual(["docs/fly.md"]);
    expect([...found["nebutra-*.fly.dev"]].sort()).toEqual(["docs/fly.md", "src/matchers.ts"]);
    expect([...found["nebutra-web"]].sort()).toEqual(["docs/fly.md", "src/matchers.ts"]);
    expect([...found["106.15.4.31"]].sort()).toEqual(["docs/fly.md", "src/matchers.ts"]);
    expect([...found["nebutra-auth"]]).toEqual([]);
    expect([...found.team_c6eOa4]).toEqual([]);
    expect([...found["next-seagull"]]).toEqual([]);
  });

  it("skips binary files, and reports rather than hides the text files over 1 MiB", () => {
    const scan = scanResidue(fixture);
    const all = new Set(IDENTIFIER_NAMES.flatMap((id) => [...scan.residue[id]]));
    expect(all.has("assets/blob.bin")).toBe(false);
    expect(all.has("assets/huge.txt")).toBe(false);
    expect(scan.oversized).toEqual(["assets/huge.txt"]);
  });

  it("leaves unread whatever the caller names, so a gitignored local file cannot fail the build scan", () => {
    const found = scanResidue(fixture, (rels) => {
      expect(rels).toContain("docs/host.md");
      return new Set(["docs/host.md"]);
    }).residue;
    expect([...found["api.nebutra.com"]]).toEqual(["src/sentry.ts"]);
  });

  it("asks git which source paths are ignored — tracked and build-injected paths never are", () => {
    const ignored = gitIgnored([
      "apps/web/.env.local", // apps/web/.gitignore: `.env*`
      "apps/web/tsconfig.tsbuildinfo", // apps/web/.gitignore: `*.tsbuildinfo`
      "package.json", // tracked
      "NOTICE.md", // injected by the build, absent from the source tree
      ".sailor-template.json",
    ]);
    expect([...ignored].sort()).toEqual(["apps/web/.env.local", "apps/web/tsconfig.tsbuildinfo"]);
  });

  it("lets package.json repository/bugs/homepage and .changeset/config.json carry the slug, nothing else", () => {
    const found = scanResidue(fixture).residue;
    expect([...found["Nebutra/Nebutra-Sailor"]].sort()).toEqual([
      "apps/x/package.json", // slug in `description` still counts
      "docs/slug.md",
    ]);
  });
});
