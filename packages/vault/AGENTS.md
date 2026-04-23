# AGENTS.md — packages/vault

Execution contract for Nebutra's application-layer secrets vault.

## Scope

Applies to everything under `packages/vault/`.

This package owns envelope-encryption contracts, provider selection, JSON
helpers, and provider-specific KMS or local-key implementations. It is the
shared secret-protection layer, not the place for app-specific credential
storage workflows or remote secret discovery.

## Source Of Truth

- Public package surface and subpath exports: `package.json`, `src/index.ts`
- Canonical encrypted-secret schemas and provider interfaces:
  `src/types.ts`
- Provider selection and singleton lifecycle:
  `src/factory.ts`
- Shared crypto primitives:
  `src/crypto.ts`
- JSON envelope helpers:
  `src/json.ts`
- Provider implementations:
  `src/providers/aws-kms.ts`,
  `src/providers/local.ts`

## Contract Boundaries

- Keep `src/types.ts` as the canonical vault contract. `EncryptedSecret`,
  provider config types, and `VaultProvider` define the compatibility boundary.
- Preserve provider detection and singleton behavior in `src/factory.ts`. Do
  not scatter `VAULT_PROVIDER`, `AWS_KMS_*`, or `VAULT_MASTER_KEY` detection
  across consumers.
- Keep encryption primitives in `src/crypto.ts` and provider behavior in
  `src/providers/*`. App code should not reimplement envelope encryption or key
  wrapping outside this package.
- Treat `src/json.ts` as the canonical path for structured-value encryption and
  `EncryptedSecret` round-tripping. Do not invent parallel JSON envelope
  formats in downstream packages.
- Respect the package's current foundation status. Rotation tooling, full
  tenant-isolation workflows, and decrypt audit coverage are not fully shipped
  yet; do not assume a more complete operational surface than the code exposes.

## Generated And Derived Files

- This package currently exports source files directly and has no checked-in
  generated source of truth.
- Do not hand-edit transient encrypted payload dumps or ad hoc build artifacts.
- If the public surface changes, update `package.json` and the source files
  above instead of patching derived output.

## Validation

- Package contract changes:
  `pnpm --filter @nebutra/vault typecheck`

