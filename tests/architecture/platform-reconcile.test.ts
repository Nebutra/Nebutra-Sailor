import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import { describe, expect, it, onTestFinished } from "vitest";

// scripts/ops/platform-reconcile.mjs is the read-only engine that compares an
// expectations file (ops/<brand>/platform-expected.json) with what Vercel, Fly,
// GitHub and Cloudflare actually report. These tests drive it with a fake fetch
// and a fake exec, so nothing here touches a provider or needs a token.

const root = process.cwd();
const enginePath = join(root, "scripts/ops/platform-reconcile.mjs");
const nebutraPath = join(root, "ops/nebutra/platform-expected.json");
const templatePath = join(
  root,
  "packages/ops/create-sailor/templates/infra/ops/platform-expected.example.json",
);
const workflowPath = join(root, ".github/workflows/platform-reconcile.yml");

type Row = {
  provider: string;
  target: string;
  check: string;
  status: "ok" | "drift" | "skipped" | "error";
  expected: string;
  actual: string;
  detail: string;
};
type Summary = { ok: number; drift: number; skipped: number; error: number; total: number };
type Declaration = {
  vercel?: {
    projects: Array<{
      name: string;
      buildMachineType?: string;
      ignoreBuildStep?: string;
      gitLinked?: boolean;
      envNotSensitive?: Record<string, string[]>;
    }>;
  };
  fly?: { apps: Array<{ name: string; secretsPresent?: string[]; secretsAbsent?: string[] }> };
  github?: { repo?: string; variables?: Record<string, string>; branchProtection?: BranchRule[] };
  cloudflare?: { workers: Array<{ name: string; bindings: Array<{ name: string }> }> };
};
type BranchRule = {
  branch: string;
  requiredStatusChecks?: string[];
  strict?: boolean;
  enforceAdmins?: boolean;
  requiredApprovingReviewCount?: number | null;
};
const PROTECTION_FIELDS = [
  "requiredStatusChecks",
  "strict",
  "enforceAdmins",
  "requiredApprovingReviewCount",
] as const;

// When every provider answers, the engine emits one row per declared
// expectation. Counting them from the declaration keeps these tests from
// breaking when a line is added to ops/nebutra/platform-expected.json.
function declaredChecks(doc: Declaration): number {
  let count = 0;
  for (const project of doc.vercel?.projects ?? []) {
    count += Number(project.buildMachineType !== undefined);
    count += Number(project.ignoreBuildStep !== undefined);
    count += Number(project.gitLinked !== undefined);
    for (const keys of Object.values(project.envNotSensitive ?? {})) count += keys.length;
  }
  for (const app of doc.fly?.apps ?? []) {
    count += (app.secretsPresent?.length ?? 0) + (app.secretsAbsent?.length ?? 0);
  }
  count += declaredVariables(doc);
  count += declaredProtectionChecks(doc);
  for (const worker of doc.cloudflare?.workers ?? []) count += worker.bindings.length;
  return count;
}

function declaredVariables(doc: Declaration): number {
  return Object.keys(doc.github?.variables ?? {}).length;
}

function declaredBranches(doc: Declaration): number {
  return (doc.github?.branchProtection ?? []).length;
}

// One row per declared field of each branch rule, once the protection could be read.
function declaredProtectionChecks(doc: Declaration): number {
  let count = 0;
  for (const rule of doc.github?.branchProtection ?? []) {
    count += PROTECTION_FIELDS.filter((field) => rule[field] !== undefined).length;
  }
  return count;
}
type ExecResult = { ok: boolean; stdout: string; stderr: string; missing: boolean };
type FakeResponse = { ok: boolean; status: number; json: () => Promise<unknown> };
type Engine = {
  STATUS: Record<string, string>;
  PROVIDERS: readonly string[];
  validateExpectations: (doc: unknown) => string[];
  loadExpectations: (path: string) => Record<string, unknown>;
  reconcile: (
    expectations: unknown,
    options: {
      env?: Record<string, string>;
      fetch?: (url: string, init?: { headers?: Record<string, string> }) => Promise<FakeResponse>;
      exec?: (command: string, args: string[], env: Record<string, string>) => ExecResult;
      only?: string[];
    },
  ) => Promise<{ results: Row[]; summary: Summary }>;
  compareBranchProtection: (
    target: string,
    rule: BranchRule,
    protection: Record<string, unknown>,
  ) => Row[];
  renderTable: (results: Row[]) => string;
  renderMarkdown: (results: Row[], summary: Summary) => string;
  summarize: (results: Row[]) => Summary;
  exitCodeFor: (summary: Summary, options?: { strict?: boolean }) => number;
  main: (
    argv: string[],
    deps?: {
      env?: Record<string, string>;
      stdout?: (text: string) => void;
      stderr?: (text: string) => void;
      fetch?: (url: string, init?: { headers?: Record<string, string> }) => Promise<FakeResponse>;
      exec?: (command: string, args: string[], env: Record<string, string>) => ExecResult;
    },
  ) => Promise<number>;
};

async function loadEngine(): Promise<Engine> {
  return (await import(pathToFileURL(enginePath).href)) as Engine;
}

// Strings that must never appear in anything the engine prints.
const TOKENS = {
  VERCEL_TOKEN: "vercel-token-must-never-print",
  VERCEL_ORG_ID: "team_fixture",
  FLY_API_TOKEN: "fly-token-must-never-print",
  CLOUDFLARE_API_TOKEN: "cf-token-must-never-print",
  CLOUDFLARE_ACCOUNT_ID: "acct_fixture",
  GH_TOKEN: "gh-token-must-never-print",
};
const SECRET_VALUE = "sk_live_value_must_never_print";
const DIGEST = "digest_must_never_print";

const GITHUB_VARS = JSON.stringify({
  DEPLOY_TARGET_SAILOR_DOCS: "fly",
  DEPLOY_TARGET_GATEWAY: "cloudflare-workers",
  UNRELATED: "ignored",
});

function response(status: number, body: unknown): FakeResponse {
  return { ok: status >= 200 && status < 300, status, json: async () => body };
}

type World = {
  projects: Record<string, Record<string, unknown>>;
  envs: Record<string, unknown[]>;
  flySecrets: string[];
  bindings: Array<Record<string, unknown>>;
  protection: Record<string, unknown>;
  vercelStatus?: number;
  cloudflareStatus?: number;
  cloudflareBody?: unknown;
  githubStatus?: number;
  githubBody?: unknown;
};

const LIVE_CONTEXTS = ["CodeQL Analysis (javascript-typescript)", "CodeQL Analysis (python)"];

