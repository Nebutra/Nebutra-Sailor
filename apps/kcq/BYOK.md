# Customer-owned market connections

The KCQ host integrates Twelve Data for historical US equities/ETFs and crypto bars. Provider directory entries without a supported market session are omitted. Forex and additional exchanges need verified trading-session mappings; live streams, depth, timeshare and trading-calendar APIs are not advertised.

The chart source-management slot mounts shared UI primitives. Signed-in users can connect, test, replace and disconnect a Twelve Data Key. Personal connections are private to the account. Team connections are usable by verified members; only owners/admins mutate credentials. An account or workspace change reloads the chart and its scoped preferences.

The gateway validates Nebutra sessions and live workspace membership, derives the canonical tenant, and accesses `MarketDataConnection` through the tenant database/RLS client. `@nebutra/vault` encrypts credentials with tenant context; the encrypted payload also contains the connection ID. Metadata APIs select only labels, masked suffixes and timestamps. No browser persistence, URL query, provider error or API response contains a raw key.

The authenticated `/market/byok` proxy forwards to the gateway over verified TLS. Provider requests use a fixed Twelve Data host, Authorization header, timeout and disabled redirects. Requests are bounded and source IDs must match the owned connection. Explicit-source failures never spend Nebutra provider quota. Provider subscriptions and data rights remain those of the customer's account.

Daily labels are interpreted in the exchange timezone; intraday timestamps requested in UTC. Native aggregation and no/split adjustment only; unsupported transformations fail before a provider request. Probe performs one minimal AAPL history request on the customer's quota.

KCQ library changes are tracked in upstream PR #298. The immutable deployment integration revision retains the workspace/navigation changes pending in PR #297. Both are canonical KCQ source changes; there is no duplicated chart registry in this host.

Supplier shortlist and future adapter requirements live in KCQ `docs/design/market-data-byok.md`: Twelve Data, Alpaca, Massive, Finnhub, Tushare and self-hosted KCQ V1 endpoints. Arbitrary endpoints are not accepted until URL allowlisting and SSRF controls are implemented.

Validation includes provider error redaction, explicit no-fallback routing, real scratch-Postgres RLS and tenant-bound vault encryption, member authorization, key replacement/disconnect, browser metadata redaction and fixed transports. Official Twelve Data demo validates real response normalization; an actual customer paid key is still required to verify paid entitlements.
