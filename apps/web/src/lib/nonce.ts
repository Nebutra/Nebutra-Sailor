import { headers } from "next/headers";

/**
 * Retrieve the CSP nonce for the current request.
 *
 * The nonce is generated in the middleware (src/middleware.ts) and forwarded to
 * server components via the `x-nonce` request header.  Use it on any inline
 * `<script>` or `<style>` tag so the browser allows execution under the
 * Content-Security-Policy.
 *
 * Returns an empty string when the header is absent (e.g. during static
 * generation or in tests).
 */
export async function getNonce(): Promise<string> {
  // During production builds there is no request context; skip header access
  // to keep Cache Components prerendering non-blocking.
  if (process.env.NEXT_PHASE === "phase-production-build") {
    return "";
  }

  const headersList = await headers();
  return headersList.get("x-nonce") ?? "";
}