// The body GET /repos/Nebutra/Nebutra-Sailor/branches/main/protection returned
// on 2026-09-03, trimmed to the fields the engine reads plus the ones it must
// ignore. There is no required_pull_request_reviews block: no review is
// required, which the declaration spells `null`.
function liveProtection(): Record<string, unknown> {
  return {
    url: "https://api.github.com/repos/Nebutra/Nebutra-Sailor/branches/main/protection",
    required_status_checks: {
      strict: false,
      contexts: [...LIVE_CONTEXTS],
      checks: LIVE_CONTEXTS.map((context) => ({ context, app_id: 15368 })),
    },
    required_signatures: { enabled: false },
    enforce_admins: { enabled: false },
    required_linear_history: { enabled: false },
    allow_force_pushes: { enabled: true },
    allow_deletions: { enabled: false },
    block_creations: { enabled: false },
    required_conversation_resolution: { enabled: false },
    lock_branch: { enabled: false },
    allow_fork_syncing: { enabled: false },
  };
}

// The rule for main as GitHub reported it on 2026-09-03. It is not in
// ops/nebutra/platform-expected.json yet: the daily run holds no token that can
// read protection, and under --strict a skipped row is a red run (see the
// workflow tests). The engine tests add it to the Nebutra declaration
// themselves so every kind is exercised at once.
const MAIN_RULE: BranchRule = {
  branch: "main",
  requiredStatusChecks: [...LIVE_CONTEXTS],
  strict: false,
  enforceAdmins: false,
  requiredApprovingReviewCount: null,
};

function withMainRule(doc: Declaration): Declaration {
  return { ...doc, github: { ...doc.github, branchProtection: [MAIN_RULE] } };
}

function greenWorld(): World {
  const fixed = { buildMachineType: "standard", buildMachineSelection: "fixed" };
  const link = { type: "github", org: "Nebutra", repo: "Nebutra-Sailor" };
  return {
    projects: {
      "nebutra-landing": { resourceConfig: fixed, commandForIgnoringBuildStep: "exit 0" },
      "nebutra-web": { resourceConfig: fixed, commandForIgnoringBuildStep: "exit 0", link },
      "nebutra-auth": { resourceConfig: fixed, commandForIgnoringBuildStep: "exit 0", link },
      docs: { resourceConfig: fixed, commandForIgnoringBuildStep: "bash ignore.sh" },
      "nebutra-kuanlan": {
        resourceConfig: fixed,
        commandForIgnoringBuildStep: "bash ../../scripts/vercel-ignore-build.sh apps/kuanlan",
        link,
      },
    },
    envs: {
      "nebutra-landing": [
        { key: "NEXT_PUBLIC_SITE_URL", type: "plain", target: ["production"], value: "https://x" },
        // `value` is present on purpose: the engine must never read or print it.
        {
          key: "DOCS_ORIGIN_URL",
          type: "encrypted",
          target: ["production", "preview"],
          value: SECRET_VALUE,
        },
        // A bare string target is what older API versions return.
        { key: "NEXT_PUBLIC_API_URL", type: "plain", target: "production", value: "https://api" },
        { key: "PREVIEW_ONLY", type: "sensitive", target: ["preview"], value: SECRET_VALUE },
      ],
    },
    flySecrets: [
      "QSTASH_TOKEN",
      "QSTASH_CURRENT_SIGNING_KEY",
      "QSTASH_NEXT_SIGNING_KEY",
      "QUEUE_PROVIDER",
      "QSTASH_CALLBACK_BASE_URL",
      "UPSTASH_REDIS_REST_URL",
      "UPSTASH_REDIS_REST_TOKEN",
      "DATABASE_URL",
    ],
    bindings: [
      { type: "ratelimit", name: "IP_LIMITER", namespace_id: "2609" },
      { type: "plain_text", name: "ORIGIN_URL", text: "https://origin" },
    ],
    protection: liveProtection(),
  };
}

function fakeProviders(world: World) {
  const calls: Array<{ url: string; headers: Record<string, string> }> = [];
  const execCalls: Array<{ command: string; args: string[] }> = [];

  const fetch = async (url: string, init?: { headers?: Record<string, string> }) => {
    calls.push({ url, headers: init?.headers ?? {} });
    const parsed = new URL(url);
    if (parsed.hostname === "api.vercel.com") {
      if (world.vercelStatus)
        return response(world.vercelStatus, { error: { message: "forbidden" } });
      const env = parsed.pathname.match(/^\/v10\/projects\/([^/]+)\/env$/);
      if (env) {
        const name = decodeURIComponent(env[1]);
        return name in world.projects
          ? response(200, { envs: world.envs[name] ?? [] })
          : response(404, { error: { message: "not found" } });
      }
      const project = parsed.pathname.match(/^\/v9\/projects\/([^/]+)$/);
      if (project) {
        const name = decodeURIComponent(project[1]);
        return name in world.projects
          ? response(200, { name, ...world.projects[name] })
          : response(404, { error: { code: "not_found", message: "Project not found" } });
      }
      return response(500, { error: { message: `unexpected ${parsed.pathname}` } });
    }
    if (parsed.hostname === "api.cloudflare.com") {
      if (world.cloudflareStatus) {
        return response(
          world.cloudflareStatus,
          world.cloudflareBody ?? { success: false, errors: [] },
        );
      }
      if (/\/workers\/scripts\/nebutra-gateway-edge\/settings$/.test(parsed.pathname)) {
        return response(200, { success: true, errors: [], result: { bindings: world.bindings } });
      }
      return response(404, {
        success: false,
        errors: [{ code: 10007, message: "script not found" }],
      });
    }
    if (parsed.hostname === "api.github.com") {
      if (world.githubStatus) {
        return response(world.githubStatus, world.githubBody ?? { message: "Not Found" });
      }
      if (parsed.pathname === "/repos/Nebutra/Nebutra-Sailor/branches/main/protection") {
        return response(200, world.protection);
      }
      return response(404, { message: "Not Found" });
    }
    return response(500, { error: { message: `unexpected host ${parsed.hostname}` } });
  };

  const exec = (command: string, args: string[]): ExecResult => {
    execCalls.push({ command, args });
    if (command === "flyctl" && args[0] === "secrets" && args[1] === "list") {
      const app = args[args.indexOf("-a") + 1];
      if (app !== "nebutra-gateway") {
        return { ok: false, stdout: "", stderr: `Error: app ${app} not found`, missing: false };
      }
      const list = world.flySecrets.map((Name) => ({
        Name,
        Digest: DIGEST,
        CreatedAt: "2026-09-02T00:00:00Z",
      }));
      return { ok: true, stdout: JSON.stringify(list), stderr: "", missing: false };
    }
    return { ok: false, stdout: "", stderr: `${command}: command not found`, missing: true };
  };

  return { fetch, exec, calls, execCalls };
}

function find(results: Row[], provider: string, target: string, check: string): Row {
  const row = results.find(
    (r) => r.provider === provider && r.target === target && r.check === check,
  );
  if (!row) throw new Error(`no row for ${provider}/${target}/${check}`);
  return row;
}

