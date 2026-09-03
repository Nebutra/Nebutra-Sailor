/**
 * Permissions ratchet — gateway mutation routes (closure phase, P1).
 *
 * Statically scans `backends/gateway/src/routes/**\/*.ts` (tests excluded) for
 * mutation route registrations and asks, for each one, whether its handler
 * chain carries an AUTHORIZATION decision — a middleware that can answer 403
 * based on *who* the caller is, not merely that *someone* is logged in.
 *
 * Two registration styles exist in the gateway and both are scanned:
 *
 *   router.post("/path", mw?, handler)                 // plain Hono
 *   createRoute({ method: "post", path, middleware? }) // @hono/zod-openapi
 *
 * A route's chain is: every `router.use(pattern, ...)` in the same file whose
 * pattern matches the route path (Hono semantics: `*`, `/prefix/*`, `:param`,
 * else exact) + middleware passed inline + the `middleware:` array of its
 * `createRoute` definition. Local identifiers in that chain are resolved one
 * file deep (`function requireX`, `const mw = factory(...)`) so a hand-rolled
 * guard is recognised by what it does, not by its name.
 *
 * Guard vocabulary (see AUTHZ_MARKERS) — what counts as "guarded":
 *   - requirePermission(…)                middlewares/permissions.ts (CASL/OpenFGA)
 *   - requireRole(…)                      middlewares/tenantContext.ts
 *   - mapTenantRoleToPermissionRoles(…)   role check built on the tenantContext
 *                                         mapping (billing `requireBillingManage`)
 *   - x-admin-key + ADMIN_API_KEY         platform-operator key (routes/admin)
 *
 * NOT guards (see IDENTITY_MARKERS) — they gate on *something*, but not on who
 * the caller is; any org member, including `org:viewer`, passes them:
 *   requireAuth, requireOrganization, requireTenant, the AI-gateway API-key
 *   pipeline (createGatewayPipelineMiddleware), and requireFeature — a PLAN
 *   gate (middlewares/entitlements.ts reads tenant.plan and the usage meter,
 *   never the caller's role). Routes carrying only these are listed in
 *   KNOWN_UNGUARDED with their identity checks so a reviewer can see how
 *   exposed each entry is.
 *
 * Structural exemptions are RULES (see STRUCTURAL_EXEMPTIONS), each scoped to
 * the file AND path it was verified for, and each requiring the verification
 * it relies on to be present in that file's source; there is no per-route
 * allowlist. A new file under `webhooks/` or `auth/` is NOT exempt by location.
 *
 * Non-literal registrations fail loudly. `router.post(PATH, h)`,
 * `` router.delete(`/${base}/x`, h) ``, `router.on(METHODS, "/x", h)` and
 * `createRoute({ method: "post", path: SOME_CONST })` cannot be matched
 * against `.use()` patterns, so each is recorded as an unguarded route at
 * `<non-literal:line N>` and (a) tells the author to use a string literal.
 * A receiver counts as a router when it is declared `new Hono()` /
 * `new OpenAPIHono()` in the same file or is named app/router/routes/api/
 * *Routes/*Router/*App — so `kv.put(KEY, v)` and `client.post(url, body)` are
 * not mistaken for routes.
 *
 * The ratchet is shrink-only:
 *   (a) a mutation route that is neither guarded nor exempt and not in
 *       KNOWN_UNGUARDED fails — guard it, do not extend the list;
 *   (b) a KNOWN_UNGUARDED entry that is now guarded, exempt, or gone fails —
 *       delete the entry;
 *   (c) a KNOWN_UNGUARDED entry whose identity checks changed fails —
 *       update the entry (or better: guard the route and delete it).
 *
 * Handler-body checks (e.g. `hasScope(...)` inside the handler) are invisible
 * to this scan on purpose: lift them into the chain so they are reviewable.
 *
 * Template safety: this test ships in every create-sailor scaffold, which
 * strips the product route directories listed in TEMPLATE_STRIPPED_ROUTE_DIRS
 * (and `.templateignore` itself). In a scaffold, KNOWN_UNGUARDED entries under
 * those directories are "stripped", not "gone", and the anchors on them are
 * skipped; everything else ratchets exactly as in the source repo.
 */
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { describe, expect, it } from "vitest";

const ROOT = join(import.meta.dirname, "../..");
const ROUTES_DIR = join(ROOT, "backends/gateway/src/routes");

const MUTATION_METHODS = new Set(["POST", "PUT", "PATCH", "DELETE"]);

// ── Template safety ────────────────────────────────────────────────────────

/**
 * Route directories `.templateignore` strips from a create-sailor scaffold
 * ("Product-only gateway routes"). Pinned to `.templateignore` by a test below
 * in the source repo. A scaffold has no `.templateignore` (it is stripped
 * too), so its absence is how a scaffold is recognised.
 */
const TEMPLATE_STRIPPED_ROUTE_DIRS: readonly string[] = ["agent-runtime", "pebble", "startup-os"];
const IS_SCAFFOLD = !existsSync(join(ROOT, ".templateignore"));

/** True in a scaffold for an entry whose (template-stripped) route directory is absent. */
function strippedInScaffold(file: string): boolean {
  const top = file.split("/")[0] ?? "";
  return (
    IS_SCAFFOLD && TEMPLATE_STRIPPED_ROUTE_DIRS.includes(top) && !existsSync(join(ROUTES_DIR, top))
  );
}

// ── Baseline ───────────────────────────────────────────────────────────────

interface KnownUnguarded {
  /** Path relative to backends/gateway/src/routes, posix separators. */
  file: string;
  method: string;
  /** Route path as registered on its router (mount prefix not included). */
  path: string;
  /** Identity checks present in the chain, `+`-joined in IDENTITY_MARKERS order; "none" if anonymous. */
  identity: string;
}

/**
 * Recorded 2026-09-03 from origin/main (df262cd7f), re-verified on 54af3a8c1:
 * 38 unguarded mutation routes. Shrink-only: delete an entry when its route
 * gains a guard (or is removed); never add one.
 */
