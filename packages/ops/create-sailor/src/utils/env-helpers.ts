/**
 * Shared env-file + package-prune helpers for create-sailor provider utilities.
 *
 * Used by L2 "meta + env injection + prune" appliers (notifications, webhooks,
 * cms, feature-flags, captcha). Idempotent: re-running yields the same file.
 */

import fs from "node:fs";
import path from "node:path";

export interface EnvProviderBlock {
  name: string;
  envVars: string[];
  docs: string;
  /** Optional category label used in the header marker (defaults to name). */
  category?: string;
}

/**
 * Append a commented block of env variables to `.env.example`. Silent no-op
 * when the env file does not exist or the block is already present.
 */
export function appendEnvBlock(targetDir: string, provider: EnvProviderBlock): void {
  const envPath = path.join(targetDir, ".env.example");
  if (!fs.existsSync(envPath)) return;
  if (provider.envVars.length === 0) return;

  const category = provider.category ?? provider.name;
  const marker = `# ${category}: ${provider.name}`;
  const existing = fs.readFileSync(envPath, "utf-8");
  if (existing.includes(marker)) return;

  const lines: (string | null)[] = [
    "",
    "# =============================================",
    marker,
    provider.docs ? `# Docs: ${provider.docs}` : null,
    "# =============================================",
    ...provider.envVars.map((v) => `${v}=""`),
    "",
  ];
  const block = lines.filter((l): l is string => l !== null).join("\n");
  fs.appendFileSync(envPath, block);
}

/**
 * Upsert a single `KEY="value"` line in `.env.example`. Preserves existing
 * formatting and never duplicates keys. Silent no-op when the file is missing.
 */
export function setEnvVar(targetDir: string, key: string, value: string): void {
  const envPath = path.join(targetDir, ".env.example");
  if (!fs.existsSync(envPath)) return;

  const existing = fs.readFileSync(envPath, "utf-8");
  const line = `${key}="${value}"`;
  const regex = new RegExp(`^${key}=.*$`, "m");

  if (regex.test(existing)) {
    fs.writeFileSync(envPath, existing.replace(regex, line));
    return;
  }

  const suffix = existing.endsWith("\n") ? "" : "\n";
  fs.appendFileSync(envPath, `${suffix}${line}\n`);
}

/**
 * Categorized monorepo layout (post W3b): every package lives under one of
 * these top-level category dirs. Older scaffolds may still use the flat
 * `packages/<name>` layout, so we check both.
 */
const PACKAGE_CATEGORIES = [
  "design",
  "iam",
  "commerce",
  "integrations",
  "platform",
  "ops",
  "ai",
] as const;

/**
 * Resolve a package's directory regardless of categorized vs flat layout.
 * Looks under each known category in order, then falls back to flat
 * `packages/<pkgName>`. Returns null when nothing exists — caller silent-skips.
 */
export function resolvePackageDir(targetDir: string, pkgName: string): string | null {
  for (const category of PACKAGE_CATEGORIES) {
    const categorized = path.join(targetDir, "packages", category, pkgName);
    if (fs.existsSync(categorized)) return categorized;
  }
  const flat = path.join(targetDir, "packages", pkgName);
  if (fs.existsSync(flat)) return flat;
  return null;
}

/**
 * Remove a package directory regardless of layout. Silent no-op when missing.
 *
 * Post W3b reorg: scans packages/{design,iam,commerce,integrations,platform,
 * ops,ai}/<pkgName> before falling back to flat packages/<pkgName>.
 */
export function removePackageDir(targetDir: string, pkgName: string): void {
  const pkgPath = resolvePackageDir(targetDir, pkgName);
  if (pkgPath) {
    fs.rmSync(pkgPath, { recursive: true, force: true });
  }
}

/**
 * Remove `apps/<appName>` from the scaffolded project. Silent no-op when the
 * directory does not exist.
 */
export function removeAppDir(targetDir: string, appName: string): void {
  const appPath = path.join(targetDir, "apps", appName);
  if (fs.existsSync(appPath)) {
    fs.rmSync(appPath, { recursive: true, force: true });
  }
}
