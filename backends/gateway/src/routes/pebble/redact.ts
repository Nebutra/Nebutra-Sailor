/**
 * Redaction for Pebble support data before it reaches durable logs.
 *
 * The contract is explicit that submissions, identity, and attachments are
 * private support data and must not land in analytics, issue trackers, or
 * access logs. Everything the gateway logs about a submission goes through
 * here first — we log that a thing happened and how big it was, never what it
 * said.
 */

const HOME_PATH = /(?:\/(?:Users|home)\/|[A-Za-z]:\\Users\\)[^\s"',;)\]]+/g;
const EMAIL = /[\w.+-]+@[\w-]+\.[\w.-]+/g;
// Common secret shapes: bearer/api keys, long opaque tokens, private key blocks.
const BEARER = /\b(?:bearer\s+)[A-Za-z0-9._~+/-]{8,}=*/gi;
const KEYED_SECRET =
  /\b(api[_-]?key|secret|token|password|passwd|authorization)\b\s*[:=]\s*"?[^\s"',;)\]]+"?/gi;
const PRIVATE_KEY_BLOCK = /-----BEGIN[^-]*PRIVATE KEY-----[\s\S]*?-----END[^-]*PRIVATE KEY-----/g;

/** Replace secrets and local paths in free text destined for a log line. */
export function redact(value: string): string {
  return value
    .replace(PRIVATE_KEY_BLOCK, "[redacted:private-key]")
    .replace(BEARER, "[redacted:bearer]")
    .replace(KEYED_SECRET, (_m, key: string) => `${key}=[redacted]`)
    .replace(EMAIL, "[redacted:email]")
    .replace(HOME_PATH, "[redacted:path]");
}

/**
 * A log-safe fingerprint of a submission. Deliberately excludes the message,
 * the contact address, and the bundle body — a support agent looks those up
 * through the database with an audited role, not by grepping logs.
 */
export function submissionLogFields(input: {
  submissionId: string;
  appVersion?: string | null | undefined;
  platform?: string | null | undefined;
  bytes?: number | undefined;
}): Record<string, string | number> {
  const fields: Record<string, string | number> = { submissionId: input.submissionId };
  if (input.appVersion) fields["appVersion"] = redact(input.appVersion);
  if (input.platform) fields["platform"] = redact(input.platform);
  if (typeof input.bytes === "number") fields["bytes"] = input.bytes;
  return fields;
}
