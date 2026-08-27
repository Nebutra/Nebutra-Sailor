#!/usr/bin/env tsx
/**
 * Nebutra-Sailor — First-run setup script
 *
 * Validates the developer's environment and guides them through
 * initial configuration. Run via: pnpm setup
 *
 * Checks:
 * 1. Node.js version (>=20.9)
 * 2. pnpm version (>=10)
 * 3. .env.local existence and required vars
 * 4. Database connectivity (Prisma)
 * 5. Optional service availability (Redis, Stripe, etc.)
 */

import { execSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

const ROOT = path.resolve(import.meta.dirname, "..");
const ENV_FILE = path.join(ROOT, ".env.local");
const ENV_EXAMPLE = path.join(ROOT, ".env.example");

// ── ANSI helpers ─────────────────────────────────────────────────────────────

const green = (s: string) => `\x1b[32m${s}\x1b[0m`;
const red = (s: string) => `\x1b[31m${s}\x1b[0m`;
const yellow = (s: string) => `\x1b[33m${s}\x1b[0m`;
const dim = (s: string) => `\x1b[2m${s}\x1b[0m`;
const bold = (s: string) => `\x1b[1m${s}\x1b[0m`;

function pass(msg: string) {
  process.stdout.write(`  ${green("✓")} ${msg}\n`);
}
function fail(msg: string) {
  process.stdout.write(`  ${red("✗")} ${msg}\n`);
}
function warn(msg: string) {
  process.stdout.write(`  ${yellow("!")} ${msg}\n`);
}
function info(msg: string) {
  process.stdout.write(`  ${dim(msg)}\n`);
}

// ── Check functions ──────────────────────────────────────────────────────────

interface CheckResult {
  ok: boolean;
  message: string;
  fix?: string;
}

function checkNodeVersion(): CheckResult {
  const version = process.version;
  const [major] = version.slice(1).split(".").map(Number);
  if ((major ?? 0) >= 20) {
    return { ok: true, message: `Node.js ${version}` };
  }
  return {
    ok: false,
    message: `Node.js ${version} — requires >=20.9`,
    fix: "Install Node.js 20+ via nvm: nvm install 20",
  };
}

function checkPnpmVersion(): CheckResult {
  try {
    const version = execSync("pnpm --version", { encoding: "utf8" }).trim();
    const [major] = version.split(".").map(Number);
    if ((major ?? 0) >= 10) {
      return { ok: true, message: `pnpm ${version}` };
    }
    return {
      ok: false,
      message: `pnpm ${version} — requires >=10`,
      fix: "npm install -g pnpm@latest",
    };
  } catch {
    return {
      ok: false,
      message: "pnpm not found",
      fix: "npm install -g pnpm",
    };
  }
}

function checkEnvFile(): CheckResult {
  if (fs.existsSync(ENV_FILE)) {
    return { ok: true, message: ".env.local exists" };
  }
  if (fs.existsSync(ENV_EXAMPLE)) {
    return {
      ok: false,
      message: ".env.local not found",
      fix: `cp .env.example .env.local && edit .env.local`,
    };
  }
  return {
    ok: false,
    message: ".env.local not found (no .env.example either)",
    fix: "Create .env.local with required variables",
  };
}

function checkRequiredEnvVars(): CheckResult {
  if (!fs.existsSync(ENV_FILE)) {
    return { ok: false, message: "Cannot check env vars — .env.local missing" };
  }

  const content = fs.readFileSync(ENV_FILE, "utf8");
  const vars = new Map<string, string>();
  for (const line of content.split("\n")) {
    const match = line.match(/^([A-Z_][A-Z0-9_]*)=(.*)$/);
    if (match) {
      vars.set(match[1]!, match[2]!.replace(/^["']|["']$/g, ""));
    }
  }

  const required = ["DATABASE_URL"];
  const missing = required.filter((v) => !vars.get(v));

  if (missing.length === 0) {
    return { ok: true, message: "Required env vars present (DATABASE_URL)" };
  }
  return {
    ok: false,
    message: `Missing required env vars: ${missing.join(", ")}`,
    fix: "Add these to .env.local",
  };
}

function checkOptionalServices(): CheckResult[] {
  if (!fs.existsSync(ENV_FILE)) return [];

  const content = fs.readFileSync(ENV_FILE, "utf8");
  const results: CheckResult[] = [];

  const services = [
    { key: "RESEND_API_KEY", name: "Email (Resend)", fallback: "Console provider used in dev" },
    { key: "STRIPE_SECRET_KEY", name: "Billing (Stripe)", fallback: "Billing disabled" },
    {
      key: "NEXT_PUBLIC_SENTRY_DSN",
      name: "Error Monitoring (Sentry)",
      fallback: "Errors logged to console",
    },
    {
      key: "BLOB_READ_WRITE_TOKEN",
      name: "File Uploads (Vercel Blob)",
      fallback: "Local filesystem used",
    },
    { key: "OPENROUTER_API_KEY", name: "AI Chat (OpenRouter)", fallback: "AI features disabled" },
  ];

  for (const svc of services) {
    if (
      content.includes(`${svc.key}=`) &&
      !content.includes(`${svc.key}=\n`) &&
      !content.includes(`${svc.key}=""\n`)
    ) {
      results.push({ ok: true, message: `${svc.name} configured` });
    } else {
      results.push({ ok: true, message: `${svc.name} — ${dim(svc.fallback)}` });
    }
  }

  return results;
}

function checkDatabase(): CheckResult {
  try {
    execSync("pnpm --filter @nebutra/db exec prisma db pull --force 2>/dev/null", {
      cwd: ROOT,
      timeout: 10000,
      stdio: "pipe",
    });
    return { ok: true, message: "Database connected (Prisma)" };
  } catch {
    return {
      ok: false,
      message: "Database not reachable",
      fix: "Ensure DATABASE_URL in .env.local points to a running PostgreSQL instance",
    };
  }
}

// ── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  process.stdout.write(`\n${bold("Nebutra-Sailor Setup Check")}\n\n`);
  process.stdout.write(`${dim("Validating your development environment...")}\n\n`);

  let hasErrors = false;

  // Required checks
  process.stdout.write(`${bold("Prerequisites")}\n`);
  const checks = [checkNodeVersion(), checkPnpmVersion(), checkEnvFile(), checkRequiredEnvVars()];

  for (const result of checks) {
    if (result.ok) {
      pass(result.message);
    } else {
      fail(result.message);
      if (result.fix) info(`  Fix: ${result.fix}`);
      hasErrors = true;
    }
  }

  // Optional services
  process.stdout.write(`\n${bold("Optional Services")}\n`);
  const optionals = checkOptionalServices();
  for (const result of optionals) {
    if (result.ok) pass(result.message);
    else warn(result.message);
  }

  // Database (only if env file exists)
  if (fs.existsSync(ENV_FILE)) {
    process.stdout.write(`\n${bold("Database")}\n`);
    const dbResult = checkDatabase();
    if (dbResult.ok) {
      pass(dbResult.message);
    } else {
      warn(dbResult.message);
      if (dbResult.fix) info(`  Fix: ${dbResult.fix}`);
    }
  }

  // Summary
  process.stdout.write("\n");
  if (hasErrors) {
    process.stdout.write(
      `${red("✗")} Some checks failed. Fix the issues above and re-run: ${bold("pnpm setup")}\n\n`,
    );
    process.exit(1);
  } else {
    process.stdout.write(`${green("✓")} All checks passed! Start developing:\n\n`);
    process.stdout.write(`  ${dim("$")} pnpm dev          ${dim("# Start all dev servers")}\n`);
    process.stdout.write(`  ${dim("$")} pnpm dev:web      ${dim("# Start dashboard only")}\n`);
    process.stdout.write(`  ${dim("$")} pnpm dev:landing  ${dim("# Start landing page only")}\n`);
    process.stdout.write(`  ${dim("$")} pnpm storybook    ${dim("# Start Storybook")}\n\n`);
  }
}

main().catch((err) => {
  process.stderr.write(`Setup script error: ${err}\n`);
  process.exit(1);
});
