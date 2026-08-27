/**
 * Safe returnUrl resolution for post-auth redirects.
 *
 * Prevents open-redirect vulnerabilities by accepting ONLY same-origin
 * relative paths. Falls back to `/` when input is missing or unsafe.
 */

const DEFAULT_FALLBACK = "/";

export interface SanitizeReturnUrlOptions {
  /**
   * Fallback path to use when the input is missing, malformed, or unsafe.
   * Must itself be a same-origin relative path starting with `/`.
   * @default "/"
   */
  fallback?: string;
  /**
   * Optional allowlist of host names that are considered safe when an
   * absolute URL is provided (e.g. `["app.nebutra.com", "nebutra.com"]`).
   * If empty or undefined, ALL absolute URLs are rejected.
   */
  allowedHosts?: readonly string[];
}

/**
 * Return a redirect target that is safe to send the browser to.
 *
 * Accepts:
 *  - Same-origin relative paths starting with a single `/` (e.g. `/dashboard`,
 *    `/dashboard?x=1#y`).
 *  - Absolute URLs whose host appears in `allowedHosts` (after canonicalization).
 *
 * Rejects (returns the fallback):
 *  - `undefined`, `null`, empty / whitespace strings.
 *  - Protocol-relative URLs like `//evil.com/x` (could redirect off-host).
 *  - URLs with explicit non-http(s) scheme (`javascript:`, `data:`, `vbscript:`,
 *    `file:`, etc.).
 *  - Backslash-prefixed paths like `\\evil.com\x` (some browsers normalize
 *    these into protocol-relative).
 *  - Anything that fails to parse as a URL.
 */
export function sanitizeReturnUrl(
  input: string | null | undefined,
  options: SanitizeReturnUrlOptions = {},
): string {
  const fallback = options.fallback ?? DEFAULT_FALLBACK;
  if (typeof input !== "string") return fallback;

  const trimmed = input.trim();
  if (trimmed === "") return fallback;

  // Reject protocol-relative URLs (//host/path) and backslash equivalents.
  if (trimmed.startsWith("//") || trimmed.startsWith("\\\\")) return fallback;
  if (trimmed.startsWith("\\")) return fallback;

  // Same-origin relative path — single leading slash, no scheme.
  if (trimmed.startsWith("/")) {
    // Use URL() with a placeholder origin to validate the structure and let it
    // normalize ".." traversal, encoded slashes, etc.
    try {
      const url = new URL(trimmed, "https://placeholder.invalid");
      if (url.origin !== "https://placeholder.invalid") return fallback;
      return `${url.pathname}${url.search}${url.hash}`;
    } catch {
      return fallback;
    }
  }

  // Absolute URL — only allowed when an allowlist is provided.
  const { allowedHosts } = options;
  if (!allowedHosts || allowedHosts.length === 0) return fallback;

  let parsed: URL;
  try {
    parsed = new URL(trimmed);
  } catch {
    return fallback;
  }

  if (parsed.protocol !== "https:" && parsed.protocol !== "http:") {
    return fallback;
  }

  const host = parsed.host.toLowerCase();
  const allowed = allowedHosts.some((h) => h.toLowerCase() === host);
  if (!allowed) return fallback;

  return parsed.toString();
}

/**
 * Extract & sanitize the `returnUrl` (or `returnTo` / `redirect`) query
 * parameter from a `Request` or URL. Returns the fallback when missing or
 * unsafe.
 */
export function getSanitizedReturnUrl(
  source: Request | URL | string,
  options: SanitizeReturnUrlOptions = {},
): string {
  const url =
    source instanceof Request
      ? new URL(source.url)
      : source instanceof URL
        ? source
        : new URL(source, "https://placeholder.invalid");
  const raw =
    url.searchParams.get("returnUrl") ??
    url.searchParams.get("returnTo") ??
    url.searchParams.get("redirect");
  return sanitizeReturnUrl(raw, options);
}
