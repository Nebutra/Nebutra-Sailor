# @nebutra/waitlist

Pre-launch waitlist with position tracking, referral codes, and admin management.

Status: Foundation — in-memory store plus adapter interfaces for production persistence.

## Scope

- Email signup with deduplication
- Position tracking (FIFO with referral boosts)
- Referral code generation + attribution
- Admin queries (recent signups, top referrers)
- Adapter seam for Prisma-style durable storage
- Optional confirmation and position-update notification sink
- Referral analytics by referrer and campaign

## Gaps

- Database schema/migration still belongs in the consuming app or `@nebutra/db`
- Notification sink must be wired to `@nebutra/email` by the app
- Referral analytics API endpoint still needs app/backend integration

## Quick start

```ts
import { createWaitlist } from "@nebutra/waitlist";

const waitlist = createWaitlist({ storage: "memory" });
const entry = await waitlist.join({ email: "user@example.com", referredBy: "abc123" });
```

## Production storage seam

```ts
import { createPrismaWaitlistStore, createWaitlist } from "@nebutra/waitlist";

const waitlist = createWaitlist({
  store: createPrismaWaitlistStore(prisma.waitlistEntry),
  notifications: emailWaitlistNotifications,
});
```