const KNOWN_UNGUARDED: readonly KnownUnguarded[] = [
  {
    file: "agent-runtime/index.ts",
    method: "POST",
    path: "/carina/approvals",
    identity: "requireAuth",
  },
  { file: "agent-runtime/index.ts", method: "POST", path: "/turns", identity: "requireAuth" },
  { file: "agents/index.ts", method: "POST", path: "/chat", identity: "requireAuth" },
  {
    file: "agents/index.ts",
    method: "DELETE",
    path: "/conversations/:id",
    identity: "requireAuth",
  },
  {
    file: "ai/api-keys.ts",
    method: "POST",
    path: "/",
    identity: "requireAuth+requireOrganization",
  },
  {
    file: "ai/api-keys.ts",
    method: "DELETE",
    path: "/:id",
    identity: "requireAuth+requireOrganization",
  },
  {
    file: "ai/api-keys.ts",
    method: "PATCH",
    path: "/:id",
    identity: "requireAuth+requireOrganization",
  },
  { file: "ai/gateway.ts", method: "POST", path: "/chat/completions", identity: "api-key" },
  { file: "ai/index.ts", method: "POST", path: "/chat", identity: "requireAuth" },
  { file: "ai/index.ts", method: "POST", path: "/embeddings", identity: "requireAuth" },
  {
    file: "billing/credits.ts",
    method: "POST",
    path: "/checkout",
    identity: "requireAuth+requireOrganization",
  },
  {
    file: "billing/usage.ts",
    method: "POST",
    path: "/usage",
    identity: "requireAuth+requireOrganization",
  },
  { file: "events/ingest.ts", method: "POST", path: "/ingest", identity: "requireAuth" },
  {
    file: "integrations/index.ts",
    method: "POST",
    path: "/",
    identity: "requireAuth+requireOrganization",
  },
  {
    file: "integrations/index.ts",
    method: "PATCH",
    path: "/:id",
    identity: "requireAuth+requireOrganization",
  },
  {
    file: "integrations/index.ts",
    method: "DELETE",
    path: "/:id",
    identity: "requireAuth+requireOrganization",
  },
  {
    file: "legal/consent.ts",
    method: "POST",
    path: "/consent",
    identity: "requireAuth+requireOrganization",
  },
  {
    file: "legal/consent.ts",
    method: "DELETE",
    path: "/consent",
    identity: "requireAuth+requireOrganization",
  },
  { file: "legal/consent.ts", method: "POST", path: "/cookie-consent", identity: "none" },
  { file: "legal/consent.ts", method: "POST", path: "/contact", identity: "none" },
  {
    file: "notifications/index.ts",
    method: "POST",
    path: "/mark-read",
    identity: "requireAuth+requireOrganization",
  },
  {
    file: "notifications/index.ts",
    method: "POST",
    path: "/mark-all-read",
    identity: "requireAuth+requireOrganization",
  },
  {
    file: "notifications/index.ts",
    method: "POST",
    path: "/settings",
    identity: "requireAuth+requireOrganization",
  },
  { file: "search/index.ts", method: "POST", path: "/", identity: "requireAuth" },
  { file: "search/index.ts", method: "POST", path: "/sync", identity: "requireAuth" },
  {
    file: "startup-os/index.ts",
    method: "POST",
    path: "/projects",
    identity: "requireAuth+requireOrganization",
  },
  {
    file: "startup-os/index.ts",
    method: "PATCH",
    path: "/projects/:projectId/files",
    identity: "requireAuth+requireOrganization",
  },
  {
    file: "startup-os/index.ts",
    method: "PATCH",
    path: "/projects/:projectId/canvas",
    identity: "requireAuth+requireOrganization",
  },
  {
    file: "startup-os/index.ts",
    method: "PATCH",
    path: "/projects/:projectId/context",
    identity: "requireAuth+requireOrganization",
  },
  {
    file: "startup-os/index.ts",
    method: "POST",
    path: "/projects/:projectId/context",
    identity: "requireAuth+requireOrganization",
  },
  {
    file: "startup-os/index.ts",
    method: "POST",
    path: "/projects/:projectId/review",
    identity: "requireAuth+requireOrganization",
  },
  {
    file: "startup-os/index.ts",
    method: "POST",
    path: "/projects/:projectId/revert",
    identity: "requireAuth+requireOrganization",
  },
  {
    file: "startup-os/index.ts",
    method: "POST",
    path: "/projects/:projectId/runs/:runId/execute",
    identity: "requireAuth+requireOrganization",
  },
  {
    file: "startup-os/index.ts",
    method: "POST",
    path: "/projects/:projectId/chat",
    identity: "requireAuth+requireOrganization",
  },
  {
    file: "tasks/index.ts",
    method: "POST",
    path: "/",
    identity: "requireAuth+requireOrganization",
  },
  {
    file: "tasks/index.ts",
    method: "POST",
    path: "/:taskId/cancel",
    identity: "requireAuth+requireOrganization",
  },
  {
    file: "uploads/index.ts",
    method: "POST",
    path: "/presign",
    identity: "requireAuth+requireOrganization",
  },
  {
    file: "uploads/index.ts",
    method: "POST",
    path: "/complete",
    identity: "requireAuth+requireOrganization",
  },
];

// ── Guard vocabulary ───────────────────────────────────────────────────────

interface Marker {
  id: string;
  test: (chainText: string) => boolean;
  why: string;
}

