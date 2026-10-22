# KCQ upstream convergence (2026-10-22)

The chart pin moves from `a11976d24898dd6c81691108172004d18cee4244`
to `eb21bb3c348eab8cbd6063082359cecfb516493e` in
`TsekaLuk/KLineChartQuant`, branch `codex/nebutra-upstream-20261022`.
Its canonical upstream base is
`8d4fba5d5a66f1395c10508a049970ce651088f4`.
The resulting SHA was pushed to the fork and fetched independently into
the ignored chart cache before product validation.

## Upstream scope

The base includes merged PRs #320 (Plot/Fill API and script indicators),
#321 (OHLC plots, cross-period requests and footprint display mode),
#328 (shared drawing line API, script output and screen primitives), and
#329 (indicator timeline projection and frame allocation performance).
It also includes the subsequent rendering fixes and benchmark documentation.
PR #324's theme change remains reverted by #327, matching upstream main.
The earlier script work from #316/#317 is already part of this history.

The previous integration is already merged through #766. The October 15
chart pin and the build-order/Binance-proxy fixes from #768/#769 form this
upgrade's starting point.

## Preserved product contracts

These existing fork changes were cherry-picked onto canonical upstream:

| Prior fork commit | New commit | Behavior |
| --- | --- | --- |
| `46c65f16` | `48695aa1` | Host-managed Agent provider and read-only credentials |
| `93f47331` | `0dcbf539` | Canonical KLineChartQuant spelling |
| `e1abcf18` | `fa08ea43` | Omit the inlined full CJK screenshot font |
| `fac7573a` | `e77a8403` | Viewport-sized batched initial history and prefetch |
| `a92d8e30` | `d955b413` | Silent background history prefetch |
| `301042b1` | `135e7587` | Stable instrument identity on live bars |
| `7bc853a0` | `fab958d8` | Public live-bar transport |
| `da983a90` | `eb21bb3c` | Scoped layout reader, public trade source and runtime adaptation |

Conflict resolution retains the new Agent settings layout and the shared
MarketRuntime stream table used by primary, comparison and script requests.
Stream creation forwards the resolved instrument ID and honors instrument
live-bar opt-out. Batched history retains upstream comparison ownership,
source readiness and stale-load guards.

Connector pins are unchanged. This upgrade uses the existing same-origin
GOTDX, TradingView and Binance V1 services.

## Host and documentation

The workbench awaits the canonical built-in script service after account
and workspace persistence initialization. That service registers the
indicator catalog, supplies the editor's source store, and terminates its
worker when the app unmounts. Initialization failures reach the existing
boot error surface before chart mount.

The host uses upstream's workspace source aliases, contract generator and
detached-editor plugin. Product compatibility checks follow the relocated
toolbar tests and include the managed Agent, history, live-stream and layout
regressions.

The existing CSP blocked both trusted native compilation and QuickJS/WASM
inside the new script worker. A URI map now grants dynamic execution only
to `/assets/script.worker-<hash>.js` responses. App, account, documentation,
other asset and editor-window responses keep the page policy. The inline
theme script remains admitted by its original hash.

Documentation reads the relocated chart component, imports the pinned
Script API and relevant design notes, and lists script packages and their
individual licenses. Public copy distinguishes the Apache-2.0 engine and
bindings from the AGPL-3.0-or-later script packages.

## Validation and release

The candidate passed 3,427 package tests (one skipped, one TODO), source and
test type checks. Product lifecycle tests cover asynchronous script-service
registration, provision of the same editor store, worker disposal and
initialization failure.

An independent clean fetch of the final remote SHA passed the product gate:
112 product tests, strict types, and client/SSR/prerender production builds.
The final pin was also used to rebuild public source links and generated
facts. Documentation passed type checking, 14 tests and the static export
(184 pages). Architecture/SEO checks passed 33 tests, upgrade-safety checks
passed three, and nginx/supervisor checks passed 11.

Real Chrome checks against the production nginx policy reproduced the
initial native/QuickJS CSP failures, then confirmed both compilation paths
with the updated policy while page-level dynamic evaluation remained
blocked. The actual workbench loaded its built-in indicator catalog and
script editor without page exceptions. The detached editor loaded its
external assets, and the script archive used the guest/personal workspace's
scoped database name. Real Binance search and bars rendered BTCUSDT with the
migrated BOLL script, without page exceptions. Standalone nginx configuration
validation passed.

This integration prepares source and a release pin. Production changes only
after the Nebutra PR merges, compatibility CI passes, and
`deploy-kcq-fly.yml` builds and deploys the image. Authenticated managed AI
and paid BYOK calls are outside this verification.

Rollback reverts this Nebutra integration together, restoring the previous
chart pin, build plugins, script boot integration and CSP configuration.
Run the same product/documentation gates and redeploy. A pin-only rollback
would leave incompatible component paths and script contracts in the host.
