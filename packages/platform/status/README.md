# @nebutra/status

Multi-provider public status page integration for Nebutra apps.

Native adapters (read-only `fetchSummary`):

| Provider | `provider` value | Identifier |
|----------|------------------|------------|
| **OpenStatus** (default) | `openstatus` or omit | `pageSlug` |
| **Atlassian Statuspage** | `statuspage` | `pageId` (id or full base URL) |
| **Better Stack** | `betterstack` | `pageUrl` (full URL or Better Uptime subdomain) |
| **Instatus** | `instatus` | `pageUrl` (full URL or Instatus subdomain) |
| **Internal health** | `internal` | `healthUrl` |

This package normalizes vendor payloads into a shared `StatusPageData` shape and
ships React surfaces (`StatusBadge`, `StatusWidget`). It is **not** a write API
for creating incidents, and it is **not** the production host for
`status.nebutra.com` (that surface currently uses first-party probes in
`apps/landing`).

## Installation

```bash
pnpm add @nebutra/status
```

## Programmatic fetch

```typescript
import { createStatusProvider, fetchStatusPage } from "@nebutra/status";

// OpenStatus (default)
await fetchStatusPage({ pageSlug: "nebutra" });

// Atlassian Statuspage
await fetchStatusPage({ provider: "statuspage", pageId: "kctbh9vrtdwd" });
await fetchStatusPage({
  provider: "statuspage",
  pageId: "https://status.example.com",
});

// Better Stack — public GET {page}/index.json
await fetchStatusPage({
  provider: "betterstack",
  pageUrl: "https://status.betterstack.com",
});

// Instatus — public GET {page}/summary.json
await fetchStatusPage({
  provider: "instatus",
  pageUrl: "https://instat.us",
});

// Internal /health
await fetchStatusPage({
  provider: "internal",
  healthUrl: "https://api.example.com/health",
});

// Or keep a provider instance
const provider = createStatusProvider({
  provider: "betterstack",
  pageUrl: "https://status.example.com",
});
const data = await provider.fetchSummary();
```

## React components

```tsx
import { StatusBadge, StatusWidget } from "@nebutra/status";

// OpenStatus
<StatusBadge pageSlug="nebutra" showLabel />
<StatusWidget pageSlug="nebutra" />

// Atlassian Statuspage
<StatusBadge provider="statuspage" pageId="kctbh9vrtdwd" showLabel />

// Better Stack
<StatusBadge provider="betterstack" pageUrl="https://status.example.com" showLabel />
<StatusWidget provider="betterstack" pageUrl="https://status.example.com" />

// Instatus
<StatusBadge provider="instatus" pageUrl="https://status.example.com" showLabel />
<StatusWidget provider="instatus" pageUrl="https://status.example.com" />

// Static (no network)
<StatusBadge status="operational" showLabel />
```

## Status vocabulary

| Status           | Description               |
| ---------------- | ------------------------- |
| `operational`    | All systems normal        |
| `degraded`       | Reduced performance       |
| `partial_outage` | Some features unavailable |
| `major_outage`   | Service unavailable       |
| `maintenance`    | Planned maintenance       |
| `unknown`        | Fetch failed / unmapped   |

## Public endpoints used by adapters

| Provider | Endpoint |
|----------|----------|
| OpenStatus | `GET https://api.openstatus.dev/v1/status-page/{slug}/summary` |
| Statuspage | `GET https://{pageId}.statuspage.io/api/v2/summary.json` (or `{custom}/api/v2/summary.json`) |
| Better Stack | `GET {pageUrl}/index.json` |
| Instatus | `GET {pageUrl}/summary.json` |
| Internal | `GET {healthUrl}` |

Failed or timed-out fetches degrade to safe empty `StatusPageData` (`status: "unknown"`), they do not throw into UI consumers.

## Environment variables (optional)

OpenStatus uptime config (repo root `openstatus.lock` / ops tooling):

```bash
OPENSTATUS_API_TOKEN=
OPENSTATUS_PAGE_SLUG=nebutra
```

Badge/widget read paths for Statuspage / Better Stack / Instatus use **public**
summary JSON and do not require API tokens.

## Related

- Landing first-party probes: `apps/landing/src/lib/status-checks.ts`
- Observability notes: `infra/ops/observability/README.md`
- Package contract: `AGENTS.md`
