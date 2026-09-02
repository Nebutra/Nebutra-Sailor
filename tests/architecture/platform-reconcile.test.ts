import { readFileSync } from "node:fs";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import { describe, expect, it } from "vitest";

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
  github?: { repo?: string; variables?: Record<string, string> };
  cloudflare?: { workers: Array<{ name: string; bindings: Array<{ name: string }> }> };
};

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
  for (const worker of doc.cloudflare?.workers ?? []) count += worker.bindings.length;
  return count;
}

function declaredVariables(doc: Declaration): number {
  return Object.keys(doc.github?.variables ?? {}).length;
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
  vercelStatus?: number;
  cloudflareStatus?: number;
  cloudflareBody?: unknown;
};

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
      github: { repo: string; variables: Record<string, string> };
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
  });
});

describe("platform-reconcile: engine", () => {
  it("reports every declared check as ok when the providers agree", async () => {
    const { reconcile, loadExpectations, exitCodeFor, renderTable } = await loadEngine();
    const providers = fakeProviders(greenWorld());
    const declaration = loadExpectations(nebutraPath) as Declaration;
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
    const { results, summary } = await reconcile(loadExpectations(nebutraPath), {
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
    const { results, summary } = await reconcile(loadExpectations(nebutraPath), {
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
    const declaration = loadExpectations(nebutraPath) as Declaration;
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
    // Without a token no provider is contacted; only the local `gh` probe ran,
    // once per declared variable.
    expect(touched).toBe(declaredVariables(declaration));
    expect(summary.skipped).toBe(summary.total);
    expect(exitCodeFor(summary)).toBe(0);
    expect(exitCodeFor(summary, { strict: true })).toBe(1);
  });

  it("reports a token that lacks scope as skipped with the reason, not as a pass", async () => {
    const { reconcile, loadExpectations, STATUS } = await loadEngine();
    const declaration = loadExpectations(nebutraPath) as Declaration;
    const world = greenWorld();
    world.vercelStatus = 403;
    world.cloudflareStatus = 403;
    world.cloudflareBody = {
      success: false,
      errors: [{ code: 10000, message: "Authentication error" }],
    };
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
    // The GitHub variables, which need no provider token, are still verified.
    expect(summary.ok).toBe(declaredVariables(declaration));
    expect(summary.drift).toBe(0);
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
    const declaration = loadExpectations(nebutraPath) as Declaration;
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

    out.length = 0;
    err.length = 0;
    const code = await main([nebutraPath, "--only=github"], {
      env: { PLATFORM_RECONCILE_GITHUB_VARS: GITHUB_VARS },
      stdout,
      stderr,
    });
    expect(code).toBe(0);
    const printed = out.join("");
    expect(printed).toContain("variable DEPLOY_TARGET_GATEWAY");
    expect(printed).toContain(
      `${declaredVariables(declaration)} ok · 0 drift · 0 skipped · 0 error`,
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
    expect(workflow).not.toContain("GH_TOKEN");
  });

  it("is documented where the other guardrails are", () => {
    const guardrails = readFileSync(join(root, "docs/ops/cost-guardrails.md"), "utf8");
    expect(guardrails).toContain("scripts/ops/platform-reconcile.mjs");
    expect(guardrails).toContain("platform-reconcile.yml");
    const readme = readFileSync(join(root, "ops/README.md"), "utf8");
    expect(readme).toContain("envNotSensitive");
    expect(readme).toContain("secretsAbsent");
    expect(readme).toContain("PLATFORM_RECONCILE_GITHUB_VARS");
  });
});
