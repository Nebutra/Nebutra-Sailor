#!/usr/bin/env node

// platform-reconcile — read-only drift check for state that lives only in a
// provider dashboard.
//
// Five incidents in one day came from settings nothing in git could see: a
// Vercel build machine auto-promoted to `turbo`, env vars flagged Sensitive so
// `vercel pull` wrote them empty, Fly secrets copied from a VM that still
// carried CACHE_BACKEND/REDIS_URL, a Cloudflare token whose scopes did not
// match what a Worker binding needed, and Git links that opened a remote build
// per project per push. None of it was declared anywhere, so nothing noticed.
//
// This engine loads an expectations file (see ops/README.md for the schema),
// asks each provider what it has, and prints one row per expectation:
//
//   ok       the provider agrees
//   drift    the provider disagrees — exit 1
//   skipped  could not ask (no token, tool missing, token lacks scope)
//            exit 0 by default, exit 1 with --strict
//   error    asked, got no usable answer (network, unparseable) — exit 1
//
// It reads only. It never prints a secret value: Fly returns names and
// digests and only names are kept; Vercel env entries are inspected for `type`
// and `target` and the `value` field is never read; GitHub variables are
// configuration, not secrets, by GitHub's own definition.
//
// Run:  node scripts/ops/platform-reconcile.mjs ops/<brand>/platform-expected.json [--strict] [--json] [--only=vercel,fly]
// Env:  VERCEL_TOKEN + VERCEL_ORG_ID (or VERCEL_TEAM_ID)
//       FLY_API_TOKEN            (flyctl reads it directly)
//       CLOUDFLARE_API_TOKEN + CLOUDFLARE_ACCOUNT_ID
//       PLATFORM_RECONCILE_GITHUB_VARS  JSON object of repo variables — a
//                                workflow passes `toJSON(vars)` so no token has
//                                to be able to read Actions variables; without
//                                it the engine shells out to `gh variable get`.
// No dependencies beyond Node 22: fetch for HTTP, child_process for flyctl/gh.