describe("platform-reconcile: expectations files", () => {
  it("ships a valid Nebutra declaration with the incident-derived checks", async () => {
    const { loadExpectations } = await loadEngine();
    const doc = loadExpectations(nebutraPath) as {
      vercel: { projects: Array<Record<string, unknown>> };
      fly: { apps: Array<{ name: string; secretsPresent: string[]; secretsAbsent: string[] }> };
      github: { repo: string; variables: Record<string, string>; branchProtection?: BranchRule[] };
      cloudflare: {
        workers: Array<{ name: string; bindings: Array<{ name: string; type?: string }> }>;
      };
    };

    const byName = Object.fromEntries(doc.vercel.projects.map((p) => [p.name as string, p]));
    for (const name of [
      "nebutra-landing",
      "nebutra-web",
      "nebutra-auth",
      "docs",
      "nebutra-kuanlan",
    ]) {
      expect(byName[name]?.buildMachineType, name).toBe("standard");
    }
    for (const name of ["nebutra-landing", "nebutra-web", "nebutra-auth"]) {
      expect(byName[name]?.ignoreBuildStep, name).toBe("exit 0");
    }
    expect(byName["nebutra-landing"]?.gitLinked).toBe(false);
    expect(byName["nebutra-landing"]?.envNotSensitive).toEqual({
      production: ["NEXT_PUBLIC_SITE_URL", "DOCS_ORIGIN_URL", "NEXT_PUBLIC_API_URL"],
    });

    const gateway = doc.fly.apps.find((app) => app.name === "nebutra-gateway");
    expect(gateway?.secretsPresent).toEqual(
      expect.arrayContaining([
        "QSTASH_TOKEN",
        "QSTASH_CURRENT_SIGNING_KEY",
        "QSTASH_NEXT_SIGNING_KEY",
        "QUEUE_PROVIDER",
        "QSTASH_CALLBACK_BASE_URL",
        "UPSTASH_REDIS_REST_URL",
        "UPSTASH_REDIS_REST_TOKEN",
      ]),
    );
    expect(gateway?.secretsAbsent).toEqual(
      expect.arrayContaining(["CACHE_BACKEND", "REDIS_URL", "ALLOW_MEMORY_QUEUE_IN_PRODUCTION"]),
    );

    expect(doc.github.repo).toBe("Nebutra/Nebutra-Sailor");
    expect(doc.github.variables).toEqual({
      DEPLOY_TARGET_SAILOR_DOCS: "fly",
      DEPLOY_TARGET_GATEWAY: "cloudflare-workers",
    });
    // The branch rule for main is pinned by the workflow tests below: it may
    // only be declared once the daily run holds a token that can read it.

    const edge = doc.cloudflare.workers.find((w) => w.name === "nebutra-gateway-edge");
    expect(edge?.bindings).toEqual([{ name: "IP_LIMITER", type: "ratelimit" }]);
  });

  it("keeps the declared worker binding in step with wrangler.edge.toml", () => {
    const wrangler = readFileSync(join(root, "backends/gateway/wrangler.edge.toml"), "utf8");
    expect(wrangler).toMatch(/^name = "nebutra-gateway-edge"$/m);
    expect(wrangler).toMatch(/\[\[ratelimits\]\]\s*\nname = "IP_LIMITER"/);
  });

  it("ships a generic scaffold example that validates and names no brand", async () => {
    const { validateExpectations } = await loadEngine();
    const raw = readFileSync(templatePath, "utf8");
    expect(raw).toContain("{PRODUCT_NAME}");
    expect(raw.toLowerCase()).not.toContain("nebutra");
    // create-sailor copies templates/infra verbatim and then substitutes
    // {PRODUCT_NAME}; the file must validate in the shape a scaffold receives.
    const scaffolded = raw.split("{PRODUCT_NAME}").join("acme");
    expect(validateExpectations(JSON.parse(scaffolded))).toEqual([]);
    const example = JSON.parse(scaffolded) as Declaration;
    expect(example.github?.branchProtection).toEqual([
      {
        branch: "main",
        requiredStatusChecks: ["Lint & Typecheck", "Test"],
        strict: false,
        enforceAdmins: false,
        requiredApprovingReviewCount: null,
      },
    ]);
  });

  it("rejects malformed declarations with a named path", async () => {
    const { validateExpectations } = await loadEngine();
    expect(validateExpectations(null)).toEqual(["expectations must be a JSON object"]);
    expect(validateExpectations({})).toContain("version must be 1");
    expect(validateExpectations({ version: 1, vercel: { projects: [{}] } })).toContain(
      "vercel.projects[0].name must be a non-empty string",
    );
    expect(
      validateExpectations({
        version: 1,
        vercel: { projects: [{ name: "x", envNotSensitive: { production: "NOT_A_LIST" } }] },
      }),
    ).toContain("vercel.projects[0].envNotSensitive.production must be a list of env keys");
    expect(
      validateExpectations({ version: 1, fly: { apps: [{ name: "x", secretsAbsent: [1] }] } }),
    ).toContain("fly.apps[0].secretsAbsent must be a list of secret names");
    expect(validateExpectations({ version: 1, github: { variables: { A: 1 } } })).toContain(
      "github.variables.A must be a string",
    );
    expect(
      validateExpectations({ version: 1, cloudflare: { workers: [{ name: "w" }] } }),
    ).toContain("cloudflare.workers[0].bindings must be an array");

    expect(validateExpectations({ version: 1, github: { branchProtection: {} } })).toContain(
      "github.branchProtection must be an array",
    );
    expect(validateExpectations({ version: 1, github: { branchProtection: [{}] } })).toContain(
      "github.branchProtection[0].branch must be a non-empty string",
    );
    const malformed = validateExpectations({
      version: 1,
      github: {
        branchProtection: [
          {
            branch: "main",
            requiredStatusChecks: "Test",
            strict: "yes",
            enforceAdmins: 1,
            requiredApprovingReviewCount: -1,
          },
          { branch: "release", requiredApprovingReviewCount: 1.5 },
        ],
      },
    });
    expect(malformed).toEqual([
      "github.branchProtection[0].requiredStatusChecks must be a list of status-check contexts",
      "github.branchProtection[0].strict must be a boolean",
      "github.branchProtection[0].enforceAdmins must be a boolean",
      "github.branchProtection[0].requiredApprovingReviewCount must be null or a non-negative integer",
      "github.branchProtection[1].requiredApprovingReviewCount must be null or a non-negative integer",
    ]);
    // `null` means "no review required" and an empty list means "no required
    // checks": both are real expectations, not omissions.
    expect(
      validateExpectations({
        version: 1,
        github: {
          branchProtection: [
            { branch: "main", requiredStatusChecks: [], requiredApprovingReviewCount: null },
          ],
        },
      }),
    ).toEqual([]);
    // A misspelled key is not a type error, it is a field that is never
    // reported: a guardrail removed with a green run. So it is named.
    expect(
      validateExpectations({
        version: 1,
        github: {
          branchProtection: [{ branch: "main", requiredStatusCheck: ["Test"], enforceAdmin: true }],
        },
      }),
    ).toEqual([
      "github.branchProtection[0].requiredStatusCheck is not a known field",
      "github.branchProtection[0].enforceAdmin is not a known field",
    ]);
    // `$comment` is an annotation, never compared.
    expect(
      validateExpectations({
        version: 1,
        github: { branchProtection: [{ $comment: "why", branch: "main", strict: false }] },
      }),
    ).toEqual([]);
  });
});

