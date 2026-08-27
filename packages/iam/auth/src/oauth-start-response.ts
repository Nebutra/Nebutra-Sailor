import type { SignInResult } from "./types";

/**
 * Build a top-level navigation response for OAuth start.
 *
 * Better Auth social sign-in returns an authorize URL **and** must set the
 * signed state cookie. A bare `Response.redirect(url)` drops those cookies and
 * breaks the callback. Always go through this helper (or equivalent).
 */
export function buildOAuthStartRedirectResponse(
  result: Pick<SignInResult, "ok" | "redirectTo" | "headers" | "error">,
  requestUrl: string | URL,
  options?: {
    /** Where to send the browser when OAuth cannot start. Default `/sign-in`. */
    signInPath?: string;
    provider?: string;
  },
): Response {
  if (result.ok && result.redirectTo) {
    const headers = new Headers();
    appendSetCookieHeaders(headers, result.headers);
    headers.set("Location", new URL(result.redirectTo, requestUrl).toString());
    return new Response(null, { status: 302, headers });
  }

  const signInUrl = new URL(options?.signInPath ?? "/sign-in", requestUrl);
  signInUrl.searchParams.set("error", result.error?.code ?? "oauth_unavailable");
  if (options?.provider) {
    signInUrl.searchParams.set("provider", options.provider);
  }
  return Response.redirect(signInUrl, 302);
}

/** Copy every `Set-Cookie` from provider headers onto the outbound response. */
export function appendSetCookieHeaders(target: Headers, source?: Headers): void {
  if (!source) return;

  const getSetCookie = (source as Headers & { getSetCookie?: () => string[] }).getSetCookie?.bind(
    source,
  );
  if (typeof getSetCookie === "function") {
    for (const cookie of getSetCookie()) {
      if (cookie) target.append("Set-Cookie", cookie);
    }
    return;
  }

  // Fallback for older runtimes / plain Header mocks that only expose get().
  const single = source.get("set-cookie");
  if (single) target.append("Set-Cookie", single);
}
