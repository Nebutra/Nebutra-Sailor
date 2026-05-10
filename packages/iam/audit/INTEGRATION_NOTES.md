# @nebutra/audit — Integration Notes

This file tracks where audit hooks live in the application. The audit package
ships provider-agnostic primitives (`auditLogger`, `withAudit`, the `ACTIONS`
catalog, the Zod schema) — the wiring listed below is what actually emits
events in production.

## Already wired

| Path | Action(s) | Severity / Notes |
|------|-----------|------------------|
| `apps/web/src/app/api/api-keys/route.ts` (POST) | `api_key.created` | success on 201; severity `warning` |
| `apps/web/src/app/api/api-keys/[id]/route.ts` (DELETE) | `api_key.revoked` | success on 200; severity `warning` |
| `apps/web/src/app/api/account/export/route.ts` (POST) | `data.export.completed` | success when payload built; severity `warning` (GDPR Art. 20 / PIPL Art. 45) |
| `apps/web/src/app/api/account/email-change/route.ts` (POST) | `account.email.changed` | severity `warning`; `changes.before/after.email`; metadata flags `verification_pending` |
| `apps/web/src/app/api/billing/checkout/route.ts` (POST) | `billing.checkout.started` | success on 303 redirect |
| `apps/web/src/app/api/cron/_lib.ts` (all cron routes) | `cron.run` | success / failure |
| `apps/web/src/app/api/auth/[...all]/route.ts` (POST) | `auth.login.success`, `auth.login.failure`, `auth.logout`, `auth.signup` | derived from path + status; failures emit even without an authenticated session |
| `apps/web/src/app/api/auth/revoke-session/route.ts` (POST) | `auth.session.revoked` | severity `warning` |
| `apps/web/src/app/api/auth/revoke-other-sessions/route.ts` (POST) | `auth.session.revoked_other` | severity `warning` |
| `apps/web/src/app/api/admin/impersonate/route.ts` (POST) | `admin.impersonate.started` | severity **critical**; metadata includes admin user id |
| `apps/web/src/app/api/admin/impersonate/route.ts` (DELETE) | `admin.impersonate.ended` | severity `warning` |
| `apps/web/src/app/api/organizations/route.ts` (POST) | `org.created` | severity `info` |
| `apps/web/src/app/api/organizations/[orgId]/route.ts` (PATCH) | `org.updated` | severity `info`; `changes.before/after.name` |
| `apps/web/src/app/api/organizations/[orgId]/route.ts` (DELETE) | `org.deleted` | severity **critical** |
| `apps/web/src/app/api/organizations/[orgId]/members/[memberId]/route.ts` (PATCH) | `org.member.role_changed` | severity `warning`; `changes.before/after.role` |
| `apps/web/src/app/api/organizations/[orgId]/members/[memberId]/route.ts` (DELETE) | `org.member.removed` | severity `warning`; metadata flags `self` for self-removal |
| `apps/web/src/app/api/webhooks/route.ts` (POST) | `webhook.created` | severity `warning` |
| `apps/web/src/app/api/webhooks/[id]/route.ts` (PATCH) | `webhook.updated` | severity `warning`; `changes.before/after` for changed fields only |
| `apps/web/src/app/api/webhooks/[id]/route.ts` (DELETE) | `webhook.deleted` | severity `warning` |

## TODO — routes not yet wired

These routes do not currently exist (or only expose read-only handlers) so
there is nothing to audit. Wire when the route handler lands.

- `apps/web/src/app/api/organizations/[orgId]/members/route.ts` (POST add member) — handler not implemented yet. When added, emit `org.member.added` (severity `warning`).
- `apps/web/src/app/api/admin/users/route.ts` (PATCH/PUT/DELETE) — only `GET` exists today. When admin mutation handlers land, emit `admin.user.updated` (severity `warning`).
- `apps/web/src/app/api/admin/organizations/route.ts` (PATCH/PUT/DELETE) — only `GET` exists today. When admin mutation handlers land, emit `admin.org.updated` (severity `warning`).
- `auth.password.changed` / `auth.2fa.enabled` / `auth.2fa.disabled` — actions are reserved in the `ACTIONS` catalog. The Better Auth catch-all does not currently expose distinct paths for these, so they're left for a follow-up that taps Better Auth's hook surface directly.

## How to wire a new route

```ts
import { auditLogger } from "@nebutra/audit";
import { getAuditableContext } from "@nebutra/auth";

export async function POST(request: Request) {
  // ... existing handler logic ...

  const ctx = await getAuditableContext(request);
  if (ctx) {
    await auditLogger(request, ctx).log({
      action: "settings.updated",        // dotted, lowercase, in ACTIONS catalog
      outcome: "success",                 // | "failure" | "denied"
      resource: { type: "settings", id: settingsId },
      severity: "info",                   // | "warning" | "critical"
      changes: { before, after },         // optional — for state mutations
      metadata: { ... },                  // optional — domain-specific fields
    });
  }
  return response;
}
```

Routes that already resolve `(userId, orgId)` via `getAuth(request)` may pass
those directly into `auditLogger(request, { actor, tenantId })` without going
through `getAuditableContext` — the helper is just sugar for new code.

Failures inside `auditLogger.log()` are caught and logged via `@nebutra/logger`
— they will never propagate and break your handler.

## Tenant scoping invariant

Every audit event MUST carry a `tenantId`. For cross-tenant or system events
(cron, scheduled retention), use `tenantId: "system"`. For user-scoped events
that have no organization (e.g. account-level data export, email change before
the user joins an org), use the user's id as the tenant — `getAuditableContext`
applies this fallback automatically. This preserves the "every row scoped"
invariant the RLS policies in `@nebutra/tenant` rely on.

## Idempotency

Audit calls are emitted at the **route handler** level. Do not also emit them
from middleware or shared service helpers — duplicate rows are noise and break
SOC 2 evidence chains. If a service helper needs to record an event, accept
the audit context from the handler and emit there.
