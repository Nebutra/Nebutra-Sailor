# Invitation dual-table status (ADR-12)

**Status (2026-07-22):** Phase 3b dual-read is live in code. **Do not DROP
`public.OrganizationInvitation` yet** — cleanup job and some write paths still
touch the legacy table.

## Tables

| Store | Model | Role |
|-------|--------|------|
| `auth.invitation` | Prisma `bAInvitation` | Canonical for Better Auth org invites (Phase 2+ hooks) |
| `public.OrganizationInvitation` | Prisma `organizationInvitation` | Legacy Clerk-era; dual-read fallback + cleanup job |

## Code map

| Area | Behavior |
|------|----------|
| `apps/web/src/lib/invitations.ts` | **Dual-read** `findInvitationById` (BA first → legacy); dual status update |
| `packages/iam/auth/src/invitation-hooks.ts` | BA create hooks populate Phase 1 additive fields |
| `packages/integrations/queue/.../invitation-cleanup.ts` | Marks expired rows on **legacy** `organizationInvitation` only |
| Onboarding invite route tests | Still create legacy rows as DB fallback |

## Safe next steps (ordered)

1. **Metrics / soak (no schema change)**  
   Count pending rows in both tables in prod (or staging dump).  
   Confirm new invites always land in BA first.
2. **Cleanup job dual-table**  
   Expire both BA + legacy pending rows (or only BA once legacy pending = 0).
3. **Write cutover**  
   Stop writing legacy on onboarding fallback; BA-only creates.
4. **Phase 5 DROP**  
   Only after soak shows zero legacy reads/writes for a full retention window.

## Reversal

Keep dual-read. Dropping the BA branch restores legacy-only without data shape change.

## Out of scope for “poor but shipping”

This is a data migration, not a deploy blocker. Production invites work via
dual-read today. Prefer finishing ECS/runtime hygiene before DROP TABLE.
