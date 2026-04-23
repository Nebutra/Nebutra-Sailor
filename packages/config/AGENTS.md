# AGENTS.md — packages/config

Execution contract for Nebutra's shared configuration package.

## Scope

Applies to everything under `packages/config/`.

This package owns reusable environment schema definitions and config-loading
helpers. It is the shared env-contract layer, not the place for app-specific
runtime branching or secret-fetching side effects.

## Source Of Truth

- Public package surface: `package.json`, `src/index.ts`
- Canonical Zod schemas for shared env groups:
  `baseConfigSchema`,
  `databaseConfigSchema`,
  `redisConfigSchema`,
  `authConfigSchema`,
  `aiConfigSchema`,
  `billingConfigSchema`,
  `storageConfigSchema`,
  `observabilityConfigSchema`,
  `alertConfigSchema`
- Config loading and caching behavior:
  `loadConfig`, `safeLoadConfig`, `clearConfigCache`
- Predefined getters and environment helpers:
  `getBaseConfig`, `getDatabaseConfig`, `getRedisConfig`, `getAuthConfig`,
  `getAiConfig`, `getBillingConfig`, `getStorageConfig`,
  `getObservabilityConfig`, `getAlertConfig`,
  `isDevelopment`, `isProduction`, `isTest`, `getEnvironment`

If an env variable, default, or parsing rule is shared across packages, change
the source of truth here instead of patching individual consumers.

## Contract Boundaries

- Keep `src/index.ts` as the canonical shared env contract. Consumers should
  import schemas or getters from this package rather than re-declaring the same
  variables elsewhere.
- Prefer additive schema changes. Tightening validation, renaming keys, or
  changing defaults here is a cross-repo behavior change even if no build
  breaks immediately.
- Preserve the split between schema definition and app-level policy. This
  package validates and loads environment variables; it should not grow
  provider SDK setup, remote-secret fetching, or feature orchestration logic.
- Keep caching behavior centralized in `loadConfig` and `clearConfigCache`.
  Tests and consumers should not invent parallel config caches.
- Prefix handling belongs in `loadConfig` options. Do not duplicate prefix
  stripping or env remapping in downstream packages when the shared helper can
  own it.
- Because this package is consumed broadly, small changes here have outsized
  blast radius. Treat schema edits as compatibility-sensitive.

## Generated And Derived Files

- This package currently exports source files directly and has no checked-in
  generated source of truth.
- Do not hand-edit transient TypeScript artifacts or ad hoc env snapshots.
- If build output changes in the future, update the source file above rather
  than patching derived output.

## Validation

- Shared config contract changes:
  run the narrowest affected consumer verification available, because this
  package currently has no package-local scripts.
- When changing env schemas or defaults, verify at least one downstream package
  that consumes the affected getter before widening the change.