describe("platform-reconcile: engine", () => {
  it("reports every declared check as ok when the providers agree", async () => {
    const { reconcile, loadExpectations, exitCodeFor, renderTable } = await loadEngine();
    const providers = fakeProviders(greenWorld());
    const declaration = withMainRule(loadExpectations(nebutraPath) as Declaration);
    const { results, summary } = await reconcile(declaration, {
      env: { ...TOKENS, PLATFORM_RECONCILE_GITHUB_VARS: GITHUB_VARS },
      fetch: providers.fetch,
      exec: providers.exec,
    });

    expect(summary.drift).toBe(0);
    expect(summary.error).toBe(0);
    expect(summary.skipped).toBe(0);
    expect(summary.ok).toBe(summary.total);
    expect(exitCodeFor(summary, { strict: true })).toBe(0);

    // One row per declared expectation, counted from the declaration itself.
    expect(summary.total).toBeGreaterThan(0);
    expect(summary.total).toBe(declaredChecks(declaration));
    expect(find(results, "vercel", "nebutra-landing", "gitLinked").actual).toBe("false");
    expect(
      find(results, "vercel", "nebutra-landing", "env DOCS_ORIGIN_URL@production").actual,
    ).toBe("encrypted");
    expect(find(results, "fly", "nebutra-gateway", "secret REDIS_URL").actual).toBe("absent");
    expect(
      find(results, "github", "Nebutra/Nebutra-Sailor", "variable DEPLOY_TARGET_GATEWAY").actual,
    ).toBe("cloudflare-workers");
    expect(
      find(results, "github", "Nebutra/Nebutra-Sailor", "branch main requiredStatusChecks").actual,
    ).toBe(LIVE_CONTEXTS.join(", "));
    expect(
      find(results, "github", "Nebutra/Nebutra-Sailor", "branch main requiredApprovingReviewCount")
        .actual,
    ).toBe("none");
    expect(find(results, "cloudflare", "nebutra-gateway-edge", "binding IP_LIMITER").actual).toBe(
      "ratelimit",
    );

    // Requests are scoped to the team and authenticated, and read-only.
    const vercelCalls = providers.calls.filter((call) =>
      call.url.startsWith("https://api.vercel.com/"),
    );
    expect(vercelCalls.length).toBeGreaterThan(0);
    for (const call of vercelCalls) {
      expect(call.url).toContain("teamId=team_fixture");
      expect(call.headers.authorization).toBe(`Bearer ${TOKENS.VERCEL_TOKEN}`);
    }
    const cloudflareCalls = providers.calls.filter((call) =>
      call.url.startsWith("https://api.cloudflare.com/"),
    );
    expect(cloudflareCalls.map((call) => call.url)).toEqual([
      "https://api.cloudflare.com/client/v4/accounts/acct_fixture/workers/scripts/nebutra-gateway-edge/settings",
    ]);
    // With a token in the environment the protection is read over HTTP, once
    // per declared branch, and `gh` is never shelled out to for it.
    const githubCalls = providers.calls.filter((call) =>
      call.url.startsWith("https://api.github.com/"),
    );
    expect(githubCalls.map((call) => call.url)).toEqual([
      "https://api.github.com/repos/Nebutra/Nebutra-Sailor/branches/main/protection",
    ]);
    expect(githubCalls[0].headers.authorization).toBe(`Bearer ${TOKENS.GH_TOKEN}`);
    expect(githubCalls[0].headers.accept).toBe("application/vnd.github+json");
    expect(providers.execCalls).toEqual([
      { command: "flyctl", args: ["secrets", "list", "-a", "nebutra-gateway", "--json"] },
    ]);

    const table = renderTable(results);
    expect(table).toMatch(/^PROVIDER\s+TARGET\s+CHECK\s+EXPECTED\s+ACTUAL\s+STATUS/);
    expect(table.split("\n")).toHaveLength(summary.total + 2);
  });

  it("flags each kind of dashboard drift and exits non-zero", async () => {
    const { reconcile, loadExpectations, exitCodeFor, STATUS } = await loadEngine();
    const world = greenWorld();
    world.projects["nebutra-landing"] = {
      resourceConfig: { buildMachineType: "turbo", buildMachineSelection: "elastic" },
      commandForIgnoringBuildStep: "exit 0",
      link: { type: "github", org: "Nebutra", repo: "Nebutra-Sailor" },
    };
    world.projects["nebutra-web"] = { resourceConfig: {}, commandForIgnoringBuildStep: "" };
    delete world.projects["nebutra-kuanlan"];
    world.envs["nebutra-landing"] = [
      {
        key: "NEXT_PUBLIC_SITE_URL",
        type: "sensitive",
        target: ["production"],
        value: SECRET_VALUE,
      },
      { key: "DOCS_ORIGIN_URL", type: "plain", target: ["preview"], value: "x" },
      { key: "NEXT_PUBLIC_API_URL", type: "plain", target: ["production"], value: "x" },
    ];
    world.flySecrets = world.flySecrets
      .filter((name) => name !== "QSTASH_TOKEN")
      .concat("REDIS_URL");
    world.bindings = [{ type: "plain_text", name: "ORIGIN_URL" }];

    const providers = fakeProviders(world);
    const { results, summary } = await reconcile(withMainRule(loadExpectations(nebutraPath)), {
      env: {
        ...TOKENS,
        PLATFORM_RECONCILE_GITHUB_VARS: JSON.stringify({ DEPLOY_TARGET_SAILOR_DOCS: "vercel" }),
      },
      fetch: providers.fetch,
      exec: providers.exec,
    });

    const landing = (check: string) => find(results, "vercel", "nebutra-landing", check);
    expect(landing("buildMachineType")).toMatchObject({
      status: STATUS.drift,
      expected: "standard",
      actual: "turbo",
      detail: "selection=elastic",
    });
    expect(landing("gitLinked")).toMatchObject({ status: STATUS.drift, actual: "true" });
    expect(landing("gitLinked").detail).toContain("github:Nebutra/Nebutra-Sailor");
    expect(landing("env NEXT_PUBLIC_SITE_URL@production")).toMatchObject({
      status: STATUS.drift,
      actual: "sensitive",
    });
    expect(landing("env DOCS_ORIGIN_URL@production")).toMatchObject({
      status: STATUS.drift,
      actual: "missing",
    });
    expect(landing("env NEXT_PUBLIC_API_URL@production").status).toBe(STATUS.ok);

    expect(find(results, "vercel", "nebutra-web", "buildMachineType")).toMatchObject({
      status: STATUS.drift,
      actual: "(unset)",
    });
    expect(find(results, "vercel", "nebutra-web", "ignoreBuildStep")).toMatchObject({
      status: STATUS.drift,
      expected: "exit 0",
      actual: "",
    });
    expect(find(results, "vercel", "nebutra-kuanlan", "project")).toMatchObject({
      status: STATUS.drift,
      actual: "not found",
    });

    expect(find(results, "fly", "nebutra-gateway", "secret QSTASH_TOKEN")).toMatchObject({
      status: STATUS.drift,
      expected: "present",
      actual: "missing",
    });
    expect(find(results, "fly", "nebutra-gateway", "secret REDIS_URL")).toMatchObject({
      status: STATUS.drift,
      expected: "absent",
      actual: "present",
    });

    expect(
      find(results, "github", "Nebutra/Nebutra-Sailor", "variable DEPLOY_TARGET_SAILOR_DOCS"),
    ).toMatchObject({
      status: STATUS.drift,
      expected: "fly",
      actual: "vercel",
    });
    expect(
      find(results, "github", "Nebutra/Nebutra-Sailor", "variable DEPLOY_TARGET_GATEWAY"),
    ).toMatchObject({
      status: STATUS.drift,
      actual: "(unset)",
    });

    expect(find(results, "cloudflare", "nebutra-gateway-edge", "binding IP_LIMITER")).toMatchObject(
      {
        status: STATUS.drift,
        expected: "ratelimit",
        actual: "missing",
      },
    );

    // Exactly these rows drift: nothing the fixture left alone is flagged, and a
    // line added to the declaration that the green world satisfies leaves this
    // list unchanged.
    const drifted = results
      .filter((row) => row.status === STATUS.drift)
      .map((row) => `${row.provider} ${row.target} ${row.check}`)
      .sort();
    expect(drifted).toEqual(
      [
        "vercel nebutra-landing buildMachineType",
        "vercel nebutra-landing gitLinked",
        "vercel nebutra-landing env NEXT_PUBLIC_SITE_URL@production",
        "vercel nebutra-landing env DOCS_ORIGIN_URL@production",
        "vercel nebutra-web buildMachineType",
        "vercel nebutra-web ignoreBuildStep",
        "vercel nebutra-kuanlan project",
        "fly nebutra-gateway secret QSTASH_TOKEN",
        "fly nebutra-gateway secret REDIS_URL",
        "github Nebutra/Nebutra-Sailor variable DEPLOY_TARGET_SAILOR_DOCS",
        "github Nebutra/Nebutra-Sailor variable DEPLOY_TARGET_GATEWAY",
        "cloudflare nebutra-gateway-edge binding IP_LIMITER",
      ].sort(),
    );
    expect(summary.drift).toBe(drifted.length);
    expect(summary.error).toBe(0);
    expect(exitCodeFor(summary)).toBe(1);
  });

  it("never prints a token, a secret value, or a Fly digest", async () => {
    const { reconcile, loadExpectations, renderTable, renderMarkdown } = await loadEngine();
    const world = greenWorld();
    world.envs["nebutra-landing"][0] = {
      key: "NEXT_PUBLIC_SITE_URL",
      type: "sensitive",
      target: ["production"],
      value: SECRET_VALUE,
    };
    const providers = fakeProviders(world);
    const { results, summary } = await reconcile(withMainRule(loadExpectations(nebutraPath)), {
      env: { ...TOKENS, PLATFORM_RECONCILE_GITHUB_VARS: GITHUB_VARS },
      fetch: providers.fetch,
      exec: providers.exec,
    });

    const printed = [
      renderTable(results),
      renderMarkdown(results, summary),
      JSON.stringify(results),
    ].join("\n");
    for (const forbidden of [
      TOKENS.VERCEL_TOKEN,
      TOKENS.FLY_API_TOKEN,
      TOKENS.CLOUDFLARE_API_TOKEN,
      TOKENS.GH_TOKEN,
      SECRET_VALUE,
      DIGEST,
    ]) {
      expect(printed).not.toContain(forbidden);
    }
    expect(printed).not.toMatch(/"value"/);
  });

  it("skips a provider cleanly when its token is missing and fails only under --strict", async () => {
    const { reconcile, loadExpectations, exitCodeFor, STATUS } = await loadEngine();
    let touched = 0;
    const declaration = withMainRule(loadExpectations(nebutraPath) as Declaration);
    const { results, summary } = await reconcile(declaration, {
      env: {},
      fetch: async () => {
        touched += 1;
        return response(500, {});
      },
      exec: () => {
        touched += 1;
        return { ok: false, stdout: "", stderr: "gh: command not found", missing: true };
      },
    });

    expect(results.every((row) => row.status === STATUS.skipped)).toBe(true);
    expect(find(results, "vercel", "nebutra-landing", "project").detail).toBe(
      "skipped: no VERCEL_TOKEN",
    );
    expect(find(results, "fly", "nebutra-gateway", "secrets").detail).toBe(
      "skipped: no FLY_API_TOKEN",
    );
    expect(find(results, "cloudflare", "nebutra-gateway-edge", "bindings").detail).toBe(
      "skipped: no CLOUDFLARE_API_TOKEN",
    );
    expect(
      find(results, "github", "Nebutra/Nebutra-Sailor", "variable DEPLOY_TARGET_GATEWAY").detail,
    ).toBe("skipped: gh is not installed");
    expect(find(results, "github", "Nebutra/Nebutra-Sailor", "branch main protection").detail).toBe(
      "skipped: gh is not installed",
    );
    // Without a token no provider is contacted; only the local `gh` probe ran,
    // once per declared variable and once per declared branch.
    expect(touched).toBe(declaredVariables(declaration) + declaredBranches(declaration));
    expect(summary.skipped).toBe(summary.total);
    expect(exitCodeFor(summary)).toBe(0);
    expect(exitCodeFor(summary, { strict: true })).toBe(1);
  });

  it("reports a token that lacks scope as skipped with the reason, not as a pass", async () => {
    const { reconcile, loadExpectations, STATUS } = await loadEngine();
    const declaration = withMainRule(loadExpectations(nebutraPath) as Declaration);
    const world = greenWorld();
    world.vercelStatus = 403;
    world.cloudflareStatus = 403;
    world.cloudflareBody = {
      success: false,
      errors: [{ code: 10000, message: "Authentication error" }],
    };
    // What the Actions GITHUB_TOKEN gets: it cannot hold administration:read.
    world.githubStatus = 403;
    world.githubBody = { message: "Resource not accessible by integration" };
    const providers = fakeProviders(world);
    const { results, summary } = await reconcile(declaration, {
      env: { ...TOKENS, PLATFORM_RECONCILE_GITHUB_VARS: GITHUB_VARS },
      fetch: providers.fetch,
      exec: () => ({ ok: false, stdout: "", stderr: "flyctl: command not found", missing: true }),
    });

    expect(find(results, "vercel", "nebutra-landing", "project")).toMatchObject({
      status: STATUS.skipped,
    });
    expect(find(results, "vercel", "nebutra-landing", "project").detail).toContain(
      "token rejected (HTTP 403",
    );
    expect(find(results, "cloudflare", "nebutra-gateway-edge", "bindings").detail).toContain(
      "token lacks Workers Scripts read",
    );
    expect(find(results, "fly", "nebutra-gateway", "secrets").detail).toBe(
      "skipped: flyctl is not installed",
    );
    const protection = find(results, "github", "Nebutra/Nebutra-Sailor", "branch main protection");
    expect(protection.status).toBe(STATUS.skipped);
    expect(protection.detail).toContain("needs administration:read");
    expect(protection.detail).toContain("HTTP 403: Resource not accessible by integration");
    // The GitHub variables, which need no provider token, are still verified.
    expect(summary.ok).toBe(declaredVariables(declaration));
    expect(summary.drift).toBe(0);
    expect(summary.error).toBe(0);
  });

  it("falls back to gh variable get when the workflow did not hand over vars", async () => {
    const { reconcile, STATUS } = await loadEngine();
    const execCalls: string[][] = [];
    const { results } = await reconcile(
      { version: 1, github: { repo: "acme/widgets", variables: { A: "1", B: "2", C: "3" } } },
      {
        env: {},
        exec: (command, args) => {
          execCalls.push([command, ...args]);
          const name = args[2];
          if (name === "A") return { ok: true, stdout: "1\n", stderr: "", missing: false };
          if (name === "B") {
            return { ok: false, stdout: "", stderr: "variable B was not found", missing: false };
          }
          return {
            ok: false,
            stdout: "",
            stderr: "HTTP 403: Resource not accessible",
            missing: false,
          };
        },
      },
    );
    expect(execCalls).toEqual([
      ["gh", "variable", "get", "A", "-R", "acme/widgets"],
      ["gh", "variable", "get", "B", "-R", "acme/widgets"],
      ["gh", "variable", "get", "C", "-R", "acme/widgets"],
    ]);
    expect(find(results, "github", "acme/widgets", "variable A").status).toBe(STATUS.ok);
    expect(find(results, "github", "acme/widgets", "variable B")).toMatchObject({
      status: STATUS.drift,
      actual: "(unset)",
    });
    expect(find(results, "github", "acme/widgets", "variable C").status).toBe(STATUS.skipped);
  });

  it("treats an unreachable provider as an error, not as drift or a pass", async () => {
    const { reconcile, exitCodeFor, STATUS } = await loadEngine();
    const { results, summary } = await reconcile(
      { version: 1, vercel: { projects: [{ name: "p", buildMachineType: "standard" }] } },
      {
        env: { VERCEL_TOKEN: "t" },
        fetch: async () => {
          throw new Error("ECONNRESET");
        },
      },
    );
    expect(find(results, "vercel", "p", "project")).toMatchObject({ status: STATUS.error });
    expect(find(results, "vercel", "p", "project").detail).toContain("ECONNRESET");
    expect(exitCodeFor(summary)).toBe(1);
  });

  it("exposes a CLI that validates its arguments and prints the table", async () => {
    const { main, loadExpectations } = await loadEngine();
    const declaration = withMainRule(loadExpectations(nebutraPath) as Declaration);
    const out: string[] = [];
    const err: string[] = [];
    const stdout = (text: string) => out.push(text);
    const stderr = (text: string) => err.push(text);

    expect(await main([], { stdout, stderr })).toBe(2);
    expect(out.join("")).toContain("usage:");

    expect(await main(["--bogus"], { stdout, stderr })).toBe(2);
    expect(err.join("")).toContain("unknown flag --bogus");

    expect(await main([nebutraPath, "--only=nowhere"], { stdout, stderr })).toBe(2);
    expect(await main([join(root, "package.json")], { stdout, stderr })).toBe(2);
    expect(err.join("")).toContain("not a valid expectations file");

    // The Nebutra file carries no branch rule yet; the CLI reads a copy that
    // does, so the file → validator → table path covers every kind.
    const dir = mkdtempSync(join(tmpdir(), "platform-reconcile-"));
    onTestFinished(() => rmSync(dir, { recursive: true, force: true }));
    const withRulePath = join(dir, "platform-expected.json");
    writeFileSync(withRulePath, JSON.stringify(declaration));

    out.length = 0;
    err.length = 0;
    const code = await main([withRulePath, "--only=github"], {
      env: { PLATFORM_RECONCILE_GITHUB_VARS: GITHUB_VARS, GH_TOKEN: TOKENS.GH_TOKEN },
      fetch: fakeProviders(greenWorld()).fetch,
      stdout,
      stderr,
    });
    expect(code).toBe(0);
    const printed = out.join("");
    expect(printed).toContain("variable DEPLOY_TARGET_GATEWAY");
    expect(printed).toContain("branch main requiredStatusChecks");
    expect(printed).toContain(
      `${declaredVariables(declaration) + declaredProtectionChecks(declaration)} ok · 0 drift · 0 skipped · 0 error`,
    );
    expect(printed).not.toContain("vercel");

    out.length = 0;
    const strictCode = await main([nebutraPath, "--strict", "--json"], {
      env: {},
      stdout,
      stderr,
      exec: () => ({ ok: false, stdout: "", stderr: "gh: command not found", missing: true }),
    });
    expect(strictCode).toBe(1);
    const parsed = JSON.parse(out.join("")) as { summary: Summary; results: Row[] };
    expect(parsed.summary.skipped).toBe(parsed.summary.total);
    expect(err.join("")).toContain("strict: skipped checks count as failures");
  });
});

