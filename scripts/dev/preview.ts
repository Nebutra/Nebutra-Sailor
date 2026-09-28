#!/usr/bin/env tsx
/**
 * `pnpm dev` — the local preview: the product app, the site and the API
 * gateway, with no keys, no Docker and no database setup.
 *
 *   1. Loads `.env` then `.env.local` from the repo root into the processes it
 *      starts (the apps do not read the root env files themselves).
 *   2. Picks free ports — 3000 site, 3001 app, 3002 API — moving any that are
 *      taken and rewriting the localhost origins in the env to match.
 *   3. Builds the workspace packages the three apps import, JavaScript only
 *      (see prebuild.ts): the full, typed build is `pnpm build`.
 *   4. Starts the three dev servers, prints where they are and which
 *      capabilities are live, and stops all of them on Ctrl+C.
 *
 * Everything else — every app, Storybook, docs — is `pnpm dev:all`.
 *
 * Flags: --no-build (skip step 3), --only=web,landing,gateway.
 */
import { type ChildProcess, spawn, spawnSync } from "node:child_process";
import fs from "node:fs";
import net from "node:net";
import path from "node:path";
import {
  CAPABILITY_TABLE,
  type CapabilityReport,
  evaluateCapability,
  loadEnv,
} from "../../packages/ops/cli/src/utils/capabilities";
import { prebuildWorkspacePackages, readWorkspace } from "./prebuild";

const ROOT = path.resolve(__dirname, "../..");

interface PreviewApp {
  id: "landing" | "web" | "gateway";
  pkg: string;
  label: string;
  defaultPort: number;
  /** Path answered with a 200 once the server is ready. */
  readyPath: string;
}

const APPS: readonly PreviewApp[] = [
  {
    id: "web",
    pkg: "@nebutra/web",
    label: "Product app",
    defaultPort: 3001,
    readyPath: "/",
  },
  {
    id: "landing",
    pkg: "@nebutra/landing",
    label: "Site",
    defaultPort: 3000,
    readyPath: "/",
  },
  {
    id: "gateway",
    pkg: "@nebutra/gateway",
    label: "API gateway",
    defaultPort: 3002,
    readyPath: "/api/misc/health",
  },
];

// ---------------------------------------------------------------------------
// Ports
// ---------------------------------------------------------------------------

function canListen(port: number, host: string): Promise<boolean> {
  return new Promise((resolve) => {
    const server = net.createServer();
    server.once("error", (error: NodeJS.ErrnoException) =>
      // No IPv6 on this machine: nothing can be listening there either.
      resolve(error.code === "EADDRNOTAVAIL" || error.code === "EAFNOSUPPORT"),
    );
    server.once("listening", () => server.close(() => resolve(true)));
    server.listen(port, host);
  });
}

/**
 * Free on both stacks. Probing one bind is not enough: on macOS a listener
 * on 0.0.0.0:3001 does not stop a new bind on [::]:3001, and the dev server
 * would then share the port with whatever already answers there.
 */
async function isPortFree(port: number): Promise<boolean> {
  return (await canListen(port, "0.0.0.0")) && (await canListen(port, "::"));
}

/** The default port, else the same port in the next thousand (3001 → 4001 → 5001). */
async function pickPort(preferred: number, taken: Set<number>): Promise<number> {
  for (let port = preferred; port < 65_000; port += 1000) {
    if (!taken.has(port) && (await isPortFree(port))) return port;
  }
  throw new Error(`No free port for ${preferred}`);
}

// ---------------------------------------------------------------------------
// Env
// ---------------------------------------------------------------------------

function isLocalOrigin(value: string | undefined): boolean {
  if (!value) return true;
  try {
    const host = new URL(value).hostname;
    return host === "localhost" || host === "127.0.0.1";
  } catch {
    return false;
  }
}

/**
 * The env every preview process gets: the root env files, then the preview's
 * own origins. A value pointing somewhere other than localhost is the
 * developer's choice and is kept; a localhost one follows the chosen port.
 */
