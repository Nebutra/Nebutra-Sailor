/**
 * Shared plumbing for route handlers: JSON responses, page lookup, and the
 * two ways a caller proves who it is (API key or session cookie).
 */
import {
  type ApiKeyScope,
  authenticateApiKey,
  canWriteIncidents,
  getSessionMember,
  type SessionMember,
} from "./auth";
import type { StatusDb } from "./db";

export type RouteContext<P extends Record<string, string>> = { params: Promise<P> };

export function json(body: unknown, init: ResponseInit = {}): Response {
  const headers = new Headers(init.headers);
  if (!headers.has("content-type")) headers.set("content-type", "application/json; charset=utf-8");
  if (!headers.has("cache-control")) headers.set("cache-control", "no-store");
  return new Response(JSON.stringify(body), { ...init, headers });
}

export function problem(status: number, error: string, detail?: unknown): Response {
  return json({ error, ...(detail === undefined ? {} : { detail }) }, { status });
}

export async function readJson(
  request: Request,
): Promise<{ ok: true; body: unknown } | { ok: false }> {
  try {
    return { ok: true, body: await request.json() };
  } catch {
    return { ok: false };
  }
}

export interface PageRef {
  id: string;
  workspaceId: string;
  slug: string;
  title: string;
  description: string | null;
}

export async function findPage(db: StatusDb, slug: string): Promise<PageRef | null> {
  return db.page.findUnique({
    where: { slug },
    select: { id: true, workspaceId: true, slug: true, title: true, description: true },
  });
}

/**
 * Where the public page lives, for feeds and compat payloads. STATUS_PUBLIC_URL
 * is the instance's public origin (behind a proxy the request's own may be
 * internal). The default page is served at `/status` — the path existing
 * deployments, 小芽's included, already link to — and every page at `/p/<slug>`.
 */
export function publicPageUrl(request: Request, slug: string): string {
  const configured = process.env.STATUS_PUBLIC_URL?.trim().replace(/\/+$/, "");
  const base = configured || new URL(request.url).origin;
  return slug === process.env.STATUS_DEFAULT_PAGE?.trim()
    ? `${base}/status`
    : `${base}/p/${encodeURIComponent(slug)}`;
}

export type Caller =
  | { kind: "key"; keyId: string; workspaceId: string }
  | { kind: "member"; member: SessionMember };

/**
 * A cookie-authenticated write must come from this origin. SameSite=Lax
 * already withholds the cookie from cross-site POSTs; this closes the
 * remaining same-site-but-different-origin gap.
 */
function sameOrigin(request: Request): boolean {
  const origin = request.headers.get("origin");
  if (!origin) return request.method === "GET" || request.method === "HEAD";
  const host = request.headers.get("x-forwarded-host") ?? request.headers.get("host");
  try {
    return new URL(origin).host === (host ?? new URL(request.url).host);
  } catch {
    return false;
  }
}

/**
 * Authorise a caller against a workspace: an API key with `scope`, or a
 * signed-in member who passes `memberCheck`. Returns a Response to send back
 * when the caller is refused.
 */
export async function authorize(
  db: StatusDb,
  request: Request,
  workspaceId: string,
  scopes: ApiKeyScope[],
  memberCheck: (member: SessionMember) => boolean = canWriteIncidents,
): Promise<Caller | Response> {
  const authorization = request.headers.get("authorization");
  if (authorization) {
    for (const scope of scopes) {
      const key = await authenticateApiKey(db, authorization, scope);
      if (!key) continue;
      if (key.workspaceId !== workspaceId) return problem(403, "forbidden");
      return { kind: "key", keyId: key.id, workspaceId: key.workspaceId };
    }
    return problem(401, "unauthorized");
  }
  const member = await getSessionMember(db, request.headers.get("cookie"));
  if (!member) return problem(401, "unauthorized");
  if (member.workspaceId !== workspaceId || !memberCheck(member)) return problem(403, "forbidden");
  if (!sameOrigin(request)) return problem(403, "cross_origin");
  return { kind: "member", member };
}

/** ISO 8601 with milliseconds, or null. */
export function iso(date: Date | null | undefined): string | null {
  return date ? date.toISOString() : null;
}
