# Frontier model SSOT

**Single source of truth:** [`src/frontier.ts`](./src/frontier.ts)

```ts
import {
  DEFAULT_PUBLIC_MODEL,
  DEFAULT_PREFIXED_MODEL,
  FRONTIER,
  ROUTER_PUBLIC_MODEL_IDS,
  AGENT_MODEL_PRESETS,
} from "@nebutra/ai-providers/frontier";
```

## How to bump the industry catalog

1. Edit **only** `packages/ai/ai-providers/src/frontier.ts` (slot values + prices).
2. Run tests: `pnpm --filter @nebutra/ai-providers test` (if configured) and consumers.
3. Do **not** hand-type versioned model strings in apps/gateway/router/forge.

## Who consumes it

| Consumer | Import |
|----------|--------|
| Router supply aliases | `@nebutra/ai-providers/frontier` → `DEFAULT_ALIASES` |
| Forge price card | same → `REF_PRICE_CARD` |
| Agents presets / defaultModel | `AGENT_MODEL_PRESETS` / `DEFAULT_PREFIXED_MODEL` |
| Gateway AI routes | `DEFAULT_PUBLIC_MODEL` |
| Router app fallbacks | `@nebutra/router-supply` re-export of default |
| DB offline seed | `ROUTER_PUBLIC_MODEL_IDS` + prices |

## Live vs offline

- **Offline / product defaults:** this registry.
- **Live “newest routable”:** `resolveFrontierModel(tier)` in `catalog.ts` (OpenRouter ∩ models.dev), falling back to `FRONTIER_TIER_FALLBACK`.
