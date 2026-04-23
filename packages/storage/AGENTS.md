# AGENTS.md — packages/storage

Execution contract for Nebutra's low-level object storage package.

## Scope

Applies to everything under `packages/storage/`.

This package owns the checked-in Cloudflare R2 client wrapper, bucket naming,
basic object operations, and signed URL helpers. It is a low-level storage
primitive, not the higher-level upload orchestration layer.

## Source Of Truth

- Public package surface and subpath exports: `package.json`, `src/index.ts`
- Canonical R2 client configuration, bucket mapping, object operations,
  tenant-scoped upload helper, and signed URL semantics: `src/r2.ts`

Treat `README.md` as descriptive only. If examples drift, update `src/r2.ts`
instead of preserving stale docs.

## Contract Boundaries

- Keep this package focused on low-level storage operations. Multipart upload
  orchestration, resumable upload flows, and MIME validation belong in
  `@nebutra/uploads`, not here.
- Treat `src/r2.ts` as the canonical source for bucket names, environment
  resolution, and signed URL behavior. Renaming buckets or changing public URL
  derivation is a behavior change for downstream consumers.
- Preserve the distinction between generic object operations and tenant-aware
  naming. `uploadForTenant` owns the current tenant prefix convention; do not
  scatter competing key layouts into callers.
- Keep the public surface narrow. If new storage providers are introduced, add
  them deliberately rather than overloading the existing R2 module implicitly.

## Generated And Derived Files

- This package currently exports source directly and has no checked-in codegen.
- Do not hand-edit transient object listings, local bucket dumps, or future
  build output.
- If storage behavior changes, update `src/r2.ts` rather than patching derived
  artifacts.

## Validation

- Storage runtime changes:
  `pnpm --filter @nebutra/storage exec tsc --noEmit`
