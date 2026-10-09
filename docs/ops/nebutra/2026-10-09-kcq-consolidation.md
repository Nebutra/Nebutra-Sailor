# KCQ consolidation: four Fly Machines to one

Status: implemented in `feat/kcq-consolidate`, not yet cut over. Instance-specific (Nebutra production only).

## Why

The Fly org `nebutra` is at its 20-machine cap and the owner will not raise it. Self-hosted Inngest needs a machine. KCQ used four apps/machines in `sin`:

| App | Size | Public | Process |
|---|---|---|---|
| nebutra-kcq | shared-1x 512 MB | 8080 | nginx serving the static product, proxying `/market/*` |
| nebutra-kcq-tdx | shared-1x 1 GB | no | GOTDX Go (gin) API, port 8080, TZ Asia/Shanghai |
| nebutra-kcq-python | shared-1x 1 GB | no | TradingView connector, Python 3.12 / FastAPI / uvicorn, port 8080 |
| nebutra-kcq-binance | shared-1x 512 MB | no | Binance read-only depth, Go (gin) + upstream websocket, port 8080 |

## Findings per connector

All three are stateless HTTP servers. None has a volume, none has any Fly secret (`flyctl secrets list` is empty on all four apps), and none holds account or trading credentials. nginx reached them at `nebutra-kcq-<name>.internal:8080` (6PN, IPv6).

- tdx: static Go binary. Keeps a SQLite symbol-directory cache (`SYMBOL_DB_PATH`) that is disposable and rebuilt on boot; opens outbound TCP/7709 to ~38 GOTDX broker hosts (mainland China IPs, reachable from `sin`). Idle RSS about 112 MB.
- python: uvicorn on `::` via `nebutra-entrypoint.py` (socket timeout 8 s). Disposable SQLite directory cache (`STOCK_DIRECTORY_DB_PATH`). Needs a git-pinned `tvdatafeed` at build time only. Idle RSS about 122 MB; this is the one with warm-up and request-time spikes.
- binance: static Go binary; outbound websocket to `stream.binance.com` and REST to `api.binance.com`. Upstream defaults `HTTP_PROXY` to a nonexistent localhost proxy, so `NO_PROXY` for the two Binance hosts is required. Idle RSS about 20 MB.
- nginx: about 15 MB.

Measured on the running machines (`/proc` RSS via `flyctl ssh console`, read-only): the four workloads sum to about 270 MB, plus roughly 40 MB of init/hallpass/kernel overhead per VM. `MemAvailable` was 667-714 MB on the 1 GB machines, 400 MB on the 512 MB ones.

## Decision

Fold everything into `nebutra-kcq` (option b). One Machine, shared-cpu-1x, **1 GB** (up from 512 MB), freeing **3 machines** (20 to 17 used).

A single container runs `kcq-supervisor` (`infra/fly/kcq-supervisor.py`, about 130 lines of stdlib Python, no new packages) as PID 1's child. Fly `[processes]` would create separate machines and save nothing, so it is not used.

- nginx on 8080 (public) and the connectors on 8081 tdx, 8082 binance, 8083 python.
- Each child restarts independently with exponential backoff (1 to 30 s, reset after 60 s of uptime). Connectors run as the unprivileged `connector` user. Per-process env is isolated (for example `NO_PROXY` and `TZ=Asia/Shanghai` only affect their own process).
- Logs stay attributable: every line is prefixed `[nginx]`, `[tdx]`, `[binance]`, `[python]` or `[supervisor]`.
- If nginx cannot stay up (5 rapid exits) the supervisor exits non-zero so Fly replaces the Machine. Connector crash loops never take down the site.
- nginx proxies to `127.0.0.1:808x`, so no IPv6/6PN/resolver dependency remains. Connectors still bind all interfaces (upstream `:PORT`) because Fly health checks reach them on the machine address; they are not published in `[http_service]`, so there is no public listener.

Sizing: 270 MB steady plus Python/GOTDX warm-up and per-request spikes is well inside 1 GB, with about 3x headroom over steady state. 2 GB was rejected (more cost than the evidence supports); if `flyctl logs` ever shows an OOM kill, raise to 2 GB in `infra/fly/kcq.toml`, the supervisor restarts only the killed process.

Accepted risks:

