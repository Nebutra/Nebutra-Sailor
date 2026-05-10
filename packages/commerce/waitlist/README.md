# @nebutra/waitlist

Pre-launch waitlist with position tracking, referral codes, and admin management.

Status: Foundation — pure helpers + in-memory store, no production adapter wired yet.

## Scope

- Email signup with deduplication
- Position tracking (FIFO with referral boosts)
- Referral code generation + attribution
- Admin queries (recent signups, top referrers)

## Gaps

- Prisma adapter not implemented — only in-memory store ships
- Email confirmation + position update notifications not wired
- Referral attribution analytics endpoint TODO

## Quick start

```ts
import { createWaitlist } from "@nebutra/waitlist";

const waitlist = createWaitlist({ store: "memory" });
const entry = await waitlist.join({ email: "user@example.com", referredBy: "abc123" });
```
