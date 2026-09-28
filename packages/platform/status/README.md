# @nebutra/status

The status and incident core behind `status.nebutra.com`. One implementation, no
vendor adapters: Nebutra runs its own status page and dogfoods this package.

| Piece | File | What it does |
|---|---|---|
| Probes | `src/probe.ts` | HTTP checks with a confirm-retry, readiness-body parsing, `buildStatusSnapshot(targets)` |
| History | `src/history.ts` | Per-day check counts (`total / degraded / outage`), one sample per 55 s window |
| Uptime math | `src/math.ts` | Day colour and uptime from the ratio (browser-safe, no storage imports) |
| Incidents | `src/incidents.ts` | Incidents and maintenance windows with an update timeline |
| Notifications | `src/notify.ts` | Feishu interactive card + Slack blocks on every incident write |
| Store | `src/store.ts` | Upstash REST KV (outside the app stack), in-memory in dev and tests |

```ts
import { buildStatusSnapshot } from "@nebutra/status";

const snapshot = await buildStatusSnapshot([
  { id: "api", name: "API", description: "Public API", url: "https://api.example.com/ready", readiness: true },
]);
```

## Environment

| Variable | Purpose |
|---|---|
| `UPSTASH_REDIS_REST_URL` / `_TOKEN` | Durable history and incidents. Without them history lives in memory. |
| `STATUS_FEISHU_WEBHOOK_URL` / `_SECRET` | Feishu custom bot for incident cards (secret = signature check). |
| `STATUS_SLACK_WEBHOOK_URL` | Slack incoming webhook. |
| `STATUS_PUBLIC_ORIGIN` | Origin that cards and feeds link to. |

## Sampling

History accrues from a scheduled call (the gateway Worker cron hits
`/api/status/probe` every five minutes) plus page views. A KV lock admits at
most one recorded run per window, so traffic cannot weight a day.
