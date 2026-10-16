/**
 * HTTP status classification, dependency-free so a self-hosted runner can
 * import it without pulling in storage, logging or tokens.
 */
import type { ServiceState } from "./math";

/**
 * A 5xx is the service failing; a 4xx is the service answering a request it
 * will not serve (a moved path, a rate limit) — reachable, but not healthy.
 */
export function classifyHttpStatus(statusCode: number): ServiceState {
  if (statusCode >= 200 && statusCode < 400) return "operational";
  if (statusCode >= 500) return "outage";
  if (statusCode >= 400) return "degraded";
  return "unknown";
}
