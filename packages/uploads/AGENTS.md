# AGENTS.md — packages/uploads

Execution contract for Nebutra's upload orchestration package.

## Scope

Applies to everything under `packages/uploads/`.

This package owns upload-provider selection, presigned and multipart upload
contracts, resumable-upload config, local vs S3 provider adapters, and shared
validation helpers. It is the upload workflow layer above raw storage, not the
place for app-local controller code or CDN policy.

## Source Of Truth

- Public package surface and subpath exports: `package.json`, `src/index.ts`
- Canonical upload contracts and provider interfaces: `src/types.ts`
- Provider selection, auto-detection, singleton, and active-provider logic:
  `src/factory.ts`
- Provider implementations:
  `src/providers/s3.ts`, `src/providers/local.ts`
- Shared validation rules, blocked-extension list, and helper builders:
  `src/validation.ts`

Treat `README.md` as descriptive only. If examples drift, update the source
files above instead of preserving stale docs.

## Contract Boundaries

- Keep `src/types.ts` as the canonical contract for presigned uploads,
  multipart uploads, Tus config, upload completion, and provider interfaces.
  Tightening these shapes is a compatibility change for consumers.
- Keep provider selection centralized in `src/factory.ts`. Do not duplicate
  environment detection or singleton handling in apps.
- Preserve the split between raw provider operations and validation policy.
  Storage actions belong in `src/providers/`; size/MIME/extension checks belong
  in `src/validation.ts`.
- Respect the package's current foundation status. Tus wiring, validation
  depth, and virus scanning are incomplete; do not document or code against
  stronger guarantees than the package actually provides today.

## Generated And Derived Files

- This package currently exports source directly and has no checked-in codegen.
- Do not hand-edit transient upload manifests, local temp files, or future
  build output.
- If provider behavior changes, update the source files above rather than
  patching derived artifacts.

## Validation

- Upload contract, factory, provider, or validation changes:
  `pnpm --filter @nebutra/uploads typecheck`
- Export or build-output changes:
  `pnpm --filter @nebutra/uploads build`
