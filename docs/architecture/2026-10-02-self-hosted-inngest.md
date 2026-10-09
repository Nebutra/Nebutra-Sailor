# Self-hosted Inngest on Fly

- **Date:** 2026-10-02
- **Status:** Accepted (manifests and guards merged; first deploy is the owner's bootstrap run)
- **Related:** ADR 2026-09-30 supply capability probing (every scheduled and event-driven
  supply job runs on Inngest), `infra/fly/inngest.toml`, `infra/fly/gateway.toml`,
  `infra/ops/scripts/bootstrap-inngest.sh`, `infra/ops/scripts/verify-inngest-sync.sh`

## Context — the incident

The production gateway logged `In cloud mode but no signing key found ... set the
INNGEST_SIGNING_KEY env var`, and `GET /api/inngest` answered 500. The SDK defaults to cloud mode
unless `INNGEST_DEV` is set, and cloud mode needs a signing key. None was ever set, so **no
Inngest function has ever run in production**: not supply discovery, verification, retry or quota
pull, not the event fan-out, not `routerReservationSweep`, billing sync or GDPR deletion. The
health check stayed green throughout, because `/api/misc/health` says nothing about background
jobs.

## Decision

Run the open-source Inngest server (`inngest start`) as one private Fly app, `nebutra-inngest`,
instead of Inngest Cloud. The owner chose self-hosting. The Fly org is at its machine cap, so this
is exactly one new Machine.

| Choice | Value | Why |
|---|---|---|
| Image | `inngest/inngest:v1.45.1@sha256:b251...aa92c` | Tag for humans, manifest-list digest for reproducibility. `latest` is not allowed (arch test). |
| Command | `[processes] app = "inngest start"` | The image's CMD is bare `inngest`. |
| Config | `INNGEST_*` env only | The CLI maps every flag to an `INNGEST_` variable (flags win over env). Keys never appear in process arguments or `fly machine` output. |
| Network | `INNGEST_HOST=::`, one TCP service on 8288, no `[[services.ports]]`, no `http_service` | 6PN only. `.internal` resolves to IPv6, so a server bound to localhost or `0.0.0.0` refuses every private connection; `::` is dual-stack on Linux. |
| Config and run history | SQLite in `/data/sqlite` on a 1 GB Fly volume (`inngest_data`) | One Machine, so Postgres buys nothing and costs a second stateful service. |
| Queue and run state | External `nebutra-redis`, logical db 1, via the `INNGEST_REDIS_URI` secret | See below. |
| App discovery | `INNGEST_SDK_URL` = the gateway's public `/api/inngest`, `INNGEST_POLL_INTERVAL=15` | See "Direction of each call". |
| Keys | Random bare hex from `openssl rand -hex 32`, same values on server and gateway | See "Signing key format". |

### Persistence: why external Redis

Without `--redis-uri` the server runs an in-memory Redis and snapshots it into SQLite
periodically and on graceful shutdown. A crash, OOM kill or host failure loses everything queued
since the last snapshot, including in-flight step state. Queue state must survive restarts, so
the server uses the existing self-hosted `nebutra-redis`, which writes an AOF with `everysec`
fsync on its own volume. That is also zero extra Machines. Database 1 keeps Inngest's keys apart
from the cache in database 0 (the REST front always uses 0). The password rides inside the
`INNGEST_REDIS_URI` secret, so the URI is never in the manifest. Redis here is `volatile-lru`
with a 384 MB cap: Inngest keys carry no TTL, so they are not evicted, but a full Redis would
reject writes, and the cache and the queue share that budget. Watch it; moving the queue to its
own Redis is the escape hatch, and only the secret changes.

SQLite is not replicated. The volume is a single-Machine, single-zone disk. Loss of the volume
loses app registrations and run history, not the queue; the next sync restores registrations.
Take a Fly volume snapshot schedule if run history matters.

### Direction of each call

- **gateway/Router to server** (send events, register): outbound from the gateway, inbound to a
  server that binds `::`. Works over `nebutra-inngest.internal:8288`. The gateway sets
  `INNGEST_BASE_URL`; in SDK 4.4 it is the fallback for both the event API and the register API
  (`INNGEST_EVENT_API_BASE_URL` and `INNGEST_API_BASE_URL` override it individually, and are not
  needed). Router is unchanged: it still posts `supply/*` events to the gateway's internal relay,
  which calls `inngest.send` against that URL.
- **server to gateway** (sync polling, step execution): inbound to the gateway, which binds
  `0.0.0.0` (IPv4 only), so its `.internal` name refuses the connection. This is the same
  constraint that makes the gateway and Router call each other over public hosts. The server uses
  the gateway's public `/api/inngest`. Signed requests: the SDK verifies the server's signature
  with `INNGEST_SIGNING_KEY`; no serve option is needed, since `serve()` reads the env.

### Signing key format

Inngest Cloud keys look like `signkey-prod-<hex>`. Do not use that shape here. `inngest start`
rejects a key whose total length is odd (`start.go`), and the 13-character prefix plus any
even-length hex payload is odd, so the server exits at boot even though `HashedSigningKey`
would strip the prefix later. A bare hex string passes both the server and the SDK (which hashes
whatever follows an optional `signkey-<env>-` prefix). The event key is an opaque string.

## The guard

`verify-inngest-sync.sh` runs after every gateway deploy (`deploy-fly-gateway.yml`, and the
`gateway` job of `deploy-fly.yml`), against the Machine's own `.fly.dev` host:

1. `PUT /api/inngest`. The SDK POSTs its function list to `<INNGEST_BASE_URL>/fn/register` and
   returns the server's verdict; the guard requires HTTP 200 and `status: 200`.
2. `GET /api/inngest` introspection must show `has_signing_key`, `has_event_key` and
   `function_count > 0`.

Any miss fails the job. This is the check that would have caught the incident on the first
deploy. `tests/architecture/deploy-substrate.test.ts` pins `INNGEST_BASE_URL` in `gateway.toml`,
the private and pinned shape of `inngest.toml`, and both workflows calling the guard, so none of
them can be dropped quietly.

## Failure modes

| Failure | Effect | Detection and recovery |
|---|---|---|
| Server Machine down or restarting | Sends fail; the gateway's `inngest.send` throws; crons pause. Queue and run state survive in Redis. | Fly restarts it. Next deploy's guard fails if it stays down. |
| Redis down | Server cannot enqueue or step; sends fail. | Same recovery as Redis today. Nothing is lost that was already persisted. |
| Gateway deploy drops or changes functions | Server holds the old list until the next poll (15 s) or deploy PUT. | The guard PUTs on every deploy. |
| Keys differ between server and gateway | Register and execution are rejected (401). | Guard fails on PUT. Re-run `bootstrap-inngest.sh`, which regenerates and re-sets both. |
| `INNGEST_BASE_URL` removed from `gateway.toml` | The SDK falls back to Inngest Cloud and sends nothing useful. | Arch test fails. |
| Volume lost | Registrations and history gone. | Next poll or guard PUT re-registers. |
| Org machine cap | The new app cannot start. | Approved headroom is exactly one Machine. |

## Verify

```bash
fly status -a nebutra-inngest                                   # one started Machine
fly ssh console -a nebutra-inngest -C "wget -qO- http://127.0.0.1:8288/health"
curl -s -X PUT https://<gateway-app>.fly.dev/api/inngest      # {"status":200,...}
curl -s https://<gateway-app>.fly.dev/api/inngest             # function_count 18, both key flags true
fly logs -a <gateway-app> | grep -i "signing key"             # no output
```

Then confirm a cron fires: `routerReservationSweep` runs every ten minutes; its run appears in the
server's dashboard, reachable with `fly proxy 8288:8288 -a nebutra-inngest` and
`http://localhost:8288`.

## Template boundary

`nebutra-inngest` is instance infrastructure. `infra/fly/inngest.toml`, `bootstrap-inngest.sh` and
`verify-inngest-sync.sh` are listed in `.templateignore`; the customer template keeps its existing
Inngest dev-server and cloud defaults, and `INNGEST_BASE_URL` is an optional env that is unset
there.
