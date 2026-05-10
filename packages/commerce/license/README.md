# @nebutra/license

> License domain logic for issuance, validation, and lifecycle event handling.

## Installation

```bash
# Internal monorepo dependency
pnpm add @nebutra/license@workspace:*
```

## Usage

```typescript
import { issueLicense, validateLicense, generateSlug } from "@nebutra/license";

// Issue a new license
const license = await issueLicense({
  userId: "user_123",
  tier: "OPC",
  displayName: "Jane Doe",
  email: "jane@example.com",
  githubHandle: "janedoe",
});
// → { id, licenseKey, tier, type, expiresAt }

// Validate an existing license
const result = await validateLicense("license-key-here");
// → { valid: true, tier: "OPC", type: "FREE" }

// Generate a human-readable slug
const slug = generateSlug();
```

## API

| Export | Description |
|--------|-------------|
| `issueLicense(params)` | Issue a new license (idempotent per user+tier) |
| `validateLicense(key)` | Validate a license key and return its status |
| `generateSlug()` | Generate a human-readable license slug |

### Types

| Type | Description |
|------|-------------|
| `LicenseTier` | `"INDIVIDUAL"` / `"OPC"` / `"STARTUP"` / `"ENTERPRISE"` |
| `LicenseType` | `"FREE"` / `"COMMERCIAL"` |
| `IssueLicenseParams` | Input for `issueLicense` (userId, tier, displayName, email, etc.) |
| `IssueLicenseResult` | Output with id, licenseKey, tier, type, expiresAt |
| `ValidateLicenseResult` | Validation output with valid flag, tier, type, error |
| `LicenseIssuedEvent` | Queue event payload for downstream handlers |

### Zod Schemas

| Schema | Description |
|--------|-------------|
| `LicenseTierSchema` | Zod enum for license tier validation |
| `LicenseTypeSchema` | Zod enum for license type validation |

## License Rules

- `INDIVIDUAL` and `OPC` tiers resolve to `FREE` type (perpetual)
- `STARTUP` and `ENTERPRISE` tiers resolve to `COMMERCIAL` type (1-year expiry)
- Issuance is idempotent: re-issuing for the same user+tier returns the existing license

## Dependencies

- `@nebutra/db` -- Prisma database access
- `@nebutra/queue` -- Event publishing (`license.issued`)
- `@nebutra/email` -- License delivery emails
