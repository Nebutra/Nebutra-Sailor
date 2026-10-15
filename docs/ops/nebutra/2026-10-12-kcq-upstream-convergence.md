# KCQ upstream convergence (2026-10-12)

The product chart pin moves from
`1aa5e22c61313a34d08878ad895e604e0d4a85e9` to
`3cbca3bb09efc6bc4b4f319c17eaac221c854dbb` in
`TsekaLuk/KLineChartQuant`, branch `codex/nebutra-upstream-20261012`.
The base is canonical upstream
`196d0fcc00f2910f5be37510c91cc39d9c418f9a`.

This includes the merged workspace/BYOK contracts (#297/#298), rendering
performance work (#309), real Binance trades and footprint support (#306),
tokens/shortcuts/interaction work (#313), and the THS daily provider (#312).
THS remains a library capability; its API key is not provisioned in the host.

## Preserved fork changes

| Original commit | Integration commit | Behavior |
| --- | --- | --- |
| `cc02b7c9` | `c14fc1b5` | Host-managed Agent provider |
| `c6cc6129` | `1a12c275` | Canonical KLineChartQuant wordmark |
| `f8cfec10` | `b1e75e83` | Avoid the inlined full CJK screenshot font |
| `c73727fa` | `e5212092` | Viewport-sized batched initial history and preloading |
| `8ebde616` | `eac91812` | Silent background history prefetch |
| `d5ab2d5b` | `3d509d0d` | Stable instrument ID on live-bar requests |
| `27263ad2` | `506bf77f` | Public live-bar transport and instrument opt-out |

`3cbca3bb` adapts these behaviors to upstream's new MarketRuntime, retains its
source-readiness and stale-load guards, exports the canonical trade-source
factory, and exposes read-only active-layout settings for the account page.
Regression tests cover explicit/automatic live-source resolution, instrument
identity and opt-out, scoped read-only layout settings and token-based fonts.

## Host integration

The host registers GOTDX, TradingView and Binance using public V1 factories.
Binance comes from `363045841/Binance-Connector` at
`60381967785a65a2777b3da1f57b823df49fc318`, independently pinned in
`apps/kcq/connector-sources.json`. Its same-origin prefix is `/market/binance`.
It replaces the old GOTDX bundled depth service.

The image builds the separate Go binary and the supervisor uses
`BINANCE_LISTEN=127.0.0.1:8082`, `BINANCE_PROXY=direct`, and
`BINANCE_CACHE_DIR=/var/lib/kcq/binance`. Nginx admits only the V1 allowlist:
bars, catalog, probe, depth, trades, trade ranges, streams and archives.
It clears Origin before reaching the loopback-only CORS policy, and disables
buffering/cache for streams and archives. Account cookies and Authorization
headers are not forwarded to the public Binance connector.

Profile initialization awaits the active scoped layout settings before using
the chart's canonical settings normalizer and theme resolver.

## Validation and release

The integrated source passed 3,260 package tests (one skipped and one TODO),
source/test type checks, token generation checks and the product compatibility
gate: 110 product tests, strict types and client/SSR production builds.
The KCQ architecture/SEO tests passed (33), upgrade safety tests passed (3),
and supervisor/proxy contracts passed (10).
The Binance connector passed Go race tests and vet. A local connector smoke
received real spot bars, depth and trade SSE from Binance.
Documentation type checks, 12 tests and the static export passed against the
final chart SHA (176 pages). A standalone nginx syntax check and a real
same-origin proxy request passed. Browser checks covered live Binance search
and chart rendering, theme switching, account-menu Escape/focus return,
Agent open/close and read-only profile theme restoration. These used an
anonymous local session; no authenticated model call or paid BYOK request ran.
The local Docker storage reports an I/O error, so the final Linux image build
still belongs to deployment CI.

Build documentation against the same final pin:

```sh
pnpm --filter @nebutra/kcq-docs typecheck
pnpm --filter @nebutra/kcq-docs test
pnpm --filter @nebutra/kcq-docs build
```

This change prepares the product source and deployment workflow. Production
is updated only after the Nebutra change is committed and compatibility CI
passes, followed by `deploy-kcq-fly.yml`. The workflow builds the image,
checks nginx syntax, and verifies real data on the Machine.

Rollback restores the previous product source, chart pin and connector pin
together, passes the same compatibility gate and redeploys. Restoring only the
chart SHA would leave the host's new public APIs and Binance routes mismatched.
