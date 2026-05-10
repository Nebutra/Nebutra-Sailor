import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";

/**
 * Env secrets generator for create-sailor.
 *
 * Reads `.env.example` at the target root and writes a companion
 * `.env.local` with cryptographically random values injected for each
 * known secret key. `.env.example` is NOT mutated — it stays as a
 * source-controlled template.
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

/**
 * Generate `.env.local` with random values filled in for known secrets.
 *
 * @returns the secret map that was written, or `null` if `.env.example`
 *          was absent (caller can decide whether to warn).
 */
export async function generateEnvSecrets(targetDir: string): Promise<SecretMap | null> {
  const envExample = path.join(targetDir, ".env.example");
  const envLocal = path.join(targetDir, ".env.local");

  if (!fs.existsSync(envExample)) return null;

  try {
    const template = fs.readFileSync(envExample, "utf8");
    const secrets = buildSecretMap();

    // If `.env.local` already exists (e.g. `injectEnv` ran first), honour
    // it as the base so we don't trample user edits.
    const base = fs.existsSync(envLocal) ? fs.readFileSync(envLocal, "utf8") : template;

    let next = base;
    for (const key of Object.keys(secrets) as SecretName[]) {
      next = replaceSecretLine(next, key, secrets[key]);
    }

    fs.writeFileSync(envLocal, next);
    return secrets;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`[create-sailor] Failed to generate env secrets: ${message}`);
    throw new Error(`Unable to write .env.local: ${message}`);
  }
}
