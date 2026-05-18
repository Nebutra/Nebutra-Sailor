# Rotating the scaffold-marker signing key

The `.nebutra/scaffold-meta.json` file emitted by `create-sailor` carries
an HMAC signature over `cliVersion|scaffoldedAt|projectName|nonce`. The
key used for that HMAC is stored in:

- **Source of truth:** `packages/ops/create-sailor/src/utils/license-signing-keys.ts`
- **CLI mirror:** `packages/ops/cli/src/utils/scaffold-meta-verify.ts`

Both files must agree on (a) the canonical input format and (b) the key
registry. A drift between them silently breaks `nebutra license verify`.

---

## When to rotate

You don't rotate often. Rotation is appropriate when:

| Trigger | Rotation needed? |
|---------|------------------|
| Key string leaked publicly outside source code | No — it's already in source; treat the source itself as the marker |
| New license tier introduced (e.g. `team`, `enterprise`) | No — extend the meta schema, not the key |
| Signature format change (canonical-input format changes) | **Yes** — bump `schemaVersion` AND key id |
| Want to invalidate all old markers (e.g. fraud event) | **Yes** — but only if you understand back-compat impact |
| Migrate from HMAC-SHA256 to a different algorithm | **Yes** |

If unsure, **don't rotate**. Wait for a real trigger.

---

## How to rotate (step-by-step)

### 1. Pick the new key id

Use `v2`, `v3`, …, monotonically. Never reuse a retired id.

### 2. Update create-sailor's registry

Edit `packages/ops/create-sailor/src/utils/license-signing-keys.ts`:

```ts
export const KEYS: readonly SigningKey[] = [
  // NEW current key — PREPEND at index 0
  {
    id: "v2",
    key: "nebutra-sailor:scaffold-marker:v2",
  },
  // Previously-current key, now retired
  {
    id: "v1",
    key: "nebutra-sailor:scaffold-marker:v1",
    retiredAt: "2026-12-01T00:00:00.000Z",
  },
];
```

### 3. Mirror the change in the CLI

Edit `packages/ops/cli/src/utils/scaffold-meta-verify.ts` so the `KEYS`
array there matches exactly. **Do not** copy `retiredAt` into the
verifier — the verifier doesn't care about retirement, only about being
able to look the key up.

### 4. Update tests

- `packages/ops/create-sailor/src/utils/license-emit.test.ts` — add a
  case that confirms newly-emitted markers carry `signingKeyId: "v2"`.
- `packages/ops/cli/tests/license-verify.test.ts` — update the `V1_KEY`
  drift-guard test to also pin the v2 key.

### 5. Bump versions

- `create-sailor`: **minor** bump (behaviour change in emitted artifacts).
- `nebutra` CLI: **patch** bump (verifier now recognises an additional key).
- Both packages should ship in the same release window so users can
  verify v2-signed projects with a compatible CLI.

### 6. Document in CHANGELOG

Add a `## Signing key rotation: v1 → v2` section to both packages'
CHANGELOG with:

- The trigger that prompted rotation.
- Back-compat guarantee: "v1-signed markers continue to verify on this
  release and all future releases until v1 is retired from the
  registry (no scheduled date)."
- Any operational followups (e.g. notify enterprise customers if a tier
  upgrade depends on signature verification).

---

## When to actually delete a retired key

Never, in practice. Retiring a key means "stop signing new markers with
it", not "stop accepting markers it signed". Removing an entry from the
registry would invalidate every `scaffold-meta.json` ever emitted under
that key — i.e. break `nebutra license verify` for every existing
project. Don't do this without a deprecation runway measured in
**years**, with explicit owner-notification campaigns.

The intended lifecycle is:

```
introduced → current → retired → (stays in registry forever)
```

> **TODO LEGAL:** if we ever need to *invalidate* old markers (e.g. for
> a security event or to force a tier upgrade), the legal mechanism is
> a license-update notification to scaffolded users, not a registry
> deletion. Counsel to advise on the user-notification text if/when
> this comes up.

---

## Drift detection

Both `license-emit.test.ts` and `license-verify.test.ts` pin the v1 key
string and canonical input format. If you change one without the other,
the test suite fails. **Do not** disable the drift-guard test to make a
rotation green — fix the drift instead.
