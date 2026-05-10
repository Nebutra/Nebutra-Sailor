# @nebutra/ai-providers

Provider registry metadata for Nebutra AI scaffolding.

This package is **stable** because it is metadata-only. It does not execute model
requests, open network connections, or own runtime retry/fallback behavior.
Runtime AI calls live in `@nebutra/agents`.

## What This Package Exports

- `PROVIDERS` — the full provider metadata registry.
- `PROVIDERS_BY_CATEGORY` — grouped provider metadata for UI/docs rendering.
- `getProvider(id)` — lookup by provider id.
- `isCNCompatible(provider)` — deployment-region compatibility helper.
- `ProviderMeta`, `ProviderStatus`, and `ProviderCategory` types.
- `templates/registry.ts.template` — consumed by `create-sailor` when generating
  app-local provider registries.

## Runtime Boundary

Use `@nebutra/agents` for runtime calls such as model creation, streaming,
generation, embedding, and provider fallback execution.

```typescript
import { getProvider, PROVIDERS } from "@nebutra/ai-providers";

const openai = getProvider("openai");
const cnProviders = PROVIDERS.filter((provider) => provider.status === "cn-compatible");
```

## Consumers

- `create-sailor` uses this registry to scaffold AI provider configuration.
- Documentation generators use it to render provider support matrices.
- Admin/product UIs may use it to display supported provider metadata.

## Maintenance Rules

- Keep this package data-only. Do not add runtime provider SDK clients here.
- Add network/runtime behavior to `@nebutra/agents`.
- When adding a provider, update `src/meta.ts` and the templates that expose the
  provider to generated apps.

## License

AGPL-3.0
