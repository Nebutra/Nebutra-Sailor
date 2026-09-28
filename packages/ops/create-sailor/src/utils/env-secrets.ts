import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";

/**
 * Env secrets generator for create-sailor.
 *
 * Writes the project's `.env.local` with cryptographically random values for
 * each known secret key. `.env.example` is NOT mutated — it stays the
 * source-controlled reference of every provider key.
 *
 * Secret conventions:
 *  - 32-byte base64 (url-safe-ish, `=` padding stripped) for auth / JWT /
 *    encryption / api / session secrets.
 *  - 16-byte hex for webhook signing keys (short, easy to rotate).
 *
 * Keys we fill when present in the template:
 *  - AUTH_SECRET, NEXTAUTH_SECRET, BETTER_AUTH_SECRET
 *  - JWT_SECRET
 *  - WEBHOOK_SECRET
 *  - ENCRYPTION_KEY
 *  - API_SECRET_KEY
 *  - SESSION_SECRET
 *
 * Silent-skip semantics: if no `.env.example` exists, we do nothing (the
 * caller — `injectEnv` — may still write a minimal `.env.local`).
 */

export type SecretName =
  | "AUTH_SECRET"
  | "NEXTAUTH_SECRET"
  | "BETTER_AUTH_SECRET"
  | "JWT_SECRET"
  | "WEBHOOK_SECRET"
  | "ENCRYPTION_KEY"
  | "API_SECRET_KEY"
  | "SESSION_SECRET";

export type SecretMap = Record<SecretName, string>;

/**
 * Generate a random base64 string of `bytes` bytes of entropy.
 * Padding `=` chars are stripped so the value drops cleanly into `.env`
 * values that are wrapped in double-quotes.
 */
function base64(bytes: number): string {
  return crypto.randomBytes(bytes).toString("base64").replace(/=+$/, "");
}

function hex(bytes: number): string {
  return crypto.randomBytes(bytes).toString("hex");
}

/**
 * Build a fresh secret map. Exported so callers (e.g. rollback flows or
 * unit tests) can generate a map without touching the filesystem.
 */
export function buildSecretMap(): SecretMap {
  return {
    AUTH_SECRET: base64(32),
    NEXTAUTH_SECRET: base64(32),
    BETTER_AUTH_SECRET: base64(32),
    JWT_SECRET: base64(32),
    WEBHOOK_SECRET: hex(16),
    ENCRYPTION_KEY: base64(32),
    API_SECRET_KEY: base64(32),
    SESSION_SECRET: base64(32),
  };
}

/**
 * Escape a value for safe inclusion inside double-quoted `.env` syntax.
 * Strips `"` and `\` that the randomness will never produce, but guard
 * anyway for future-proofing against alternative encodings.
 */
function escapeEnvValue(value: string): string {
  return value.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
}

/**
 * Replace `KEY=...` lines in-place. Also handles these common shapes:
 *   KEY=
 *   KEY=""
 *   KEY="placeholder"
 *   # KEY=...  (commented — left untouched)
 */
function replaceSecretLine(content: string, key: SecretName, value: string): string {
  // Anchored, case-sensitive, multiline — skip lines starting with `#`.
  const regex = new RegExp(`^(?!#)\\s*${key}=.*$`, "gm");
  const safe = escapeEnvValue(value);
  return content.replace(regex, `${key}="${safe}"`);
}

const PREVIEW_HEADER = `# Local preview — written by create-sailor.
#
# Everything here stays on this machine. \`pnpm dev\` runs every capability on
# its local fallback (a local PGlite database, memory queue and cache, console
# email, local file storage), so nothing below is a key you need to find.
# To take a capability live, copy its key from .env.example into this file;
# \`pnpm dev\` prints which capabilities are live and which still need a key.
`;

/**
 * Generate \`.env.local\` with random values filled in for known secrets.
 *
 * A fresh project gets a short preview file: the generated secrets and
 * nothing else (\`injectEnv\` adds the local URLs). It is deliberately not a
 * copy of \`.env.example\`: that file documents every provider with
 * placeholder values (\`sk_test_xxx\`, a localhost Redis, a Docker Postgres)
 * which, copied into a live env, read as configured providers and send the
 * preview looking for services that are not running.
 *
 * When \`.env.local\` already exists its secret lines are refreshed in place
 * and everything else is left alone.
 *
 * @returns the secret map that was written, or \`null\` if \`.env.example\`
 *          was absent (the target is not a Sailor template).
 */
export async function generateEnvSecrets(targetDir: string): Promise<SecretMap | null> {
  const envExample = path.join(targetDir, ".env.example");
  const envLocal = path.join(targetDir, ".env.local");

  if (!fs.existsSync(envExample)) return null;

  try {
    const secrets = buildSecretMap();
    const keys = Object.keys(secrets) as SecretName[];

    let next: string;
    if (fs.existsSync(envLocal)) {
      next = fs.readFileSync(envLocal, "utf8");
      for (const key of keys) next = replaceSecretLine(next, key, secrets[key]);
    } else {
      const lines = keys.map((key) => `${key}="${escapeEnvValue(secrets[key])}"`);
      next = `${PREVIEW_HEADER}\n# Generated secrets\n${lines.join("\n")}\n`;
    }

    fs.writeFileSync(envLocal, next);
    return secrets;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`[create-sailor] Failed to generate env secrets: ${message}`);
    throw new Error(`Unable to write .env.local: ${message}`);
  }
}
