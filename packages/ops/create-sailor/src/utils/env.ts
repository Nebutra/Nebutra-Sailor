import fs from "node:fs";
import path from "node:path";

interface EnvConfig {
  /**
   * Written only when given. A fresh project gets `pglite:` — @nebutra/db's
   * local preview database — so the preview needs no Docker and no setup.
   */
  databaseUrl?: string;
}

/**
 * The local preview's origins — `pnpm dev` serves the site on 3000, the
 * product app on 3001 and the API gateway on 3002 (it moves them together
 * when a port is taken). Nothing here may point at a hosted deployment: a
 * fresh project's links and sign-in must land on the preview itself.
 */
export const PREVIEW_ENV: ReadonlyArray<{ name: string; value: string }> = [
  { name: "AUTH_PROVIDER", value: "better-auth" },
  { name: "NEXT_PUBLIC_AUTH_PROVIDER", value: "better-auth" },
  // Better Auth is served by the product app's origin (its /api proxies to the
  // gateway), so sign-in never leaves the preview.
  { name: "BETTER_AUTH_URL", value: "http://localhost:3001" },
  { name: "ACCESS_GATE_MODE", value: "open" },
  { name: "NEXT_PUBLIC_ACCESS_GATE_MODE", value: "open" },
  { name: "NEXT_PUBLIC_SITE_URL", value: "http://localhost:3000" },
  { name: "NEXT_PUBLIC_APP_URL", value: "http://localhost:3001" },
  { name: "NEXT_PUBLIC_API_URL", value: "http://localhost:3002" },
  { name: "LANDING_URL", value: "http://localhost:3000" },
  { name: "WEB_URL", value: "http://localhost:3001" },
  { name: "API_GATEWAY_URL", value: "http://localhost:3002" },
];

function hasEnvVar(content: string, name: string): boolean {
  return new RegExp(`^\\s*${name}\\s*=`, "m").test(content);
}

function ensureTrailingNewline(content: string): string {
  return content.endsWith("\n") ? content : `${content}\n`;
}

export async function injectEnv(targetDir: string, envConfig: EnvConfig) {
  // Write base env to the root of the initialized project
  const rootEnvPath = path.join(targetDir, ".env");
  const localEnvPath = path.join(targetDir, ".env.local");
  const rootEnv = fs.existsSync(rootEnvPath) ? fs.readFileSync(rootEnvPath, "utf8") : "";
  const localEnv = fs.existsSync(localEnvPath) ? fs.readFileSync(localEnvPath, "utf8") : "";
  const visibleEnv = `${rootEnv}\n${localEnv}`;
  const missingLines = [
    ...(envConfig.databaseUrl ? [{ name: "DATABASE_URL", value: envConfig.databaseUrl }] : []),
    ...PREVIEW_ENV,
  ]
    .filter((entry) => !hasEnvVar(visibleEnv, entry.name))
    .map((entry) => `${entry.name}="${entry.value}"`);

  if (missingLines.length === 0) return;

  const databaseNote =
    envConfig.databaseUrl || hasEnvVar(visibleEnv, "DATABASE_URL")
      ? ""
      : "# DATABASE_URL is unset: the preview runs a local PGlite database.\n";
  const pgliteNote =
    envConfig.databaseUrl === "pglite:"
      ? "# pglite: = the local preview database (PGlite, data in .nebutra/pglite/).\n# Point DATABASE_URL at your own Postgres when you have one.\n"
      : "";
  const envTemplate = `# Local preview origins\n${pgliteNote}${missingLines.join("\n")}\n${databaseNote}`;

  // Race-safe: always open/write without TOCTOU existsSync.
  try {
    const existing = fs.readFileSync(localEnvPath, "utf8");
    const prefix = ensureTrailingNewline(existing);
    fs.writeFileSync(localEnvPath, `${prefix}\n${envTemplate}`);
  } catch {
    try {
      // Prefer local when root also missing; ignore root existence race.
      fs.writeFileSync(localEnvPath, envTemplate, { flag: "wx" });
    } catch {
      const existing = fs.readFileSync(localEnvPath, "utf8");
      fs.writeFileSync(localEnvPath, `${ensureTrailingNewline(existing)}\n${envTemplate}`);
    }
  }
}