/** Authorization decisions. A route whose chain contains any of these is guarded. */
const AUTHZ_MARKERS: readonly Marker[] = [
  {
    id: "requirePermission",
    test: (t) => /\brequirePermission\s*\(/.test(t),
    why: "middlewares/permissions.ts — CASL/OpenFGA (action, resource) check, 401/403",
  },
  {
    id: "requireRole",
    test: (t) => /\brequireRole\s*\(/.test(t),
    why: "middlewares/tenantContext.ts — org role allow-list, 401/403",
  },
  {
    id: "role-check",
    test: (t) => /\bmapTenantRoleToPermissionRoles\s*\(/.test(t),
    why: "hand-rolled role check on the tenantContext role mapping (billing requireBillingManage)",
  },
  {
    id: "admin-key",
    test: (t) => /x-admin-key/.test(t) && /\bADMIN_API_KEY\b/.test(t),
    why: "routes/admin — platform-operator X-Admin-Key compared to env.ADMIN_API_KEY, 401",
  },
];

/** Authentication / plan gates only. Reported for context; never sufficient on their own. */
const IDENTITY_MARKERS: readonly Marker[] = [
  { id: "requireAuth", test: (t) => /\brequireAuth\b/.test(t), why: "tenant.userId present" },
  {
    id: "requireOrganization",
    test: (t) => /\brequireOrganization\b/.test(t),
    why: "tenant.organizationId present",
  },
  { id: "requireTenant", test: (t) => /\brequireTenant\b/.test(t), why: "tenant.tenantId present" },
  {
    id: "api-key",
    test: (t) => /\bcreateGatewayPipelineMiddleware\s*\(/.test(t),
    why: "@nebutra/gateway-core API-key resolution (401); scopes are checked in handlers",
  },
  {
    id: "requireFeature",
    test: (t) => /\brequireFeature\s*\(/.test(t),
    // Deliberately NOT an authorization guard: entitlements.ts answers 402/403
    // from tenant.plan + the usage meter. An org:viewer on a PRO plan passes.
    why: "middlewares/entitlements.ts — plan entitlement + usage quota; not a role check",
  },
];

// ── Structural exemptions (rules, each verified against the code it names) ─

interface Exemption {
  id: string;
  /** `chainText` is the route's chain with local identifiers resolved (see expandChain). */
  applies: (route: ScannedRoute, file: FileScan, chainText: string) => boolean;
  why: string;
}

/**
 * Auth endpoints, per file and path. `auth/index.ts`: sign-out and
 * set-active-organization act on the caller's OWN session (the session cookie
 * is the credential) and `/auth/*` is a pass-through to the auth provider's
 * own handler. `auth/sms.ts`: send/verify are pre-authentication by
 * definition; `/send` must additionally carry the captcha gate (checked in
 * the rule). Any other path in these files, and any other file under `auth/`,
 * falls through to unguarded.
 */
const AUTH_ENDPOINTS: Readonly<Record<string, RegExp>> = {
  "auth/index.ts": /^\/auth\/|^\/organizations\/active$/,
  "auth/sms.ts": /^\/(send|verify)$/,
};

/**
 * Inbound webhook files and the exact verification each one performs. A file
 * under `webhooks/` that is not listed here — or that no longer contains its
 * named verification — is not exempt.
 */
const WEBHOOK_VERIFICATION: Readonly<
  Record<string, (route: ScannedRoute, file: FileScan, chainText: string) => boolean>
> = {
  // stripe.webhooks.constructEvent(rawBody, sig, webhookSecret) → 400 on failure.
  "webhooks/stripe.ts": (_r, f) => /\bstripe\.webhooks\.constructEvent\s*\(/.test(f.masked),
  // Svix: new Webhook(secret).verify(rawBody, { "svix-id", "svix-timestamp",
  // "svix-signature" }) → 400 on failure.
  "webhooks/clerk.ts": (_r, f) =>
    /\bfrom\s+["']svix["']/.test(f.masked) &&
    /\bnew\s+Webhook\s*\(/.test(f.masked) &&
    /\.verify\s*\(/.test(f.masked) &&
    /["']svix-signature["']/.test(f.masked),
  // POST /supabase: the inline handler calls auth.handleWebhook(c.req.raw) on
  // createAuth({ provider: "supabase" }) — packages/iam/auth/src/providers/
  // supabase.ts: HMAC of the raw body vs x-supabase-signature, timingSafeEqual.
  // Checked on the route's own chain (the handler is inline), not the file.
  "webhooks/auth-webhooks.ts": (r, f, chain) =>
    r.path === "/supabase" &&
    /\bcreateAuth\s*\(\s*\{\s*provider:\s*["']supabase["']/.test(f.masked) &&
    /\bauth\.handleWebhook\s*\(\s*c\.req\.raw\s*\)/.test(chain),
  // Stub: the handler unconditionally returns c.json({...}, 501). The OpenAPI
  // `501: {` responses entry alone does not match — the return statement must.
  "webhooks/better-auth-webhooks.ts": (_r, f) =>
    /\breturn\s+c\.json\(\s*\{[^}]*\}\s*,\s*501\s*,?\s*\)/.test(f.masked),
};

const STRUCTURAL_EXEMPTIONS: readonly Exemption[] = [
  {
    id: "auth-endpoint",
    applies: (r, _f, chain) => {
      if (!AUTH_ENDPOINTS[r.file]?.test(r.path)) return false;
      // auth/sms.ts: `smsAuthRoutes.use("/send", captchaMiddleware({...}))`.
      if (r.file === "auth/sms.ts" && r.path === "/send")
        return /\bcaptchaMiddleware\s*\(/.test(chain);
      return true;
    },
    why: "session/auth-provider endpoints — the session itself is the credential",
  },
  {
    id: "signed-webhook",
    applies: (r, f, chain) => WEBHOOK_VERIFICATION[r.file]?.(r, f, chain) ?? false,
    why: "inbound provider webhook — request authenticity is the provider signature",
  },
  {
    id: "qstash-delivery",
    // queue/delivery.ts: `queueDeliveryRoutes.post("/:queue/:type", (c) =>
    // qstashWebhookHandler(c.req.raw))` with `const qstashWebhookHandler =
    // createQStashWebhookHandler()` — resolved into the chain. packages/
    // integrations/queue/src/middleware/qstash-verify.ts verifies the
    // upstash-signature header with @upstash/qstash Receiver → 401 on failure
    // (mandatory in production / QUEUE_PROVIDER=qstash).
    applies: (r, _f, chain) =>
      r.file === "queue/delivery.ts" && /\bcreateQStashWebhookHandler\s*\(/.test(chain),
    why: "QStash job delivery — signature verified inside createQStashWebhookHandler",
  },
  // No health/readiness rule: misc/health.ts and system/status.ts register no
  // mutation route. If a probe-shaped POST ever appears it fails (a) and gets
  // a deliberate, path-scoped rule here — not a pre-approved file.
  {
    id: "pebble-public-intake",
    applies: (r, _f, chain) =>
      r.file.startsWith("pebble/") && /\bcreateIpRateLimit\s*\(/.test(chain),
    // pebble/index.ts: "deliberately unauthenticated: Pebble is a desktop app
    // whose users have no platform account". Abuse is bounded by per-IP rate
    // limits (required by this rule), exact-size body caps, and single-use
    // upload tokens (diagnostics.ts verifies the Bearer token on /upload).
    why: "public desktop support intake — no account exists to authorize; per-IP rate-limited",
  },
  // Internal cron with a service-token check: no such HTTP route exists under
  // routes/ today (retention runs as a Cloudflare Cron Trigger in
  // worker-retention.ts). Add a rule here — with the verification it relies on
  // — if one appears; do not add it to KNOWN_UNGUARDED.
];

// ── Source scanning ────────────────────────────────────────────────────────

interface UseEntry {
  pattern: string;
  text: string;
}

interface ScannedRoute {
  file: string;
  method: string;
  path: string;
  line: number;
  /** Middleware source texts that apply to this route (file `.use` matches + inline + createRoute middleware). */
  chain: string[];
  /** Registered with a non-literal path or method list; always classified unguarded. */
  nonLiteral?: string;
}

interface FileScan {
  file: string;
  text: string;
  masked: string;
  uses: UseEntry[];
  routes: ScannedRoute[];
}

const OPENERS: Record<string, string> = { "(": ")", "{": "}", "[": "]" };
const CLOSERS = new Set([")", "}", "]"]);
const REGEX_PRECEDERS = /[(,=:[!&|?{};]$|\breturn$|\btypeof$/;

/** Replace comment characters with spaces, keeping strings and indices intact. */
function maskComments(src: string): string {
  const out = src.split("");
  let i = 0;
  let lastCode = "";
  while (i < src.length) {
    const ch = src[i] ?? "";
    const next = src[i + 1];
    if (ch === '"' || ch === "'" || ch === "`") {
      const end = skipString(src, i);
      lastCode = ch;
      i = end + 1;
      continue;
    }
    if (ch === "/" && next === "/") {
      while (i < src.length && src[i] !== "\n") out[i++] = " ";
      continue;
    }
    if (ch === "/" && next === "*") {
      const end = src.indexOf("*/", i + 2);
      const stop = end === -1 ? src.length : end + 2;
      for (; i < stop; i++) if (src[i] !== "\n") out[i] = " ";
      continue;
    }
    if (ch === "/" && REGEX_PRECEDERS.test(lastCode.trimEnd())) {
      // Regex literal — skip to its unescaped closing slash.
      let j = i + 1;
      let inClass = false;
      while (j < src.length && src[j] !== "\n") {
        const rc = src[j];
        if (rc === "\\") {
          j += 2;
          continue;
        }
        if (rc === "/" && !inClass) break;
        if (rc === "[") inClass = true;
        else if (rc === "]") inClass = false;
        j++;
      }
      i = j + 1;
      lastCode = "/";
      continue;
    }
    if (!/\s/.test(ch)) lastCode = lastCode.length > 8 ? lastCode.slice(-8) + ch : lastCode + ch;
    i++;
  }
  return out.join("");
}

/** Index of the closing quote of the string starting at `start`. */
function skipString(src: string, start: number): number {
  const quote = src[start];
  let i = start + 1;
  while (i < src.length) {
    if (src[i] === "\\") i += 2;
    else if (src[i] === quote) return i;
    else i++;
  }
  return src.length - 1;
}

/** Index of the bracket matching the opener at `openIdx` (masked text; strings honoured). */
function matchClose(masked: string, openIdx: number): number {
  const stack: string[] = [OPENERS[masked[openIdx] ?? ""] ?? ")"];
  let i = openIdx + 1;
  while (i < masked.length) {
    const ch = masked[i] ?? "";
    if (ch === '"' || ch === "'" || ch === "`") {
      i = skipString(masked, i) + 1;
      continue;
    }
    if (OPENERS[ch]) stack.push(OPENERS[ch] as string);
    else if (CLOSERS.has(ch)) {
      if (stack[stack.length - 1] === ch) stack.pop();
      if (stack.length === 0) return i;
    }
    i++;
  }
  return masked.length - 1;
}

/** Split `a, b(c, d), "e,f"` into top-level arguments. */
function splitTopLevel(text: string): string[] {
  const parts: string[] = [];
  let depth = 0;
  let current = "";
  let i = 0;
  while (i < text.length) {
    const ch = text[i] ?? "";
    if (ch === '"' || ch === "'" || ch === "`") {
      const end = skipString(text, i);
      current += text.slice(i, end + 1);
      i = end + 1;
      continue;
    }
    if (OPENERS[ch]) depth++;
    else if (CLOSERS.has(ch)) depth--;
    if (ch === "," && depth === 0) {
      parts.push(current);
      current = "";
    } else {
      current += ch;
    }
    i++;
  }
  if (current.trim()) parts.push(current);
  return parts;
}

/** End index (exclusive) of the statement starting at `from`: first `;` at depth 0. */
function statementEnd(masked: string, from: number): number {
  let i = from;
  while (i < masked.length) {
    const ch = masked[i] ?? "";
    if (ch === '"' || ch === "'" || ch === "`") {
      i = skipString(masked, i) + 1;
      continue;
    }
    if (OPENERS[ch]) {
      i = matchClose(masked, i) + 1;
      continue;
    }
    if (ch === ";") return i;
    i++;
  }
  return masked.length;
}

function lineOf(text: string, index: number): number {
  let line = 1;
  for (let i = 0; i < index && i < text.length; i++) if (text[i] === "\n") line++;
  return line;
}

const STRING_LITERAL = /^\s*(["'`])((?:\\.|(?!\1).)*)\1\s*$/;

/** The string value of `arg` if it is a plain literal; a template with `${…}` is not. */
function literalString(arg: string | undefined): string | undefined {
  const m = arg ? STRING_LITERAL.exec(arg) : null;
  if (!m) return undefined;
  if (m[1] === "`" && (m[2] ?? "").includes("${")) return undefined;
  return m[2];
}

function normalizePath(path: string): string {
  const p = path.replace(/\{(\w+)\}/g, ":$1").replace(/\/+$/, "");
  return p === "" ? "/" : p;
}

/** Hono `use(pattern)` semantics: `*`, `/prefix/*`, `:param` segments, else exact. */
function patternMatches(pattern: string, routePath: string): boolean {
  const p = normalizePath(pattern);
  const r = normalizePath(routePath);
  if (p === "*" || p === "/*") return true;
  if (p.endsWith("/*")) {
    const prefix = p.slice(0, -2);
    return r === prefix || r.startsWith(`${prefix}/`);
  }
  if (p.endsWith("*")) return r.startsWith(p.slice(0, -1));
  const ps = p.split("/");
  const rs = r.split("/");
  if (ps.length !== rs.length) return false;
  return ps.every((seg, i) => seg.startsWith(":") || seg === rs[i]);
}

/** Source of a local declaration `function NAME(…) {…}` or `const NAME = …;` */
function localDeclaration(masked: string, ident: string): string | undefined {
  const fn = new RegExp(`\\bfunction\\s+${ident}\\s*\\(`).exec(masked);
  if (fn) {
    const paramsOpen = fn.index + fn[0].length - 1;
    const paramsClose = matchClose(masked, paramsOpen);
    const bodyOpen = masked.indexOf("{", paramsClose);
    if (bodyOpen !== -1) return masked.slice(fn.index, matchClose(masked, bodyOpen) + 1);
  }
  const decl = new RegExp(`\\b(?:const|let|var)\\s+${ident}\\b[^=;]*=`).exec(masked);
  if (decl) return masked.slice(decl.index, statementEnd(masked, decl.index + decl[0].length));
  return undefined;
}

const IDENT = /\b[A-Za-z_$][\w$]*\b/g;
const SKIP_IDENTS = new Set([
  "async",
  "await",
  "const",
  "let",
  "var",
  "function",
  "return",
  "if",
  "else",
  "new",
  "true",
  "false",
  "null",
  "undefined",
  "c",
  "next",
  "as",
]);

/** Chain text plus the bodies of local identifiers it references (2 levels deep). */
function expandChain(masked: string, chain: string[]): string {
  const seen = new Set<string>();
  let text = chain.join("\n");
  for (let depth = 0; depth < 2; depth++) {
    const idents = new Set((text.match(IDENT) ?? []).filter((id) => !SKIP_IDENTS.has(id)));
    let added = "";
    for (const id of idents) {
      if (seen.has(id)) continue;
      seen.add(id);
      const decl = localDeclaration(masked, id);
      if (decl) added += `\n${decl}`;
    }
    if (!added) break;
    text += added;
  }
  return text;
}

/** `receiver.verb(` — the receiver is absent for chained calls such as `new Hono().post(`. */
const METHOD_CALL = /(?:\b([A-Za-z_$][\w$]*))?\s*\.(post|put|patch|delete|all|on)\s*\(/g;
const CREATE_ROUTE = /\bcreateRoute\s*\(\s*\{/g;
const USE_CALL = /\.use\s*\(/g;
/** `const app = new Hono()` / `export const fooRoutes = new OpenAPIHono()` in the same file. */
const ROUTER_DECL =
  /\b(?:const|let|var)\s+([A-Za-z_$][\w$]*)\b[^=;]*=\s*new\s+(?:OpenAPIHono|Hono)\b/g;
/** Conventional router names, for routers created elsewhere (imports, factories). */
const ROUTER_NAME = /^(?:app|router|routes|api)$|(?:Routes?|Router|App)$/;
const NON_LITERAL = (line: number) => `<non-literal:line ${line}>`;

/** Scan one file's source for `.use` entries and mutation route registrations. */
function scanSource(file: string, text: string): FileScan {
  const masked = maskComments(text);
  const uses: UseEntry[] = [];
  const routes: ScannedRoute[] = [];
  const routers = new Set([...masked.matchAll(ROUTER_DECL)].map((m) => m[1] ?? ""));
  const isRouter = (receiver: string | undefined) =>
    receiver !== undefined && (routers.has(receiver) || ROUTER_NAME.test(receiver));

  for (const m of masked.matchAll(USE_CALL)) {
    const open = m.index + m[0].length - 1;
    const args = splitTopLevel(masked.slice(open + 1, matchClose(masked, open)));
    const first = literalString(args[0]);
    uses.push(
      first === undefined
        ? { pattern: "*", text: args.join(",") }
        : { pattern: first, text: args.slice(1).join(",") },
    );
  }

  const push = (method: string, path: string, line: number, inline: string[]) => {
    if (method !== "ALL" && !MUTATION_METHODS.has(method)) return;
    routes.push({ file, method, path: normalizePath(path), line, chain: inline });
  };
  const pushNonLiteral = (method: string, line: number, what: string) => {
    routes.push({ file, method, path: NON_LITERAL(line), line, chain: [], nonLiteral: what });
  };

  for (const m of masked.matchAll(METHOD_CALL)) {
    const receiver = m[1];
    const verb = (m[2] ?? "").toUpperCase();
    const open = m.index + m[0].length - 1;
    const args = splitTopLevel(masked.slice(open + 1, matchClose(masked, open)));
    const line = lineOf(masked, m.index);
    if (verb === "ON") {
      const methods = [...(args[0] ?? "").matchAll(/["'`]([A-Za-z]+)["'`]/g)].map((x) =>
        (x[1] ?? "").toUpperCase(),
      );
      const path = literalString(args[1]);
      if (path !== undefined && !path.startsWith("/")) continue; // emitter.on("event", fn)
      if (args.length < 3 || !isRouter(receiver)) continue;
      if (methods.length === 0) {
        pushNonLiteral("ON", line, "non-literal method list");
        continue;
      }
      const rest = args.slice(2).join(",");
      for (const method of methods) {
        if (path === undefined) {
          if (method === "ALL" || MUTATION_METHODS.has(method))
            pushNonLiteral(method, line, "non-literal path");
        } else push(method, path, line, rest.trim() ? [rest] : []);
      }
      continue;
    }
    const path = literalString(args[0]);
    if (path === undefined) {
      // Set/Map/Prisma `.delete(x)`, `Promise.all([...])`, `kv.put(k, v)`, … are
      // not routers; a router registered with a variable path is reported.
      if (args.length >= 2 && isRouter(receiver)) pushNonLiteral(verb, line, "non-literal path");
      continue;
    }
    if (!path.startsWith("/")) continue; // headers.delete("x-foo"), cache.put("key", v), …
    const rest = args.slice(1).join(",");
    push(verb, path, line, rest.trim() ? [rest] : []);
  }

  for (const m of masked.matchAll(CREATE_ROUTE)) {
    const open = m.index + m[0].length - 1;
    const close = matchClose(masked, open);
    const entries = splitTopLevel(masked.slice(open + 1, close));
    // `method: "post"` or the shorthand `method` (a variable — never literal).
    const field = (name: string) =>
      entries.find((e) => new RegExp(`^\\s*${name}\\s*(:|$)`).test(e));
    const line = lineOf(masked, m.index);
    const methodField = field("method");
    const pathField = field("path");
    if (!methodField || !pathField) continue;
    const method = /:\s*["'`](\w+)["'`]\s*$/.exec(methodField)?.[1]?.toUpperCase();
    if (!method) {
      pushNonLiteral("<non-literal method>", line, "non-literal method");
      continue;
    }
    if (method !== "ALL" && !MUTATION_METHODS.has(method)) continue;
    const path = literalString(pathField.slice(pathField.indexOf(":") + 1));
    if (path === undefined) {
      pushNonLiteral(method, line, "non-literal path");
      continue;
    }
    const middleware = field("middleware");
    push(method, path, line, middleware ? [middleware] : []);
  }

  for (const route of routes) {
    if (route.nonLiteral) continue;
    for (const use of uses)
      if (patternMatches(use.pattern, route.path)) route.chain.unshift(use.text);
  }

  return { file, text, masked, uses, routes };
}

function walk(dir: string, out: string[] = []): string[] {
  for (const name of readdirSync(dir).sort()) {
    const full = join(dir, name);
    if (statSync(full).isDirectory()) {
      if (name !== "__tests__" && name !== "node_modules") walk(full, out);
      continue;
    }
    if (!name.endsWith(".ts") || name.endsWith(".d.ts")) continue;
    if (/\.(test|spec)\.ts$/.test(name)) continue;
    out.push(full);
  }
  return out;
}

function scanGatewayRoutes(): FileScan[] {
  return walk(ROUTES_DIR).map((full) =>
    scanSource(relative(ROUTES_DIR, full).split("\\").join("/"), readFileSync(full, "utf-8")),
  );
}

// ── Classification ─────────────────────────────────────────────────────────

interface Verdict {
  status: "guarded" | "exempt" | "unguarded";
  authz: string[];
  identity: string;
  exemption?: string;
}

function classify(route: ScannedRoute, file: FileScan): Verdict {
  // A route the scanner cannot read is unguarded by definition — inline
  // middleware may be present, but `.use()` patterns cannot be matched and
  // path-scoped exemptions cannot be applied. (a) asks for a literal.
  if (route.nonLiteral) return { status: "unguarded", authz: [], identity: "none" };
  const chainText = expandChain(file.masked, route.chain);
  const authz = AUTHZ_MARKERS.filter((m) => m.test(chainText)).map((m) => m.id);
  const identity = IDENTITY_MARKERS.filter((m) => m.test(chainText)).map((m) => m.id);
  const identityLabel = identity.length ? identity.join("+") : "none";
  if (authz.length) return { status: "guarded", authz, identity: identityLabel };
  const exemption = STRUCTURAL_EXEMPTIONS.find((e) => e.applies(route, file, chainText));
  if (exemption)
    return { status: "exempt", authz, identity: identityLabel, exemption: exemption.id };
  return { status: "unguarded", authz, identity: identityLabel };
}

const keyOf = (r: { file: string; method: string; path: string }) =>
  `${r.file} ${r.method} ${r.path}`;

function formatEntry(route: ScannedRoute, verdict: Verdict): string {
  if (route.nonLiteral)
    return `  ${route.file}:${route.line} — ${route.method} registered with a ${route.nonLiteral}: the ratchet cannot read it; use a string literal`;
  return `  { file: "${route.file}", method: "${route.method}", path: "${route.path}", identity: "${verdict.identity}" },  // line ${route.line}`;
}

// ── Tests ──────────────────────────────────────────────────────────────────

describe("permissions ratchet (gateway mutation routes)", () => {
  const files = scanGatewayRoutes();
  const verdicts = files.flatMap((f) =>
    f.routes.map((r) => ({ route: r, file: f, verdict: classify(r, f) })),
  );
  const byKey = new Map(verdicts.map((v) => [keyOf(v.route), v]));
  /** KNOWN_UNGUARDED minus entries whose directory the template strips (scaffold only). */
  const expectedKnown = KNOWN_UNGUARDED.filter((k) => !strippedInScaffold(k.file));

  it("scan sanity: routes are found and route keys are unique", () => {
    // A scanner regression that finds nothing would make the ratchet vacuously
    // green; the anchors below pin specific routes, this pins the floor.
    expect(verdicts.length, "mutation routes found").toBeGreaterThanOrEqual(expectedKnown.length);
    expect(byKey.size, "duplicate route registration (same file, method, path)").toBe(
      verdicts.length,
    );
  });

  it.skipIf(IS_SCAFFOLD)("TEMPLATE_STRIPPED_ROUTE_DIRS matches .templateignore", () => {
    const ignore = readFileSync(join(ROOT, ".templateignore"), "utf8");
    const stripped = [...ignore.matchAll(/^backends\/gateway\/src\/routes\/([^/\s]+)\/\s*$/gm)]
      .map((m) => m[1] ?? "")
      .sort();
    expect(
      stripped,
      "update TEMPLATE_STRIPPED_ROUTE_DIRS in tests/architecture/permissions-ratchet.test.ts",
    ).toEqual([...TEMPLATE_STRIPPED_ROUTE_DIRS].sort());
  });

  describe("scanner self-test (synthetic sources)", () => {
    const classifyAll = (src: string, file = "fixture.ts") => {
      const f = scanSource(file, src);
      return f.routes.map((r) => ({ key: `${r.method} ${r.path}`, ...classify(r, f) }));
    };

    it("flags a bare mutation route and ignores non-route .delete()/.all() calls", () => {
      const out = classifyAll(`
        const app = new Hono();
        app.get("/things", list);
        app.post("/things", async (c) => c.json({}));
        buckets.delete(key);
        await Promise.all([a, b]);
        await repo.delete(id);
        // app.post("/ghost", handler)
        /* app.delete("/ghost2", handler) */
      `);
      expect(out).toEqual([
        { key: "POST /things", status: "unguarded", authz: [], identity: "none" },
      ]);
    });

    it("treats requireAuth/requireOrganization/requireFeature as identity, not authorization", () => {
      const out = classifyAll(`
        app.use("*", requireAuth, requireOrganization);
        app.post("/things", h);
        app.put("/plan-gated", requireFeature("ai.chat"), h);
      `);
      expect(out).toEqual([
        {
          key: "POST /things",
          status: "unguarded",
          authz: [],
          identity: "requireAuth+requireOrganization",
        },
        {
          key: "PUT /plan-gated",
          status: "unguarded",
          authz: [],
          identity: "requireAuth+requireOrganization+requireFeature",
        },
      ]);
    });

    it("recognises router-wide, path-scoped, inline and createRoute guards", () => {
      const out = classifyAll(`
        app.use("*", requireAuth);
        app.use("/admin/*", requireRole("org:admin"));
        app.use("/exact", (c, next) => requirePermission("manage", "Thing")(c, next));
        app.post("/admin/things", h);
        app.post("/exact", h);
        app.post("/exact/child", h);
        app.put("/inline", requireRole("org:owner"), h);
        app.on(["GET", "POST"], "/multi", h);
        const guarded = createRoute({ method: "delete", path: "/open/{id}", middleware: [requirePermission("delete", "Thing")] });
        const open = createRoute({ method: "patch", path: "/open/{id}" });
        const read = createRoute({ method: "get", path: "/open" });
      `);
      expect(Object.fromEntries(out.map((o) => [o.key, o.status]))).toEqual({
        "POST /admin/things": "guarded",
        "POST /exact": "guarded",
        "POST /exact/child": "unguarded",
        "PUT /inline": "guarded",
        "POST /multi": "unguarded",
        "DELETE /open/:id": "guarded",
        "PATCH /open/:id": "unguarded",
      });
    });

    it("resolves local middleware declarations one file deep", () => {
      const out = classifyAll(`
        const routes = new OpenAPIHono();
        routes.use("/checkout", requireManage);
        routes.use("*", authMiddleware);
        const ADMIN = new Set(["owner"]);
        async function requireManage(c: Context, next: Next) {
          const roles = mapTenantRoleToPermissionRoles(c.get("tenant")?.role);
          if (!roles.some((r) => ADMIN.has(r))) return c.json({ error: "Forbidden" }, 403);
          await next();
        }
        const authMiddleware = createGatewayPipelineMiddleware({ redis });
        const checkout = createRoute({ method: "post", path: "/checkout" });
        const portal = createRoute({ method: "post", path: "/portal" });
      `);
      expect(out).toEqual([
        { key: "POST /checkout", status: "guarded", authz: ["role-check"], identity: "api-key" },
        { key: "POST /portal", status: "unguarded", authz: [], identity: "api-key" },
      ]);
    });

    it("reports non-literal registrations as unguarded instead of skipping them", () => {
      const src = [
        "const r = new Hono();",
        "const PATH = '/things';",
        "r.post(PATH, requirePermission('create', 'Thing'), h);", // line 3: guard is not credited
        // biome-ignore lint/suspicious/noTemplateCurlyInString: the fixture deliberately contains an interpolation
        "app.delete(`/${base}/x`, h);", // line 4: template with interpolation
        "app.on(METHODS, '/multi', h);", // line 5: method list unknown
        "app.on(['GET', 'DELETE'], PATH, h);", // line 6: only DELETE is a mutation
        "const def = createRoute({ method: 'post', path: PATH });", // line 7
        "const dyn = createRoute({ method: METHOD, path: '/x' });", // line 8
        "const sh = createRoute({ method: 'delete', path });", // line 9: shorthand property
        "const read = createRoute({ method: 'get', path: PATH });", // GET: not a mutation
        "kv.put(KEY, value);", // not a router
        "client.post(url, body);", // not a router
        "buckets.delete(key);", // one argument
        "emitter.on('event', fn);", // not a path
      ].join("\n");
      const out = classifyAll(src);
      expect(out.map((o) => [o.key, o.status])).toEqual([
        ["POST <non-literal:line 3>", "unguarded"],
        ["DELETE <non-literal:line 4>", "unguarded"],
        ["ON <non-literal:line 5>", "unguarded"],
        ["DELETE <non-literal:line 6>", "unguarded"],
        ["POST <non-literal:line 7>", "unguarded"],
        ["<non-literal method> <non-literal:line 8>", "unguarded"],
        ["DELETE <non-literal:line 9>", "unguarded"],
      ]);
    });

    it("does not exempt a webhook or auth file by location alone", () => {
      const webhook = classifyAll(
        `
        const app = new OpenAPIHono();
        const route = createRoute({ method: "post", path: "/foo", responses: { 501: { description: "x" } } });
        app.openapi(route, async (c) => { await provider.handleWebhook(await c.req.json()); return c.json({ ok: true }); });
        `,
        "webhooks/foo.ts",
      );
      expect(webhook).toEqual([
        { key: "POST /foo", status: "unguarded", authz: [], identity: "none" },
      ]);

      const auth = classifyAll(
        `
        const app = new Hono();
        app.delete("/users/:id", h);
        `,
        "auth/index.ts",
      );
      expect(auth[0]).toMatchObject({ key: "DELETE /users/:id", status: "unguarded" });

      const other = classifyAll(
        'const app = new Hono(); app.post("/sign-out", h);',
        "auth/admin.ts",
      );
      expect(other[0]).toMatchObject({ key: "POST /sign-out", status: "unguarded" });

      const send = classifyAll(
        'const smsAuthRoutes = new OpenAPIHono(); const r = createRoute({ method: "post", path: "/send" });',
        "auth/sms.ts",
      );
      expect(send[0], "/send without the captcha gate").toMatchObject({ status: "unguarded" });
    });
  });

  describe("scanner anchors (real gateway code)", () => {
    // Regression cases: if any of these stop being detected, the scanner
    // regressed — do not "fix" by editing KNOWN_UNGUARDED.
    const anchor = (file: string, method: string, path: string) => {
      const v = byKey.get(`${file} ${method} ${path}`);
      expect(v, `expected the scanner to find ${file} ${method} ${path}`).toBeDefined();
      return v?.verdict as Verdict;
    };

    it("sees requirePermission applied through an inline arrow in .use('*')", () => {
      expect(anchor("workflows/index.ts", "POST", "/")).toMatchObject({
        status: "guarded",
        authz: ["requirePermission"],
      });
    });

    it("sees the admin X-Admin-Key guard", () => {
      expect(anchor("admin/index.ts", "POST", "/tenants/:id/suspend")).toMatchObject({
        status: "guarded",
        authz: ["admin-key"],
      });
    });

    it("sees a hand-rolled role check through a local function reference", () => {
      expect(anchor("billing/index.ts", "POST", "/checkout")).toMatchObject({
        status: "guarded",
        authz: ["role-check"],
      });
    });

    it("applies structural exemptions only where their verification is present", () => {
      expect(anchor("queue/delivery.ts", "POST", "/:queue/:type")).toMatchObject({
        status: "exempt",
        exemption: "qstash-delivery",
      });
      for (const [file, path] of [
        ["webhooks/stripe.ts", "/stripe"],
        ["webhooks/clerk.ts", "/clerk"],
        ["webhooks/auth-webhooks.ts", "/supabase"],
        ["webhooks/better-auth-webhooks.ts", "/"],
      ] as const) {
        expect(anchor(file, "POST", path), file).toMatchObject({
          status: "exempt",
          exemption: "signed-webhook",
        });
      }
      for (const [method, path] of [
        ["ALL", "/auth/*"],
        ["POST", "/auth/sign-out"],
        ["POST", "/organizations/active"],
      ] as const) {
        expect(anchor("auth/index.ts", method, path), path).toMatchObject({
          status: "exempt",
          exemption: "auth-endpoint",
        });
      }
      expect(anchor("auth/sms.ts", "POST", "/send")).toMatchObject({
        status: "exempt",
        exemption: "auth-endpoint",
      });
    });

    it.skipIf(IS_SCAFFOLD)(
      "applies the pebble intake exemption only with a per-IP rate limit",
      () => {
        expect(anchor("pebble/feedback.ts", "POST", "/")).toMatchObject({
          status: "exempt",
          exemption: "pebble-public-intake",
        });
      },
    );

    it("reports identity-only chains as unguarded", () => {
      expect(anchor("tasks/index.ts", "POST", "/")).toMatchObject({
        status: "unguarded",
        identity: "requireAuth+requireOrganization",
      });
    });
  });

  describe("shrink-only ratchet", () => {
    const known = new Map(KNOWN_UNGUARDED.map((k) => [keyOf(k), k]));

    it("KNOWN_UNGUARDED has no duplicate entries", () => {
      expect(known.size).toBe(KNOWN_UNGUARDED.length);
    });

    it("(a) no mutation route is unguarded unless already in KNOWN_UNGUARDED", () => {
      const fresh = verdicts
        .filter((v) => v.verdict.status === "unguarded" && !known.has(keyOf(v.route)))
        .map((v) => formatEntry(v.route, v.verdict));
      expect(
        fresh,
        `Unguarded mutation route(s) outside KNOWN_UNGUARDED:\n${fresh.join("\n")}\n\n` +
          "Add an authorization guard to the chain — requirePermission(action, resource) from " +
          "backends/gateway/src/middlewares/permissions.ts is preferred; requireRole(...) also counts. " +
          "requireAuth / requireOrganization / requireTenant only authenticate and requireFeature only " +
          "gates on plan — none of them is enough. A route registered with a non-literal path or " +
          "method list cannot be analysed: use a string literal. If the route is structurally exempt " +
          "(signed webhook, auth endpoint, ...) extend STRUCTURAL_EXEMPTIONS with a rule scoped to " +
          "the file and path, requiring the verification it relies on. KNOWN_UNGUARDED may only shrink.",
      ).toEqual([]);
    });

    it("(b) every KNOWN_UNGUARDED entry still exists and is still unguarded", () => {
      const stale = expectedKnown
        .filter((k) => byKey.get(keyOf(k))?.verdict.status !== "unguarded")
        .map((k) => {
          const status = byKey.get(keyOf(k))?.verdict.status ?? "gone";
          return `  ${keyOf(k)} — now ${status}`;
        });
      expect(
        stale,
        `KNOWN_UNGUARDED entries that are now guarded, exempt, or gone:\n${stale.join("\n")}\n\n` +
          "Delete these entries from KNOWN_UNGUARDED in tests/architecture/permissions-ratchet.test.ts — the list may only shrink.",
      ).toEqual([]);
    });

    it("(c) KNOWN_UNGUARDED identity notes match the code", () => {
      const drift = KNOWN_UNGUARDED.flatMap((k) => {
        const v = byKey.get(keyOf(k));
        if (!v || v.verdict.status !== "unguarded" || v.verdict.identity === k.identity) return [];
        return [
          `  ${keyOf(k)} — identity is now "${v.verdict.identity}" (entry says "${k.identity}")`,
        ];
      });
      expect(
        drift,
        `KNOWN_UNGUARDED identity notes out of date:\n${drift.join("\n")}\n\n` +
          "Update the identity field — or better, guard the route and delete the entry.",
      ).toEqual([]);
    });
  });
});
