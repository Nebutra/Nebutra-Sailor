import { isStartupOSPrototypeEnabled } from "@nebutra/startup-os/feature-flag";

export const STARTUP_OS_HOME_PATH = "/startup-os" as const;
export const FALLBACK_AUTHENTICATED_HOME_PATH = "/integrations" as const;

export type AuthenticatedHomePath =
  | typeof STARTUP_OS_HOME_PATH
  | typeof FALLBACK_AUTHENTICATED_HOME_PATH;

/**
 * Post-login / `/workspace` landing path.
 *
 * Product home converged into Startup OS, but that surface stays private in
 * production unless `STARTUP_AGENT_OS_PROTOTYPE=1`. Sending every login to
 * `/startup-os` while the page `notFound()`s is a 404 loop (Back to dashboard
 * → `/workspace` → `/startup-os`). Land on Connectors instead — it is always
 * in the production Product nav.
 */
export function resolveAuthenticatedHomePath(
  env: { readonly NODE_ENV?: string; readonly STARTUP_AGENT_OS_PROTOTYPE?: string } = process.env,
): AuthenticatedHomePath {
  return isStartupOSPrototypeEnabled(env) ? STARTUP_OS_HOME_PATH : FALLBACK_AUTHENTICATED_HOME_PATH;
}
