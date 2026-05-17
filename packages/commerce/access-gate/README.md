# @nebutra/access-gate

Status: Foundation — core service, Prisma adapter, admin issue/list/revoke UI/API, email delivery, optional Dub attribution links, and the `apps/web` Better Auth signup preflight + post-signup redemption are implemented.

`@nebutra/access-gate` provides a provider-agnostic cold-start invite gate:

- Founders/admins issue bounded batches of invite codes.
- Plaintext codes are returned once and never persisted.
- Stored codes use SHA-256 hashes plus a short prefix for support/debugging.
- Redemption is compare-and-swap safe through the Prisma adapter.
- Platform-scoped and tenant-scoped invites are both supported.

## Template Behavior

This repository is both a reference implementation and a reusable template source. The canonical Prisma schema and migration live in `@nebutra/db`, but generated apps should not inherit cold-start business tables unless they opt in.

`create-sailor` therefore defaults to:

```bash
create-sailor my-app --access-gate none
```

To include the invite gate schema and migration in a scaffolded app:

```bash
create-sailor my-app --access-gate invite
```

The template pruner removes both conditional Prisma schema blocks and conditional migration directories when the feature is not selected.

## App Wiring

`apps/web` supports a fail-closed Better Auth signup preflight:

```bash
ACCESS_GATE_MODE=invite
NEXT_PUBLIC_ACCESS_GATE_MODE=invite
```

When enabled, `/api/auth/sign-up/email` requires `accessInviteCode` in the JSON body and validates it before delegating to Better Auth. The sign-up form shows the invite-code field only when `NEXT_PUBLIC_ACCESS_GATE_MODE=invite`, passes through `tenantId` for tenant-scoped invites, and disables OAuth sign-up so social auth cannot bypass the gate.

After Better Auth returns a successful sign-up response, `apps/web` redeems the code against the created user id when the response payload includes `id`, `user.id`, `data.id`, or `data.user.id`.

Admins can issue codes from `/admin` or `POST /api/admin/access-invites`, list recent invite status with `GET /api/admin/access-invites`, and revoke active invites with `PATCH /api/admin/access-invites`. List responses expose only ids, prefixes, status, scope, email lock, and redemption counts; plaintext codes and hashes are never returned. When
`issuedToEmail` is present, the API sends a transactional invitation email with
the generated `/sign-up?invite=...` URL and returns `emailStatus` for each code.
When `DUB_API_KEY` is configured, the API also creates a tracked short link via
`@nebutra/analytics` and returns `attributionStatus`, `attributionLinkId`, and
the canonical invite URL.

## Usage

```ts
import { createAccessGate, createPrismaAccessInviteStore } from "@nebutra/access-gate";
import { prisma } from "@nebutra/db";

const gate = createAccessGate({
  store: createPrismaAccessInviteStore(prisma),
  issuerQuota: 5,
});

const [issued] = await gate.issueBatch({
  count: 1,
  issuedByUserId: "user_founder",
  scope: "tenant",
  tenantId: "org_123",
  expiresAt: new Date("2026-06-01T00:00:00Z"),
});

await gate.redeem({
  plaintextCode: issued.plaintextCode,
  redeemedByUserId: "user_new",
  tenantId: "org_123",
});
```

## Integration Checklist

- Rate-limit issue/redeem endpoints at the app boundary with `@nebutra/rate-limit`.
- Configure `DUB_API_KEY` when invite attribution links are required.
- Include `tenantId` in generated signup links for tenant-scoped invites.
