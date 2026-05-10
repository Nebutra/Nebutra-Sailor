# @nebutra/audit — Integration Notes

This file is the spec for whoever finishes the auth-WIP and organization-WIP
work. The audit package and all clean (non-auth) wiring already shipped — see
the **Already wired** section below. The hooks listed under **TODO** must be
added when the corresponding auth/org code stabilizes.

## Already wired (this PR)

| Path | Action | Outcome contract |
|------|--------|------------------|
| `apps/web/src/app/api/api-keys/route.ts` (POST) | `api_key.created` | success on 201; severity `warning` |
| `apps/web/src/app/api/api-keys/[id]/route.ts` (DELETE) | `api_key.revoked` | success on 200; severity `warning` |
| `apps/web/src/app/api/account/export/route.ts` (POST) | `data.export.completed` | success when payload built; severity `warning` (GDPR Art. 20 / PIPL Art. 45) |
| `apps/web/src/app/api/billing/checkout/route.ts` (POST) | `billing.checkout.started` | success on 303 redirect |
| `apps/web/src/app/api/cron/_lib.ts` (all cron routes) | `cron.run` | success / failure |

Use these as templates when wiring the auth-WIP routes below.

## TODO — wire when auth-WIP merges

The following routes are currently in the **AVOID LIST** because another
worktree owns them. When that work merges, add audit calls at the points
indicated. All actions are pre-declared in `packages/iam/audit/src/schema.ts`
under `ACTIONS`.

### `apps/web/src/app/api/auth/**`

- **Login success** (after Clerk session is established):
  - Action: `auth.login.success` (`ACTIONS.AUTH_LOGIN_SUCCESS`)
  - Resource: `{ type: "session", id: sessionId }`
  - Severity: `info`
- **Login failure** (Clerk webhook or middleware on 401 from a sign-in callback):
  - Action: `auth.login.failure` (`ACTIONS.AUTH_LOGIN_FAILURE`)
  - Resource: `{ type: "credential", id: emailOrIdentifier }`
  - Outcome: `denied`
  - Severity: `warning` (or `critical` after N consecutive failures)
- **Logout**:
  - Action: `auth.logout` (`ACTIONS.AUTH_LOGOUT`)
  - Severity: `info`

### `apps/web/src/app/api/organizations/**`

- **Member role change** (PATCH /organizations/[id]/members/[memberId]):
  - Action: `org.member.role_changed` (`ACTIONS.ORG_MEMBER_ROLE_CHANGED`)
  - Resource: `{ type: "user", id: targetMemberId }`
  - `changes`: `{ before: { role: oldRole }, after: { role: newRole } }`
  - Severity: `warning`
- **Member added / removed**:
  - Define new actions when the routes land — recommended names:
    `org.member.added`, `org.member.removed`.
- **Organization deleted** (DELETE /organizations/[id]):
  - Define `org.deleted` and emit with severity `critical`.

### `apps/web/src/lib/auth.ts` and `apps/web/src/lib/auth/**`

These are middleware / helper modules. Do NOT call the audit logger from
middleware unless you are sure the request will not produce a follow-up event
in the route handler — duplicate audit rows are noise. Prefer route-handler
audit calls.

### `packages/iam/auth/**`

The auth package owns provider-agnostic primitives. When you add the
`@nebutra/auth` provider abstraction (Clerk / NextAuth / BetterAuth), expose a
hook that the consuming app can call to receive `(actor, tenant)` without
re-implementing the lookup. Example shape:

```ts
import { auditLogger } from "@nebutra/audit";
import { getAuditableContext } from "@nebutra/auth";

const ctx = await getAuditableContext(req);
if (ctx) {
  await auditLogger(req, ctx).log({ action: "auth.login.success", outcome: "success", resource: ... });
}
```

## How to wire a new route

```ts
import { auditLogger } from "@nebutra/audit";

await auditLogger(request, {
  actor: { id: userId, type: "user" },
  tenantId: orgId,
}).log({
  action: "settings.updated",        // dotted, lowercase, in ACTIONS catalog
  outcome: "success",                 // | "failure" | "denied"
  resource: { type: "settings", id: settingsId },
  severity: "info",                   // | "warning" | "critical"
  changes: { before, after },         // optional — for state mutations
  metadata: { ... },                  // optional — domain-specific fields
});
```

Failures inside `auditLogger.log()` are caught and logged via `@nebutra/logger`
— they will never propagate and break your handler.

## Tenant scoping invariant

Every audit event MUST carry a `tenantId`. For cross-tenant or system events
(cron, scheduled retention), use `tenantId: "system"`. For user-scoped events
that have no organization (e.g. account-level data export), use the user's id
as the tenant — this preserves the "every row scoped" invariant the RLS
policies in `@nebutra/tenant` rely on.