import { execFileSync } from "node:child_process";
import { appendFileSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

export const STATUS = Object.freeze({
  ok: "ok",
  drift: "drift",
  skipped: "skipped",
  error: "error",
});

export const PROVIDERS = Object.freeze(["vercel", "fly", "github", "cloudflare"]);

const VERCEL_API = "https://api.vercel.com";
const CLOUDFLARE_API = "https://api.cloudflare.com/client/v4";

// ---------------------------------------------------------------------------
// Expectations

function isPlainObject(value) {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isStringArray(value) {
  return Array.isArray(value) && value.every((item) => typeof item === "string" && item.length > 0);
}

/**
 * Returns a list of human-readable problems; empty means the document is usable.
 * Deliberately lenient: every provider section is optional, every check inside
 * a target is optional, so an expectations file can start with one line and
 * grow as incidents teach what to declare.
 */
export function validateExpectations(doc) {
  const problems = [];
  if (!isPlainObject(doc)) return ["expectations must be a JSON object"];
  if (doc.version !== 1) problems.push("version must be 1");

  const vercel = doc.vercel;
  if (vercel !== undefined) {
    if (!isPlainObject(vercel) || !Array.isArray(vercel.projects)) {
      problems.push("vercel.projects must be an array");
    } else {
      vercel.projects.forEach((project, index) => {
        const at = `vercel.projects[${index}]`;
        if (!isPlainObject(project) || typeof project.name !== "string" || !project.name) {
          problems.push(`${at}.name must be a non-empty string`);
          return;
        }
        if (
          project.buildMachineType !== undefined &&
          typeof project.buildMachineType !== "string"
        ) {
          problems.push(`${at}.buildMachineType must be a string`);
        }
        if (project.ignoreBuildStep !== undefined && typeof project.ignoreBuildStep !== "string") {
          problems.push(`${at}.ignoreBuildStep must be a string`);
        }
        if (project.gitLinked !== undefined && typeof project.gitLinked !== "boolean") {
          problems.push(`${at}.gitLinked must be a boolean`);
        }
        if (project.envNotSensitive !== undefined) {
          if (!isPlainObject(project.envNotSensitive)) {
            problems.push(`${at}.envNotSensitive must map a target to a list of env keys`);
          } else {
            for (const [target, keys] of Object.entries(project.envNotSensitive)) {
              if (!isStringArray(keys)) {
                problems.push(`${at}.envNotSensitive.${target} must be a list of env keys`);
              }
            }
          }
        }
      });
    }
  }

  const fly = doc.fly;
  if (fly !== undefined) {
    if (!isPlainObject(fly) || !Array.isArray(fly.apps)) {
      problems.push("fly.apps must be an array");
    } else {
      fly.apps.forEach((app, index) => {
        const at = `fly.apps[${index}]`;
        if (!isPlainObject(app) || typeof app.name !== "string" || !app.name) {
          problems.push(`${at}.name must be a non-empty string`);
          return;
        }
        if (app.secretsPresent !== undefined && !isStringArray(app.secretsPresent)) {
          problems.push(`${at}.secretsPresent must be a list of secret names`);
        }
        if (app.secretsAbsent !== undefined && !isStringArray(app.secretsAbsent)) {
          problems.push(`${at}.secretsAbsent must be a list of secret names`);
        }
      });
    }
  }

  const github = doc.github;
  if (github !== undefined) {
    if (!isPlainObject(github)) {
      problems.push("github must be an object");
    } else {
      if (github.repo !== undefined && !/^[\w.-]+\/[\w.-]+$/.test(String(github.repo))) {
        problems.push("github.repo must look like owner/name");
      }
      if (github.variables !== undefined) {
        if (!isPlainObject(github.variables)) {
          problems.push("github.variables must map a variable name to its expected value");
        } else {
          for (const [name, value] of Object.entries(github.variables)) {
            if (typeof value !== "string")
              problems.push(`github.variables.${name} must be a string`);
          }
        }
      }
    }
  }

  const cloudflare = doc.cloudflare;
  if (cloudflare !== undefined) {
    if (!isPlainObject(cloudflare) || !Array.isArray(cloudflare.workers)) {
      problems.push("cloudflare.workers must be an array");
    } else {
      cloudflare.workers.forEach((worker, index) => {
        const at = `cloudflare.workers[${index}]`;
        if (!isPlainObject(worker) || typeof worker.name !== "string" || !worker.name) {
          problems.push(`${at}.name must be a non-empty string`);
          return;
        }
        if (!Array.isArray(worker.bindings)) {
          problems.push(`${at}.bindings must be an array`);
          return;
        }
        worker.bindings.forEach((binding, bindingIndex) => {
          if (!isPlainObject(binding) || typeof binding.name !== "string" || !binding.name) {
            problems.push(`${at}.bindings[${bindingIndex}].name must be a non-empty string`);
          } else if (binding.type !== undefined && typeof binding.type !== "string") {
            problems.push(`${at}.bindings[${bindingIndex}].type must be a string`);
          }
        });
      });
    }
  }

  return problems;
}

export function loadExpectations(filePath) {
  const absolute = resolve(filePath);
  const doc = JSON.parse(readFileSync(absolute, "utf8"));
  const problems = validateExpectations(doc);
  if (problems.length > 0) {
    throw new Error(
      `${filePath} is not a valid expectations file:\n  - ${problems.join("\n  - ")}`,
    );
  }
  return doc;
}

// ---------------------------------------------------------------------------
// Rows

function row(provider, target, check, status, expected, actual, detail = "") {
  return {
    provider,
    target,
    check,
    status,
    expected: String(expected),
    actual: String(actual),
    detail: String(detail),
  };
}

function compare(provider, target, check, expected, actual, detail = "") {
  const status = String(expected) === String(actual) ? STATUS.ok : STATUS.drift;
  return row(provider, target, check, status, expected, actual, detail);
}

function skipped(provider, target, check, reason) {
  return row(provider, target, check, STATUS.skipped, "", "", `skipped: ${reason}`);
}

function failed(provider, target, check, reason) {
  return row(provider, target, check, STATUS.error, "", "", reason);
}

function firstLine(text) {
  return (
    String(text ?? "")
      .split("\n")
      .map((line) => line.trim())
      .find((line) => line.length > 0) ?? ""
  );
}

// ---------------------------------------------------------------------------
// Adapters — the only two things the engine does to the outside world.

function defaultExec(command, args, env) {
  try {
    const stdout = execFileSync(command, args, {
      env,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
      maxBuffer: 8 * 1024 * 1024,
    });
    return { ok: true, stdout, stderr: "", missing: false };
  } catch (error) {
    if (error && error.code === "ENOENT") {
      return { ok: false, stdout: "", stderr: `${command}: command not found`, missing: true };
    }
    return {
      ok: false,
      stdout: error?.stdout ? String(error.stdout) : "",
      stderr: error?.stderr ? String(error.stderr) : String(error?.message ?? error),
      missing: false,
    };
  }
}

async function getJson(ctx, url, headers) {
  let response;
  try {
    response = await ctx.fetch(url, {
      method: "GET",
      headers: { accept: "application/json", ...headers },
    });
  } catch (error) {
    return { ok: false, status: 0, body: null, error: String(error?.message ?? error) };
  }
  let body = null;
  try {
    body = await response.json();
  } catch {
    body = null;
  }
  return { ok: response.ok, status: response.status, body, error: "" };
}

function apiErrorMessage(result) {
  const body = result.body;
  const message =
    body?.error?.message ??
    body?.errors
      ?.map?.((entry) => `${entry.code ?? ""} ${entry.message ?? ""}`.trim())
      .join("; ") ??
    body?.message ??
    result.error;
  return message ? `HTTP ${result.status}: ${message}` : `HTTP ${result.status}`;
}

// ---------------------------------------------------------------------------
// Vercel

async function checkVercel(spec, ctx) {
  const projects = spec?.projects ?? [];
  if (projects.length === 0) return [];
  const token = ctx.env.VERCEL_TOKEN;
  if (!token) return projects.map((p) => skipped("vercel", p.name, "project", "no VERCEL_TOKEN"));

  const teamId = spec.teamId ?? ctx.env.VERCEL_TEAM_ID ?? ctx.env.VERCEL_ORG_ID ?? "";
  const query = teamId ? `?teamId=${encodeURIComponent(teamId)}` : "";
  const headers = { authorization: `Bearer ${token}` };
  const results = [];

  for (const project of projects) {
    const name = project.name;
    const projectResult = await getJson(
      ctx,
      `${VERCEL_API}/v9/projects/${encodeURIComponent(name)}${query}`,
      headers,
    );

    if (projectResult.status === 404) {
      results.push(row("vercel", name, "project", STATUS.drift, "exists", "not found"));
      continue;
    }
    if (projectResult.status === 401 || projectResult.status === 403) {
      results.push(
        skipped("vercel", name, "project", `token rejected (${apiErrorMessage(projectResult)})`),
      );
      continue;
    }
    if (!projectResult.ok || !isPlainObject(projectResult.body)) {
      results.push(failed("vercel", name, "project", apiErrorMessage(projectResult)));
      continue;
    }

    const data = projectResult.body;

    if (project.buildMachineType !== undefined) {
      const resourceConfig = isPlainObject(data.resourceConfig) ? data.resourceConfig : {};
      const actual = resourceConfig.buildMachineType ?? "(unset)";
      const selection = resourceConfig.buildMachineSelection
        ? `selection=${resourceConfig.buildMachineSelection}`
        : "";
      results.push(
        compare("vercel", name, "buildMachineType", project.buildMachineType, actual, selection),
      );
    }

    if (project.ignoreBuildStep !== undefined) {
      const actual = data.commandForIgnoringBuildStep ?? "(unset)";
      results.push(compare("vercel", name, "ignoreBuildStep", project.ignoreBuildStep, actual));
    }

    if (project.gitLinked !== undefined) {
      const link = isPlainObject(data.link) ? data.link : null;
      const linked = Boolean(link?.type);
      const detail = linked ? `${link.type}:${link.org ?? ""}/${link.repo ?? ""}` : "";
      results.push(compare("vercel", name, "gitLinked", project.gitLinked, linked, detail));
    }

    if (project.envNotSensitive) {
      // `value` is never read from these entries. Only `key`, `type`, `target`.
      const envResult = await getJson(
        ctx,
        `${VERCEL_API}/v10/projects/${encodeURIComponent(name)}/env${query}`,
        headers,
      );
      if (!envResult.ok) {
        const check = "env types";
        results.push(
          envResult.status === 401 || envResult.status === 403
            ? skipped("vercel", name, check, `token rejected (${apiErrorMessage(envResult)})`)
            : failed("vercel", name, check, apiErrorMessage(envResult)),
        );
        continue;
      }
      const envs = Array.isArray(envResult.body) ? envResult.body : (envResult.body?.envs ?? []);
      for (const [target, keys] of Object.entries(project.envNotSensitive)) {
        for (const key of keys) {
          const matches = envs.filter((entry) => {
            if (entry?.key !== key) return false;
            const targets = Array.isArray(entry.target) ? entry.target : [entry.target];
            return targets.includes(target);
          });
          const check = `env ${key}@${target}`;
          if (matches.length === 0) {
            results.push(
              row(
                "vercel",
                name,
                check,
                STATUS.drift,
                "not sensitive",
                "missing",
                "no variable on that target",
              ),
            );
            continue;
          }
          const types = [...new Set(matches.map((entry) => entry.type ?? "unknown"))];
          const sensitive = types.includes("sensitive");
          results.push(
            row(
              "vercel",
              name,
              check,
              sensitive ? STATUS.drift : STATUS.ok,
              "not sensitive",
              sensitive ? "sensitive" : types.join(","),
            ),
          );
        }
      }
    }
  }

  return results;
}

// ---------------------------------------------------------------------------
// Fly

function flySecretNames(ctx, appName) {
  let run = ctx.exec("flyctl", ["secrets", "list", "-a", appName, "--json"], ctx.env);
  if (!run.ok && run.missing) {
    run = ctx.exec("fly", ["secrets", "list", "-a", appName, "--json"], ctx.env);
  }
  if (!run.ok) {
    return { names: null, missing: run.missing, reason: firstLine(run.stderr) || "flyctl failed" };
  }
  let parsed;
  try {
    parsed = JSON.parse(run.stdout);
  } catch {
    return { names: null, missing: false, reason: "flyctl secrets list did not return JSON" };
  }
  if (!Array.isArray(parsed)) {
    return {
      names: null,
      missing: false,
      reason: "flyctl secrets list returned an unexpected shape",
    };
  }
  // Only names are kept. Digests and timestamps are dropped here so nothing
  // downstream can print them by accident.
  const names = new Set(parsed.map((entry) => entry?.Name ?? entry?.name).filter(Boolean));
  return { names, missing: false, reason: "" };
}

function checkFly(spec, ctx) {
  const apps = spec?.apps ?? [];
  if (apps.length === 0) return [];
  if (!ctx.env.FLY_API_TOKEN)
    return apps.map((app) => skipped("fly", app.name, "secrets", "no FLY_API_TOKEN"));

  const results = [];
  for (const app of apps) {
    const { names, missing, reason } = flySecretNames(ctx, app.name);
    if (!names) {
      results.push(
        missing
          ? skipped("fly", app.name, "secrets", "flyctl is not installed")
          : failed("fly", app.name, "secrets", reason),
      );
      continue;
    }
    for (const secret of app.secretsPresent ?? []) {
      results.push(
        compare(
          "fly",
          app.name,
          `secret ${secret}`,
          "present",
          names.has(secret) ? "present" : "missing",
        ),
      );
    }
    for (const secret of app.secretsAbsent ?? []) {
      results.push(
        compare(
          "fly",
          app.name,
          `secret ${secret}`,
          "absent",
          names.has(secret) ? "present" : "absent",
        ),
      );
    }
  }
  return results;
}

// ---------------------------------------------------------------------------
// GitHub

function githubVariableSource(spec, ctx) {
  const raw = ctx.env.PLATFORM_RECONCILE_GITHUB_VARS;
  if (raw) {
    let map;
    try {
      map = JSON.parse(raw);
    } catch {
      return { kind: "error", reason: "PLATFORM_RECONCILE_GITHUB_VARS is not JSON" };
    }
    if (!isPlainObject(map)) {
      return { kind: "error", reason: "PLATFORM_RECONCILE_GITHUB_VARS must be a JSON object" };
    }
    return {
      kind: "map",
      get: (name) => (name in map ? { found: true, value: String(map[name]) } : { found: false }),
    };
  }

  const repo = spec.repo ?? ctx.env.GITHUB_REPOSITORY ?? "";
  return {
    kind: "gh",
    get: (name) => {
      const args = ["variable", "get", name, ...(repo ? ["-R", repo] : [])];
      const run = ctx.exec("gh", args, ctx.env);
      if (run.ok) return { found: true, value: run.stdout.replace(/\r?\n$/, "") };
      if (run.missing) return { skip: "gh is not installed" };
      const stderr = firstLine(run.stderr);
      if (/not found/i.test(stderr)) return { found: false };
      if (/auth|401|403|token|login/i.test(stderr))
        return { skip: `gh is not authenticated (${stderr})` };
      return { error: stderr || "gh variable get failed" };
    },
  };
}

function checkGithub(spec, ctx) {
  const variables = Object.entries(spec?.variables ?? {});
  if (variables.length === 0) return [];
  const target = spec.repo ?? ctx.env.GITHUB_REPOSITORY ?? "(current repo)";
  const source = githubVariableSource(spec, ctx);
  if (source.kind === "error") {
    return variables.map(([name]) => failed("github", target, `variable ${name}`, source.reason));
  }

  const results = [];
  for (const [name, expected] of variables) {
    const check = `variable ${name}`;
    const lookup = source.get(name);
    if (lookup.skip) {
      results.push(skipped("github", target, check, lookup.skip));
      continue;
    }
    if (lookup.error) {
      results.push(failed("github", target, check, lookup.error));
      continue;
    }
    results.push(
      compare("github", target, check, expected, lookup.found ? lookup.value : "(unset)"),
    );
  }
  return results;
}

// ---------------------------------------------------------------------------
// Cloudflare

async function checkCloudflare(spec, ctx) {
  const workers = spec?.workers ?? [];
  if (workers.length === 0) return [];
  const token = ctx.env.CLOUDFLARE_API_TOKEN;
  if (!token)
    return workers.map((w) => skipped("cloudflare", w.name, "bindings", "no CLOUDFLARE_API_TOKEN"));
  const accountId = spec.accountId ?? ctx.env.CLOUDFLARE_ACCOUNT_ID;
  if (!accountId)
    return workers.map((w) =>
      skipped("cloudflare", w.name, "bindings", "no CLOUDFLARE_ACCOUNT_ID"),
    );

  const headers = { authorization: `Bearer ${token}` };
  const results = [];
  for (const worker of workers) {
    const result = await getJson(
      ctx,
      `${CLOUDFLARE_API}/accounts/${encodeURIComponent(accountId)}/workers/scripts/${encodeURIComponent(worker.name)}/settings`,
      headers,
    );
    const codes = Array.isArray(result.body?.errors) ? result.body.errors.map((e) => e?.code) : [];
    if (result.status === 401 || result.status === 403 || codes.includes(10000)) {
      results.push(
        skipped(
          "cloudflare",
          worker.name,
          "bindings",
          `token lacks Workers Scripts read (${apiErrorMessage(result)})`,
        ),
      );
      continue;
    }
    if (result.status === 404) {
      results.push(row("cloudflare", worker.name, "worker", STATUS.drift, "exists", "not found"));
      continue;
    }
    if (!result.ok || result.body?.success === false || !isPlainObject(result.body?.result)) {
      results.push(failed("cloudflare", worker.name, "bindings", apiErrorMessage(result)));
      continue;
    }
    const bindings = Array.isArray(result.body.result.bindings) ? result.body.result.bindings : [];
    for (const want of worker.bindings) {
      const found = bindings.find((binding) => binding?.name === want.name);
      const expected = want.type ?? "present";
      const actual = found ? (want.type ? (found.type ?? "unknown") : "present") : "missing";
      results.push(compare("cloudflare", worker.name, `binding ${want.name}`, expected, actual));
    }
  }
  return results;
}

// ---------------------------------------------------------------------------
// Engine

export async function reconcile(expectations, options = {}) {
  const ctx = {
    env: options.env ?? process.env,
    fetch: options.fetch ?? globalThis.fetch,
    exec: options.exec ?? defaultExec,
  };
  const only = options.only?.length ? new Set(options.only) : null;
  const wants = (provider) => !only || only.has(provider);

  const results = [];
  if (wants("vercel")) results.push(...(await checkVercel(expectations.vercel, ctx)));
  if (wants("fly")) results.push(...checkFly(expectations.fly, ctx));
  if (wants("github")) results.push(...checkGithub(expectations.github, ctx));
  if (wants("cloudflare")) results.push(...(await checkCloudflare(expectations.cloudflare, ctx)));

  return { results, summary: summarize(results) };
}

export function summarize(results) {
  const summary = { ok: 0, drift: 0, skipped: 0, error: 0, total: results.length };
  for (const result of results) summary[result.status] += 1;
  return summary;
}

export function exitCodeFor(summary, { strict = false } = {}) {
  if (summary.drift > 0 || summary.error > 0) return 1;
  if (strict && summary.skipped > 0) return 1;
  if (strict && summary.total === 0) return 1;
  return 0;
}

// ---------------------------------------------------------------------------
// Output

const COLUMNS = [
  ["provider", "PROVIDER"],
  ["target", "TARGET"],
  ["check", "CHECK"],
  ["expected", "EXPECTED"],
  ["actual", "ACTUAL"],
  ["status", "STATUS"],
  ["detail", "DETAIL"],
];

export function renderTable(results) {
  const widths = COLUMNS.map(([key, header]) =>
    Math.max(header.length, ...results.map((result) => result[key].length)),
  );
  const line = (cells) =>
    cells
      .map((cell, index) => cell.padEnd(widths[index]))
      .join("  ")
      .trimEnd();
  const out = [
    line(COLUMNS.map(([, header]) => header)),
    line(widths.map((width) => "-".repeat(width))),
  ];
  for (const result of results) out.push(line(COLUMNS.map(([key]) => result[key])));
  return out.join("\n");
}

export function renderMarkdown(results, summary) {
  const cell = (text) => text.replace(/\|/g, "\\|") || " ";
  const lines = [
    "## Platform reconcile",
    "",
    `${summary.ok} ok · ${summary.drift} drift · ${summary.skipped} skipped · ${summary.error} error`,
    "",
    `| ${COLUMNS.map(([, header]) => header).join(" | ")} |`,
    `| ${COLUMNS.map(() => "---").join(" | ")} |`,
  ];
  for (const result of results) {
    lines.push(`| ${COLUMNS.map(([key]) => cell(result[key])).join(" | ")} |`);
  }
  return `${lines.join("\n")}\n`;
}

function parseArgs(argv) {
  const options = { file: "", strict: false, json: false, only: [], help: false };
  for (const arg of argv) {
    if (arg === "--strict") options.strict = true;
    else if (arg === "--json") options.json = true;
    else if (arg === "--help" || arg === "-h") options.help = true;
    else if (arg.startsWith("--only=")) {
      options.only = arg
        .slice("--only=".length)
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean);
    } else if (arg.startsWith("--")) throw new Error(`unknown flag ${arg}`);
    else if (!options.file) options.file = arg;
    else throw new Error(`unexpected argument ${arg}`);
  }
  for (const provider of options.only) {
    if (!PROVIDERS.includes(provider)) throw new Error(`unknown provider in --only: ${provider}`);
  }
  return options;
}

const USAGE = `usage: node scripts/ops/platform-reconcile.mjs <expectations.json> [--strict] [--json] [--only=${PROVIDERS.join(",")}]

  --strict   a skipped check (no token, tool missing, token lacks scope) fails the run
  --json     print results as JSON instead of a table
  --only     run a subset of providers
`;

export async function main(argv, deps = {}) {
  const stdout = deps.stdout ?? ((text) => process.stdout.write(text));
  const stderr = deps.stderr ?? ((text) => process.stderr.write(text));
  const env = deps.env ?? process.env;

  let options;
  try {
    options = parseArgs(argv);
  } catch (error) {
    stderr(`${error.message}\n${USAGE}`);
    return 2;
  }
  if (options.help || !options.file) {
    stdout(USAGE);
    return options.help ? 0 : 2;
  }

  let expectations;
  try {
    expectations = loadExpectations(options.file);
  } catch (error) {
    stderr(`${error.message}\n`);
    return 2;
  }

  const { results, summary } = await reconcile(expectations, {
    env,
    fetch: deps.fetch,
    exec: deps.exec,
    only: options.only,
  });

  if (options.json) {
    stdout(`${JSON.stringify({ summary, results }, null, 2)}\n`);
  } else {
    stdout(`${renderTable(results)}\n\n`);
    stdout(
      `${summary.ok} ok · ${summary.drift} drift · ${summary.skipped} skipped · ${summary.error} error\n`,
    );
  }

  if (env.GITHUB_ACTIONS === "true") {
    for (const result of results) {
      if (result.status === STATUS.drift || result.status === STATUS.error) {
        stdout(
          `::error title=platform-reconcile ${result.provider}::${result.target} ${result.check}: expected ${result.expected}, actual ${result.actual} ${result.detail}\n`,
        );
      } else if (result.status === STATUS.skipped) {
        stdout(
          `::warning title=platform-reconcile ${result.provider}::${result.target} ${result.check}: ${result.detail}\n`,
        );
      }
    }
    if (env.GITHUB_STEP_SUMMARY) {
      try {
        appendFileSync(env.GITHUB_STEP_SUMMARY, renderMarkdown(results, summary));
      } catch {
        // The summary is a convenience; the exit code is the contract.
      }
    }
  }

  const code = exitCodeFor(summary, { strict: options.strict });
  if (code !== 0 && summary.drift === 0 && summary.error === 0) {
    stderr(
      summary.total === 0
        ? "strict: nothing was checked — the expectations file declares no targets\n"
        : "strict: skipped checks count as failures\n",
    );
  }
  return code;
}

const isEntrypoint =
  typeof process.argv[1] === "string" &&
  resolve(process.argv[1]) === fileURLToPath(import.meta.url);

if (isEntrypoint) {
  main(process.argv.slice(2)).then(
    (code) => process.exit(code),
    (error) => {
      process.stderr.write(`${error?.stack ?? error}\n`);
      process.exit(2);
    },
  );
}
