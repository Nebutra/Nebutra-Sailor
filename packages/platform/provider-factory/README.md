# @nebutra/provider-factory

Neutral provider-resolution primitive for provider-agnostic Nebutra packages.

This package centralizes the shared selection rule used by cache, queue, search,
notifications, vault, uploads, and similar packages:

```text
explicit provider -> environment provider -> detector chain -> fallback
```

It does not instantiate concrete providers. Domain packages still own their
provider-specific imports and setup.

## Installation

```bash
pnpm add @nebutra/provider-factory
```

## Usage

```ts
import {
  assertProviderAllowed,
  envPresent,
  resolveProviderType,
} from "@nebutra/provider-factory";

type CacheProvider = "memory" | "redis";

const provider = resolveProviderType<CacheProvider>({
  explicit: undefined,
  envVarName: "CACHE_PROVIDER",
  detectors: [{ provider: "redis", when: envPresent("REDIS_URL") }],
  fallback: "memory",
});

assertProviderAllowed(provider, {
  disallowedInProd: ["memory"],
  overrideEnv: "ALLOW_MEMORY_CACHE_IN_PROD",
  hint: "Configure REDIS_URL or set CACHE_PROVIDER=redis",
});
```

## API

| Export | Description |
| --- | --- |
| `resolveProviderType(input)` | Apply explicit, env, detector, fallback precedence |
| `envPresent(name)` | Build a detector predicate from an environment variable |
| `assertProviderAllowed(provider, options)` | Refuse unsafe providers in production unless explicitly overridden |
| `ProviderDetector<T>` | Detector shape |
| `ResolveProviderInput<T>` | Resolver input shape |
| `ProdGuardOptions<T>` | Production guard options |

## License

MIT