function buildPreviewEnv(ports: Record<PreviewApp["id"], number>): NodeJS.ProcessEnv {
  const env = loadEnv(ROOT) as NodeJS.ProcessEnv;
  const site = `http://localhost:${ports.landing}`;
  const app = `http://localhost:${ports.web}`;
  const api = `http://localhost:${ports.gateway}`;

  const origins: Record<string, string> = {
    NEXT_PUBLIC_SITE_URL: site,
    LANDING_URL: site,
    NEXT_PUBLIC_APP_URL: app,
    WEB_URL: app,
    // Better Auth is served on the app's origin (its /api proxies to the
    // gateway), so the session cookie belongs to the page that reads it.
    BETTER_AUTH_URL: app,
    NEXT_PUBLIC_API_URL: api,
    API_GATEWAY_URL: api,
  };
  for (const [key, value] of Object.entries(origins)) {
    if (isLocalOrigin(env[key])) env[key] = value;
  }

  env.NODE_ENV = "development";
  env.NEXT_TELEMETRY_DISABLED ??= "1";
  env.AUTH_PROVIDER ??= "better-auth";
  env.NEXT_PUBLIC_AUTH_PROVIDER ??= "better-auth";
  // Better Auth refuses to start without a secret; a fresh project has one in
  // .env.local, but a repo checkout may not.
  env.BETTER_AUTH_SECRET ||= "sailor-local-preview-secret-not-for-production";
  // The product app talks to the gateway through its own /api proxy.
  env.CORS_ORIGINS = [env.CORS_ORIGINS, site, app].filter(Boolean).join(",");
  return env;
}

// ---------------------------------------------------------------------------
// Capability readiness — the same rows as `nebutra status`
// ---------------------------------------------------------------------------

const DEFAULT_CAPABILITIES = [
  "auth",
  "billing",
  "email",
  "storage",
  "queue",
  "cache",
  "notifications",
  "webhooks",
  "ai",
  "mcp",
];

function readCapabilities(env: NodeJS.ProcessEnv): CapabilityReport[] {
  let names = DEFAULT_CAPABILITIES;
  const configPath = path.join(ROOT, "nebutra.config.json");
  try {
    const parsed = JSON.parse(fs.readFileSync(configPath, "utf8")) as { capabilities?: unknown };
    if (Array.isArray(parsed.capabilities)) names = parsed.capabilities.map(String);
  } catch {
    // No manifest (the source repo) — report the default set.
  }
  return names.flatMap((name) => {
    const spec = CAPABILITY_TABLE[name];
    return spec ? [evaluateCapability(name, spec, env)] : [];
  });
}

function printCapabilities(reports: CapabilityReport[]): void {
  const mark: Record<CapabilityReport["state"], string> = {
    live: "live          ",
    "local-fallback": "local fallback",
    "missing-key": "needs a key   ",
  };
  process.stdout.write("\n  Capabilities (details: nebutra status)\n");
  for (const r of reports) {
    const detail =
      r.state === "missing-key" && r.missing.length > 0
        ? `set ${r.missing.join(", ")}`
        : r.provider.join(", ");
    process.stdout.write(`    ${r.name.padEnd(14)} ${mark[r.state]}  ${detail}\n`);
  }
}

/**
 * Logos and favicons are copied into each app's public/ (gitignored) by the
 * brand package; the full build does it before `next build` / `vite build`.
 */
function syncBrandAssets(env: NodeJS.ProcessEnv): void {
  const script = path.join(ROOT, "packages/design/brand/scripts/sync-assets.ts");
  const tsx = path.join(ROOT, "node_modules/.bin/tsx");
  if (!fs.existsSync(script) || !fs.existsSync(tsx)) return;
  const result = spawnSync(tsx, [script], { cwd: ROOT, env, stdio: "ignore" });
  if (result.status !== 0)
    process.stderr.write("  [dev] brand asset sync failed — logos may be missing\n");
}

// ---------------------------------------------------------------------------
// Processes
// ---------------------------------------------------------------------------

const children: ChildProcess[] = [];
let stopping = false;

function stopAll(code: number): void {
  if (stopping) return;
  stopping = true;
  for (const child of children) {
    if (child.pid && child.exitCode === null) {
      try {
        // Negative pid: the whole process group (pnpm → next/vite/tsx).
        process.kill(-child.pid, "SIGTERM");
      } catch {
        child.kill("SIGTERM");
      }
    }
  }
  setTimeout(() => process.exit(code), 1500).unref();
}