describe("platform-reconcile: branch protection", () => {
  const repo = "Nebutra/Nebutra-Sailor";
  const rule: BranchRule = {
    branch: "main",
    requiredStatusChecks: [...LIVE_CONTEXTS],
    strict: false,
    enforceAdmins: false,
    requiredApprovingReviewCount: null,
  };
  const declaration = { version: 1, github: { repo, branchProtection: [rule] } };
  const protectionOf = (rows: Row[]) => find(rows, "github", repo, "branch main protection");

  it("reports every declared field as ok against the live protection shape", async () => {
    const { compareBranchProtection } = await loadEngine();
    const rows = compareBranchProtection(repo, rule, liveProtection());
    expect(rows.map((r) => [r.check, r.status, r.expected, r.actual, r.detail])).toEqual([
      [
        "branch main requiredStatusChecks",
        "ok",
        LIVE_CONTEXTS.join(", "),
        LIVE_CONTEXTS.join(", "),
        "",
      ],
      ["branch main strict", "ok", "false", "false", ""],
      ["branch main enforceAdmins", "ok", "false", "false", ""],
      ["branch main requiredApprovingReviewCount", "ok", "none", "none", ""],
    ]);
  });

  it("flags a check removed, a check added, and every flipped switch", async () => {
    const { compareBranchProtection, STATUS, summarize, exitCodeFor } = await loadEngine();
    const protection = liveProtection();
    // Someone dropped the python check, added Test, required up-to-date
    // branches, bound admins, and asked for one review.
    protection.required_status_checks = {
      strict: true,
      contexts: ["CodeQL Analysis (javascript-typescript)", "Test"],
      checks: [
        { context: "CodeQL Analysis (javascript-typescript)", app_id: 15368 },
        { context: "Test", app_id: null },
      ],
    };
    protection.enforce_admins = { enabled: true };
    protection.required_pull_request_reviews = {
      dismiss_stale_reviews: false,
      required_approving_review_count: 1,
    };

    const rows = compareBranchProtection(repo, rule, protection);
    expect(find(rows, "github", repo, "branch main requiredStatusChecks")).toMatchObject({
      status: STATUS.drift,
      expected: LIVE_CONTEXTS.join(", "),
      actual: "CodeQL Analysis (javascript-typescript), Test",
      detail: "missing: CodeQL Analysis (python); extra: Test",
    });
    expect(find(rows, "github", repo, "branch main strict")).toMatchObject({
      status: STATUS.drift,
      expected: "false",
      actual: "true",
    });
    expect(find(rows, "github", repo, "branch main enforceAdmins")).toMatchObject({
      status: STATUS.drift,
      expected: "false",
      actual: "true",
    });
    expect(find(rows, "github", repo, "branch main requiredApprovingReviewCount")).toMatchObject({
      status: STATUS.drift,
      expected: "none",
      actual: "1",
    });
    expect(rows.every((r) => r.status === STATUS.drift)).toBe(true);
    expect(exitCodeFor(summarize(rows))).toBe(1);
  });

  it("compares required checks as a set, from contexts or checks[].context alike", async () => {
    const { compareBranchProtection, STATUS } = await loadEngine();
    const only = (protection: Record<string, unknown>, rules: BranchRule = rule) =>
      find(
        compareBranchProtection(repo, rules, protection),
        "github",
        repo,
        "branch main requiredStatusChecks",
      );

    // Order is not drift.
    const reversed = liveProtection();
    reversed.required_status_checks = {
      strict: false,
      contexts: [...LIVE_CONTEXTS].reverse(),
      checks: [...LIVE_CONTEXTS].reverse().map((context) => ({ context, app_id: 15368 })),
    };
    expect(only(reversed).status).toBe(STATUS.ok);

    // A newer API that drops the deprecated `contexts` list still reads.
    const checksOnly = liveProtection();
    checksOnly.required_status_checks = {
      strict: false,
      checks: LIVE_CONTEXTS.map((context) => ({ context, app_id: 15368 })),
    };
    expect(only(checksOnly).status).toBe(STATUS.ok);

    // An older API that only has `contexts` still reads.
    const contextsOnly = liveProtection();
    contextsOnly.required_status_checks = { strict: false, contexts: [...LIVE_CONTEXTS] };
    expect(only(contextsOnly).status).toBe(STATUS.ok);

    // No required-status-checks block at all: no checks are required.
    const none = liveProtection();
    delete none.required_status_checks;
    expect(only(none)).toMatchObject({
      status: STATUS.drift,
      actual: "(none)",
      detail: `missing: ${LIVE_CONTEXTS.join(", ")}`,
    });
    expect(only(none, { branch: "main", requiredStatusChecks: [] })).toMatchObject({
      status: STATUS.ok,
      expected: "(none)",
      actual: "(none)",
    });
    // Without a checks block GitHub has no strict setting: that is the default
    // `false`, consistent with `strict: false`, and drift only for `strict: true`.
    const strictOf = (rules: BranchRule, protection: Record<string, unknown>) =>
      find(compareBranchProtection(repo, rules, protection), "github", repo, "branch main strict");
    expect(strictOf(rule, none)).toMatchObject({
      status: STATUS.ok,
      expected: "false",
      actual: "false",
      detail: "no required status checks",
    });
    expect(strictOf({ branch: "main", strict: true }, none)).toMatchObject({
      status: STATUS.drift,
      expected: "true",
      actual: "false",
    });
    // A block that exists but carries no boolean is the one unknown state.
    const blank = liveProtection();
    blank.required_status_checks = { contexts: [] };
    expect(strictOf(rule, blank)).toMatchObject({ status: STATUS.drift, actual: "(unset)" });
  });

  it("reports only the fields a rule declares", async () => {
    const { compareBranchProtection } = await loadEngine();
    const rows = compareBranchProtection(
      repo,
      { branch: "main", requiredApprovingReviewCount: 2 },
      liveProtection(),
    );
    expect(rows.map((r) => [r.check, r.status, r.expected, r.actual])).toEqual([
      ["branch main requiredApprovingReviewCount", "drift", "2", "none"],
    ]);
  });

  it("treats a branch whose protection was removed as drift, not as a missing token", async () => {
    const { reconcile, exitCodeFor, STATUS } = await loadEngine();
    const world = greenWorld();
    world.githubStatus = 404;
    world.githubBody = { message: "Branch not protected", status: "404" };
    const { results, summary } = await reconcile(declaration, {
      env: { GH_TOKEN: TOKENS.GH_TOKEN },
      fetch: fakeProviders(world).fetch,
    });
    expect(protectionOf(results)).toMatchObject({
      status: STATUS.drift,
      expected: "protected",
      actual: "not protected",
    });
    expect(summary.total).toBe(1);
    expect(exitCodeFor(summary)).toBe(1);
  });

  it("skips, naming the cause, when the token cannot see the protection, and never errors", async () => {
    const { reconcile, exitCodeFor, STATUS } = await loadEngine();
    // What GitHub tells a token without administration:read, then a rejected
    // or missing credential, then a rate limit. Every one is skipped, but only
    // the first group is told to go and get the scope; the others would send
    // the operator to the wrong fix.
    const denied: Array<[number, string, RegExp]> = [
      [403, "Resource not accessible by integration", /needs administration:read/],
      [403, "Resource not accessible by personal access token", /needs administration:read/],
      [403, "Must have admin rights to Repository.", /needs administration:read/],
      [404, "Not Found", /needs administration:read/],
      [401, "Bad credentials", /credential rejected/],
      [401, "Requires authentication", /credential rejected/],
      [403, "API rate limit exceeded for 203.0.113.9.", /protection \(HTTP 403/],
    ];
    for (const [status, message, cause] of denied) {
      const world = greenWorld();
      world.githubStatus = status;
      world.githubBody = { message };
      const { results, summary } = await reconcile(declaration, {
        env: { GH_TOKEN: TOKENS.GH_TOKEN },
        fetch: fakeProviders(world).fetch,
      });
      const row = protectionOf(results);
      const label = `HTTP ${status} ${message}`;
      expect(row.status, label).toBe(STATUS.skipped);
      expect(row.detail, label).toMatch(cause);
      expect(row.detail, label).toContain(`HTTP ${status}: ${message}`);
      if (!cause.test("needs administration:read")) {
        expect(row.detail, label).not.toContain("administration:read");
      }
      expect(summary).toMatchObject({ skipped: 1, error: 0, drift: 0, total: 1 });
      expect(exitCodeFor(summary)).toBe(0);
      expect(exitCodeFor(summary, { strict: true })).toBe(1);
    }
  });

  it("falls back to gh api, and reads its stdout body and stderr status, when no token is set", async () => {
    const { reconcile, STATUS } = await loadEngine();
    const execCalls: string[][] = [];
    const gh =
      (result: ExecResult) =>
      (command: string, args: string[]): ExecResult => {
        execCalls.push([command, ...args]);
        return result;
      };
    const run = (exec: (command: string, args: string[]) => ExecResult) =>
      reconcile(declaration, {
        env: {},
        exec,
        fetch: async () => {
          throw new Error("must not fetch without a token");
        },
      });

    const green = await run(
      gh({ ok: true, stdout: JSON.stringify(liveProtection()), stderr: "", missing: false }),
    );
    expect(execCalls).toEqual([
      ["gh", "api", "repos/Nebutra/Nebutra-Sailor/branches/main/protection"],
    ]);
    expect(green.summary).toMatchObject({ ok: 4, total: 4 });

    const unprotected = await run(
      gh({
        ok: false,
        stdout: '{"message":"Branch not protected","status":"404"}',
        stderr: "gh: Branch not protected (HTTP 404)\n",
        missing: false,
      }),
    );
    expect(protectionOf(unprotected.results)).toMatchObject({
      status: STATUS.drift,
      actual: "not protected",
    });

    // gh reports the status on stderr even when stdout carries no JSON.
    const hidden = await run(
      gh({ ok: false, stdout: "", stderr: "gh: Not Found (HTTP 404)\n", missing: false }),
    );
    expect(protectionOf(hidden.results).status).toBe(STATUS.skipped);
    expect(protectionOf(hidden.results).detail).toContain("HTTP 404: Not Found");

    const loggedOut = await run(
      gh({
        ok: false,
        stdout: "",
        stderr:
          "gh: To use GitHub CLI in a GitHub Actions workflow, set the GH_TOKEN environment variable.",
        missing: false,
      }),
    );
    expect(protectionOf(loggedOut.results)).toMatchObject({ status: STATUS.skipped });
    expect(protectionOf(loggedOut.results).detail).toContain("gh is not authenticated");

    const absent = await run(
      gh({ ok: false, stdout: "", stderr: "gh: command not found", missing: true }),
    );
    expect(protectionOf(absent.results).detail).toBe("skipped: gh is not installed");
  });

  it("treats an unreachable GitHub or an unparseable answer as an error", async () => {
    const { reconcile, exitCodeFor, STATUS } = await loadEngine();
    const down = await reconcile(declaration, {
      env: { GH_TOKEN: TOKENS.GH_TOKEN },
      fetch: async () => {
        throw new Error("ECONNRESET");
      },
    });
    expect(protectionOf(down.results).status).toBe(STATUS.error);
    expect(protectionOf(down.results).detail).toContain("ECONNRESET");
    expect(exitCodeFor(down.summary)).toBe(1);

    const world = greenWorld();
    world.githubStatus = 500;
    world.githubBody = { message: "Server Error" };
    const broken = await reconcile(declaration, {
      env: { GH_TOKEN: TOKENS.GH_TOKEN },
      fetch: fakeProviders(world).fetch,
    });
    expect(protectionOf(broken.results)).toMatchObject({ status: STATUS.error });
    expect(protectionOf(broken.results).detail).toContain("HTTP 500");
  });

  it("percent-encodes a branch name that contains a slash", async () => {
    const { reconcile } = await loadEngine();
    const urls: string[] = [];
    await reconcile(
      {
        version: 1,
        github: { repo: "acme/widgets", branchProtection: [{ branch: "release/1.x" }] },
      },
      {
        env: { GITHUB_TOKEN: TOKENS.GH_TOKEN },
        fetch: async (url: string) => {
          urls.push(url);
          return response(200, liveProtection());
        },
      },
    );
    expect(urls).toEqual([
      "https://api.github.com/repos/acme/widgets/branches/release%2F1.x/protection",
    ]);
  });
});

describe("platform-reconcile: daily workflow and docs", () => {
  const workflow = readFileSync(workflowPath, "utf8");

  it("runs on a daily schedule and on demand, read-only, in strict mode", () => {
    expect(workflow).toMatch(/^\s+schedule:\n\s+- cron: "/m);
    expect(workflow).toMatch(/^\s+workflow_dispatch:/m);
    expect(workflow).toMatch(/^permissions:\n\s+contents: read/m);
    expect(workflow).toContain(
      "run: node scripts/ops/platform-reconcile.mjs ops/nebutra/platform-expected.json --strict",
    );
    expect(workflow).not.toMatch(
      /\bvercel deploy\b|\bflyctl deploy\b|\bwrangler deploy\b|secrets set|variable set/,
    );
  });

  it("uses the shared setup action, the pinned flyctl action, and the secrets deploys already hold", () => {
    expect(workflow).toContain("uses: ./.github/actions/setup-node");
    expect(workflow).toContain(
      "uses: superfly/flyctl-actions/setup-flyctl@ed8efb33836e8b2096c7fd3ba1c8afe303ebbff1",
    );
    for (const secret of [
      "VERCEL_TOKEN",
      "FLY_API_TOKEN",
      "CLOUDFLARE_API_TOKEN",
      "CLOUDFLARE_ACCOUNT_ID",
    ]) {
      expect(workflow).toContain(`secrets.${secret}`);
    }
    expect(workflow).toContain("vars.VERCEL_ORG_ID");
    // Repository variables reach the engine from the workflow's own context, so
    // the job needs no token that can read the Variables API.
    expect(workflow).toMatch(/^\s+PLATFORM_RECONCILE_GITHUB_VARS: \$\{\{ toJSON\(vars\) \}\}$/m);
    // The Actions token is never handed to the engine: variables need no
    // token, and it cannot hold the administration:read that protection needs.
    expect(workflow).not.toMatch(/GH_TOKEN: \$\{\{ (secrets\.GITHUB_TOKEN|github\.token) \}\}/);
  });

  it("declares a Nebutra branch rule only once the daily run holds a token that can read it", () => {
    // Protection needs administration:read, which the Actions GITHUB_TOKEN
    // cannot carry. A rule declared before a fine-grained token reaches the
    // Reconcile step is `skipped` on every schedule and, under --strict, a red
    // run every day — which buries real drift in every other row. The rule and
    // the token land together, never the rule first.
    const declaration = JSON.parse(readFileSync(nebutraPath, "utf8")) as Declaration;
    const handsOverToken = /^\s+GH_TOKEN: \$\{\{ secrets\.[A-Z][A-Z0-9_]* \}\}$/m.test(workflow);
    expect(
      declaredBranches(declaration) === 0 || handsOverToken,
      "ops/nebutra/platform-expected.json declares github.branchProtection but the Reconcile step of .github/workflows/platform-reconcile.yml passes no GH_TOKEN secret",
    ).toBe(true);
  });

  it("is documented where the other guardrails are", () => {
    const guardrails = readFileSync(join(root, "docs/ops/cost-guardrails.md"), "utf8");
    expect(guardrails).toContain("scripts/ops/platform-reconcile.mjs");
    expect(guardrails).toContain("platform-reconcile.yml");
    const readme = readFileSync(join(root, "ops/README.md"), "utf8");
    expect(readme).toContain("envNotSensitive");
    expect(readme).toContain("secretsAbsent");
    expect(readme).toContain("PLATFORM_RECONCILE_GITHUB_VARS");
    expect(readme).toContain("### github.branchProtection[]");
    expect(readme).toContain("administration:read");
    expect(readme).toContain("PLATFORM_RECONCILE_GH_TOKEN");
    expect(guardrails).toContain("branches/{branch}/protection");
  });
});