1. Shared fate: a host-level event (Machine replacement, deploy) now interrupts the site and all three connectors together, where previously a connector deploy was independent. Deploys are now one workflow, so chart-only changes also rebuild connectors (cached layers keep this cheap; connector pins are unchanged unless edited).
2. Memory contention: a Python spike can OOM-kill the largest process; Linux kills the biggest, the supervisor restarts it.
3. Single CPU shared: connector bursts can slow static serving. Static assets are immutable-cached and the product is low traffic.

Rejected: keeping Python separate (option c). Its idle RSS (122 MB) is similar to tdx; nothing in its runtime makes co-location unsafe, and keeping it would free only 2 machines.

## Changes

- `infra/fly/Dockerfile.kcq`: multi-stage (Go build for tdx and binance, uv venv build for python, runtime on `python:3.12-slim` + nginx).
- `infra/fly/kcq-supervisor.py`, `kcq.toml` (1 GB, checks on 8081 and 8083), `kcq.nginx.conf` (loopback upstreams, no 6PN resolver), `smoke-kcq-connector.sh` (moved from `infra/ops/scripts`, per-connector ports), `test_kcq_supervisor.py`.
- Removed: `Dockerfile.kcq-gotdx`, `Dockerfile.kcq-python`, `kcq-{tdx,python,binance}.toml`, `deploy-kcq-connectors.yml`.
- `deploy-kcq-fly.yml` is now the only deploy: checks out the chart plus the two pinned connector repos, builds one image, deploys, verifies each connector on the Machine, then cert/DNS/public smokes. New `verify_only` input replaces the old connector verify mode.
- `kcq-compatibility.yml` also runs the supervisor/proxy contract tests and `nginx -t`.

The frontend needs no change: it only knows `/market/tdx`, `/market/python` and `/market/binance/...` on its own origin.

## Cutover (owner)

Current machines remain untouched until step 5. Public path `nebutra-kcq.fly.dev` keeps serving throughout; the old connector apps simply stop being used once the new nginx config is live.

1. Merge the branch, then dispatch the deploy: `gh workflow run deploy-kcq-fly.yml -f cutover=false`. It builds the combined image, replaces the nebutra-kcq machine (the memory change from 512 MB to 1 GB happens here), and fails if any connector does not return real search/bars/depth.
2. Machine state: `flyctl machines list -a nebutra-kcq` shows exactly one started machine, 1024 MB; `flyctl status -a nebutra-kcq` shows both checks (`tdx`, `python`) passing.
3. Logs show all four prefixes and no crash loop: `flyctl logs -a nebutra-kcq --no-tail | tail -80` (expect one `started` per process and no repeated `restarting`).
4. End to end through the public host (these go through the new loopback proxy, not the old apps):
   - `curl -fsS -H 'content-type: application/json' -d '{"sourceId":"gotdx","keyword":"600519","limit":3}' https://kcq.nebutra.com/market/tdx/api/v1/market-data/instruments/search | jq '.data.items|length'` returns more than 0.
   - same with `/market/python/...` and `{"sourceId":"tradingview","keyword":"AAPL","limit":3}`.
   - `curl -fsS -m 10 'https://kcq.nebutra.com/market/binance/api/binance/orderbook?symbol=btcusdt' | jq '(.bids|length)>0'` returns true.
   - `flyctl ssh console -a nebutra-kcq -C 'env CONNECTOR=tdx /bin/sh /usr/local/bin/nebutra-smoke.sh'` (and `python`, `binance`) exits 0.
   - Open https://kcq.nebutra.com in a browser, load a symbol chart and the depth view.
5. After a day of clean logs and the checks above, destroy the old apps: `flyctl apps destroy nebutra-kcq-tdx --yes`, then `nebutra-kcq-python`, then `nebutra-kcq-binance`. Confirm with `flyctl apps list | grep kcq` (only `nebutra-kcq`). Rollback before this step: redeploy the previous commit's workflow; the old apps still serve the previous nginx config.
6. Use the freed machines for Inngest (`flyctl machines list` org-wide count: 17).

Memory check after cutover: `flyctl ssh console -a nebutra-kcq -C "grep -E 'MemTotal|MemAvailable' /proc/meminfo"`; under load MemAvailable should stay above 300 MB.

## Not verified locally

The pinned `uv sync` of the TradingView connector (needs GitHub for the git-pinned `tvdatafeed`) and live Binance/market data could not run from the local network; the Fly remote builder and the in-workflow smoke checks are the verification. Locally verified: Go builds, image assembly, nginx config test, supervisor start/restart/shutdown, tdx process reachable through the nginx proxy.
