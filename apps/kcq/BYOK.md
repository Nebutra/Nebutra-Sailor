# Customer-owned market connections

The KCQ host integrates Twelve Data for historical US equities/ETFs and crypto bars. Provider directory entries without a supported market session are omitted. Forex and additional exchanges need verified trading-session mappings; live streams, depth, timeshare and trading-calendar APIs are not advertised.

The chart source-management slot mounts shared UI primitives. Signed-in users can connect, test, replace and disconnect a Twelve Data Key. Personal connections are private to the account. Team connections are usable by verified members; only owners/admins mutate credentials. An account or workspace change reloads the chart and its scoped preferences.

The gateway validates Nebutra sessions and live workspace membership, derives the canonical tenant, and accesses `MarketDataConnection` through the tenant database/RLS client. `@nebutra/vault` encrypts credentials with tenant context; the encrypted payload also contains the connection ID. Metadata APIs select only labels, masked suffixes and timestamps. No browser persistence, URL query, provider error or API response contains a raw key.

The authenticated `/market/byok` proxy forwards to the gateway over verified TLS. Provider requests use a fixed Twelve Data host, Authorization header, timeout and disabled redirects. Requests are bounded and source IDs must match the owned connection. Explicit-source failures never spend Nebutra provider quota. Provider subscriptions and data rights remain those of the customer's account.

Daily labels are interpreted in the exchange timezone; intraday timestamps requested in UTC. Native aggregation and no/split adjustment only; unsupported transformations fail before a provider request. Probe performs one minimal AAPL history request on the customer's quota.

KCQ library changes are tracked in upstream PR #298. The immutable deployment integration revision retains the workspace/navigation changes pending in PR #297. Both are canonical KCQ source changes; there is no duplicated chart registry in this host.

Supplier shortlist and future adapter requirements live in KCQ `docs/design/market-data-byok.md`: Twelve Data, Alpaca, Massive, Finnhub, Tushare and self-hosted KCQ V1 endpoints. Arbitrary endpoints are not accepted until URL allowlisting and SSRF controls are implemented.

Validation includes provider error redaction, explicit no-fallback routing, real scratch-Postgres RLS and tenant-bound vault encryption, member authorization, key replacement/disconnect, browser metadata redaction and fixed transports. Official Twelve Data demo validates real response normalization; an actual customer paid key is still required to verify paid entitlements.

## Managed AI (Agent provider)

KCQ requires sign-in, and the Agent's default model goes through Nebutra Router. The host exposes an OpenAI-compatible surface at `/market/ai/v1` (`GET /models`, `POST /chat/completions`, streaming supported), proxied by nginx to the gateway's `/api/v1/kcq-ai`. The session cookie is the only credential.

- Nebutra platform staff (an unrevoked `PlatformStaff` grant for the verified session user, read server-side) are served the Command Code INTERNAL source with `deepseek/deepseek-v4.1-flash` (`KCQ_AI_STAFF_MODEL`).
- Every other signed-in user is served Router's PUBLIC supply with `gpt-5.6-luna` (`KCQ_AI_PUBLIC_MODEL`).
- The browser cannot choose the model or tier. The gateway signs a service token carrying the user id and, for staff only, the staff role. Router refuses INTERNAL sources to any token without that identity (`internalRouteFor`), so a customer call can never reach an INTERNAL source.
- Per-user rate limit (`KCQ_AI_RATE_PER_MINUTE`, default 20), output cap (`KCQ_AI_MAX_OUTPUT_TOKENS`, 8192), body cap 1 MB, same-origin POSTs only.
- Usage is logged per request as `kcq.ai.usage` (user, tier, model, tokens, `billed: false`). Billing gap: Router's reserve/settle money edge is keyed to API keys on the public relay, not the service-token relay, so KCQ customer calls are not yet debited from a product wallet.

Host client: `src/managed-ai.ts` (`createManagedAiClient`, `managedAiFetch`, `MANAGED_AI_BASE_PATH`).

Upstream KCQ needs (the Agent lives in `@363045841yyt/klinechart-agent-runtime`): its OpenAI-compatible provider (`createOpenAiCompatibleRuntimeSupport`) already accepts an injected `fetch`, a `ProviderCredentialStore` and a `ProviderSettingsStore`. The host must be able to preseed a verified, `compatible` settings record with `baseUrl = <origin>/market/ai/v1` and `fetch = managedAiFetch()`, with a read-only credential store returning `MANAGED_AI_CREDENTIAL`, and hide the Provider key/base-URL form in managed mode. That seeding hook (a `managedProvider` option on `BrowserAgentBridge`/`createBrowserRuntimeSessions`) is an upstream KCQ PR; this repository does not patch the library.
