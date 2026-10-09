import type { IncomingMessage } from "node:http";

/**
 * Self-hosted Inngest (seen on v1.22 through v1.45) sends step execution as a
 * GET that carries a JSON body, signed over that body. inngest-js v4 only reads
 * the body for POST/PUT, so it verifies `"" + ts`, answers 401, and would only
 * return introspection even if the signature passed (inngest/inngest-js#1543).
 *
 * Node keeps a GET body on the socket, but @hono/node-server drops it when it
 * builds the Fetch Request. So the fix lives at the Node layer: a signed step
 * call (both run-id and signature headers present) is re-labelled POST before
 * Hono sees it. Unsigned GETs — probes, introspection — are left alone.
 */
export function rewriteInngestStepGet(req: IncomingMessage): boolean {
  if (req.method !== "GET") return false;
  const path = (req.url ?? "").split("?")[0];
  if (path !== "/api/inngest") return false;
  if (!req.headers["x-inngest-signature"] || !req.headers["x-inngest-run-id"]) return false;
  req.method = "POST";
  return true;
}