function prefixLines(label: string, stream: NodeJS.ReadableStream, out: NodeJS.WriteStream): void {
  let buffer = "";
  stream.on("data", (chunk: Buffer) => {
    buffer += chunk.toString();
    const lines = buffer.split("\n");
    buffer = lines.pop() ?? "";
    for (const line of lines) out.write(`${label} ${line}\n`);
  });
}

function startApp(app: PreviewApp, dir: string, port: number, env: NodeJS.ProcessEnv): void {
  const child = spawn("pnpm", ["run", "dev"], {
    cwd: dir,
    env: { ...env, PORT: String(port) },
    stdio: ["ignore", "pipe", "pipe"],
    detached: process.platform !== "win32",
  });
  children.push(child);
  const label = `[${app.id}]`.padEnd(10);
  if (child.stdout) prefixLines(label, child.stdout, process.stdout);
  if (child.stderr) prefixLines(label, child.stderr, process.stderr);
  child.on("exit", (code) => {
    if (stopping) return;
    process.stderr.write(`\n${label} exited with code ${code ?? "?"} — stopping the preview.\n`);
    stopAll(code ?? 1);
  });
}

async function waitForReady(url: string, timeoutMs: number): Promise<number | null> {
  const started = Date.now();
  while (Date.now() - started < timeoutMs && !stopping) {
    try {
      const res = await fetch(url, { redirect: "manual", signal: AbortSignal.timeout(60_000) });
      if (res.status < 500) return Date.now() - started;
    } catch {
      // not listening yet
    }
    await new Promise((r) => setTimeout(r, 500));
  }
  return null;
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const skipBuild = args.includes("--no-build");
  const onlyArg = args.find((a) => a.startsWith("--only="))?.slice("--only=".length);
  const only = onlyArg ? new Set(onlyArg.split(",")) : null;

  const workspace = readWorkspace(ROOT);
  const apps = APPS.filter((app) => workspace.has(app.pkg) && (!only || only.has(app.id)));
  if (apps.length === 0) throw new Error("None of the preview apps exist in this workspace.");

  const taken = new Set<number>();
  const ports = {} as Record<PreviewApp["id"], number>;
  for (const app of APPS) {
    const port = await pickPort(app.defaultPort, taken);
    taken.add(port);
    ports[app.id] = port;
  }
  const env = buildPreviewEnv(ports);

  const started = Date.now();
  if (!skipBuild) {
    await prebuildWorkspacePackages({
      root: ROOT,
      workspace,
      apps: apps.map((app) => app.pkg),
      env,
    });
  }

  syncBrandAssets(env);

  // What the product app's /welcome page shows: the preview's own origins and
  // the capability readiness printed below.
  const reports = readCapabilities(env);
  env.VITE_SAILOR_PREVIEW = "1";
  env.VITE_SAILOR_SITE_URL = env.NEXT_PUBLIC_SITE_URL;
  env.VITE_SAILOR_API_URL = env.API_GATEWAY_URL;
  env.VITE_SAILOR_CAPABILITIES = JSON.stringify(reports);

  process.on("SIGINT", () => stopAll(0));
  process.on("SIGTERM", () => stopAll(0));

  for (const app of apps) {
    const dir = workspace.get(app.pkg)?.dir;
    if (dir) startApp(app, dir, ports[app.id], env);
  }

  const readiness = await Promise.all(
    apps.map(async (app) => {
      const url = `http://localhost:${ports[app.id]}${app.readyPath}`;
      const ms = await waitForReady(url, 300_000);
      return { app, ms };
    }),
  );
  if (stopping) return;

  const total = ((Date.now() - started) / 1000).toFixed(1);
  process.stdout.write(`\n  Sailor preview is running (${total}s)\n\n`);
  for (const { app, ms } of readiness) {
    const status = ms === null ? "not answering yet" : `ready`;
    process.stdout.write(
      `    ${app.label.padEnd(12)} http://localhost:${ports[app.id]}   ${status}\n`,
    );
  }
  if (apps.some((app) => app.id === "web")) {
    process.stdout.write(`\n  Start here: http://localhost:${ports.web}/welcome\n`);
  }
  printCapabilities(reports);
  process.stdout.write("\n  Ctrl+C stops everything.\n\n");
}

main().catch((error) => {
  process.stderr.write(`\n[dev] ${error instanceof Error ? error.message : String(error)}\n`);
  stopAll(1);
  process.exitCode = 1;
});
