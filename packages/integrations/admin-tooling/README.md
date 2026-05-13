# @nebutra/admin-tooling

> Thin contract layer that lets non-engineers (ops, CS, finance) build their
> own admin UI in Retool / Forest Admin / Appsmith — without engineering
> hand-rolling a new dashboard every quarter, and without anyone bypassing
> the audit trail.

## Why this package exists

The pattern Linear, Brex, and Mercury all converge on:

1. Engineers expose a **small, opinionated REST surface** over internal data.
2. **Ops / CS / finance build their own UIs** on top of that surface using a
   low-code tool (Retool is most common).
3. Every mutation is **audited with a required human-written reason**, and
   reads go through a **read-only replica** so an over-eager filter cannot
   take the primary DB down.

This package codifies (1) and (3) so every Nebutra-Sailor-based app does it
the same way. It does NOT ship a UI — the UI is whatever low-code tool the
customer picked.

## Modules

| Module | Purpose |
|---|---|
| `./contract` | Zod schemas for the canonical list/mutate REST contract |
| `./audit-hook` | `withAuditHook()` wrapper — every external mutation writes to `@nebutra/audit` automatically |
| `./readonly-db` | `getReadonlyDbUrl()` + `validateReadonlyAccess()` for the read-only replica |

## Quick start

### 1. Validate inbound requests with the contract

```ts
import {
  ListResourceRequestSchema,
  MutateResourceRequestSchema,
} from "@nebutra/admin-tooling/contract";

// In your Hono / Next.js route handler:
const body = await req.json();
const input = MutateResourceRequestSchema.parse(body);
// input.reason is guaranteed non-empty here.
```

### 2. Wrap mutation handlers with the audit hook

```ts
import { withAuditHook } from "@nebutra/admin-tooling/audit-hook";
import { MutateResourceRequestSchema } from "@nebutra/admin-tooling/contract";

const refundInvoice = withAuditHook(
  async (input: { id: string; reason: string }) => {
    await stripe.refunds.create({ payment_intent: input.id });
    return { ok: true };
  },
  {
    resource: "invoice",
    op: "refund",
    actorResolver: async (req) => {
      const session = await getSession(req);
      return { userId: session.userId, toolName: "retool", tenantId: session.orgId };
    },
    reasonExtractor: (input) => input.reason,
  },
);

// In your route:
const input = MutateResourceRequestSchema.parse(await req.json());
const result = await refundInvoice(input as any, req);
```

### 3. Point read endpoints at the read-only replica

```ts
import { getReadonlyDbUrl, validateReadonlyAccess } from "@nebutra/admin-tooling/readonly-db";
import { PrismaClient } from "@prisma/client";

const url = getReadonlyDbUrl();
if (!url) throw new Error("No database URL configured");

const readDb = new PrismaClient({ datasources: { db: { url } } });

// One-shot startup probe:
await validateReadonlyAccess({
  query: (sql) => readDb.$queryRawUnsafe(sql),
}).then((r) => {
  if (!r.readOnly) {
    // Not fatal in dev, but should page in prod.
  }
});
```

## Adapter notes

### Retool

- Create a **REST API resource** pointing at `https://your-app/api/admin/*`.
- Use **bearer-token auth** — issue a long-lived service token scoped to an
  "admin-tooling" role in `@nebutra/permissions`. Do NOT reuse user sessions.
- Set **IP allowlist** on your edge (Vercel Firewall / Cloudflare) to
  Retool's published egress ranges.
- In queries, set the `reason` field from a **required form input** in the
  Retool UI — don't hardcode it. The contract rejects empty reasons.
- Wire pagination by passing `page` and `pageSize` query params; map to
  `ListResourceRequestSchema`.

### Forest Admin

- Forest expects a **Smart Collection** model. Map each `resource` to a
  Smart Collection and translate Forest's filter DSL into the
  `FilterMapSchema` shape.
- Forest's per-action `forms` map cleanly to the `reason` requirement — add
  a required textarea field to every action.
- Authenticate Forest's agent → your app with a static API key; rotate
  via `@nebutra/vault`.

### Appsmith

- Use a **REST datasource** with OAuth 2.0 client-credentials against your
  IdP (`apps/idp`).
- Bind the `reason` field to a required text widget on every mutation page;
  validate before submit.
- For the read replica, expose a second REST datasource configured to a
  **read-only service account** — Appsmith doesn't enforce that itself.

### In-house ("internal" tool)

- Live under `apps/admin` (not shipped yet). Use the same contract — the
  point of the package is that the in-house tool stays a peer of the
  third-party tools, not a privileged escape hatch.

## Security checklist

Consumers MUST do all of these before exposing this surface to non-engineers:

- [ ] **Authentication** — every request carries a bearer token from
      `@nebutra/auth`. No anonymous routes.
- [ ] **Authorization** — every `resource` + `op` pair is gated through
      `@nebutra/permissions` (CASL or OpenFGA). Default-deny.
- [ ] **Rate limiting** — apply per-tenant and per-actor limits at the edge
      (`packages/integrations/queue` / Upstash Ratelimit).
- [ ] **IP allowlist** — restrict the admin routes to your low-code tool's
      egress ranges via Vercel Firewall / Cloudflare WAF.
- [ ] **Read replica** — set `READONLY_DATABASE_URL` in prod. The fallback
      warning in `getReadonlyDbUrl()` is acceptable in dev only.
- [ ] **Audit retention** — confirm `@nebutra/audit` provider has the
      retention window your compliance regime requires (SOC 2: 1 year min).
- [ ] **Reason field surfaced in UI** — every mutation form in the low-code
      tool must have a required, non-trivial reason input. Schema rejects
      reasons shorter than 3 chars, but the UX should encourage real
      sentences.
- [ ] **PII redaction** — if `payload` may contain PII (emails, phone),
      configure your audit provider to redact or hash before persistence.
- [ ] **Soft delete preferred** — wire `op: "delete"` to require an extra
      privilege; default destructive ops to `soft-delete`.

## Status

Foundation tier. Not yet adopted by `apps/web`. See package.json
`nebutra.gaps` for the follow-up list.
