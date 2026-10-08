# KCQ product workbench

Nebutra's product shell (shared React navigation with the canonical Vue chart) around the canonical KCQ chart library. Account
identity and organization membership come from `@nebutra/auth/browser` and
the shared auth center. No independent user store or auth secret is created.

Set `KCQ_SOURCE_DIR` to a checkout of the canonical repository with the
browser persistence-scope API, then run `pnpm --filter @nebutra/kcq build`.
The deploy workflow checks out an immutable revision, installs its toolchain,
and builds this app, rather than the library preview. KCQ source aliases are
generated from the upstream export map. Product code imports public APIs.

Honesty layer: organization membership is validated by Better Auth; local
layouts, watchlists, chart preferences and Agent sessions are partitioned by
account and workspace. Workspace changes reload the page to discard singleton
caches. These are browser-local preferences, not cloud synchronization or a
permission boundary against same-origin scripts. Organization provisioning,
team administration and billing remain in Nebutra. Managed AI credentials
are not provisioned by this shell.

Market data uses private Fly Machines in Singapore, proxied through this host:
GOTDX at `/market/tdx` (A shares, indices and extended markets), TradingView
at `/market/python` (global historical bars), and Binance read-only orderbook
and depth SSE at `/market/binance/api/binance`. Binance is not a V1 K-line
provider or a trading endpoint; its depth service is available for a separate
depth visualization integration. Only GOTDX and TradingView enter the chart
source catalog. Old scoped loopback defaults migrate to hosted endpoints;
custom addresses and user source choices are retained.

Connector revisions are pinned in `connector-sources.json`. Run
`deploy-kcq-connectors.yml` before deploying the product with
`deploy-kcq-fly.yml`. The connector workflow verifies real search and recent
bars (or Binance depth), not just process liveness. Upstream directory SQLite
files are disposable caches, regenerated after Machine replacement. GOTDX
runs in Shanghai timezone to preserve upstream timestamp interpretation.
Nginx restricts exposed paths, request sizes, rates and concurrent connections;
connectors have no public listeners and receive no account/trading secrets.

BaoStock is withheld until upstream login succeeds; FinShare is withheld while
its tested continuous-contract history is stale. MT5 requires a Windows host
with a logged-in terminal and cannot run on these Linux Machines. These data
sources are not advertised as provisioned.

Frontend layout and interaction requirements live in [DESIGN.md](./DESIGN.md).

Account settings live at `/settings/profile` on the KCQ host. Route and profile
regressions run from the repository root with
`pnpm exec vitest run --config apps/kcq/vitest.config.ts`.
