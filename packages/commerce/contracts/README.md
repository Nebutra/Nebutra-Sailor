# @nebutra/contracts

Canonical Zod-validated schemas for cross-service communication in Nebutra.

## Design Intent

This package defines the **shared language** between all services, apps, and packages. Every boundary that crosses a service (HTTP headers, event bus payloads, billing ledger entries) is expressed as a versioned Zod schema here, with no implementation logic attached. Packages consume these schemas to validate inputs at their own edges; the contracts package itself has zero runtime behavior.

The versioning convention (`claimsVersion: "v1"`, `contractVersion: "v1"`, `ingestVersion: "v1"`) makes breaking changes explicit and traceable across the codebase without requiring coordinated deployments.

## Exports

| Sub-path | Contents |
|---|---|
| `@nebutra/contracts` | All schemas (re-exports below) |
| `@nebutra/contracts/identity` | `CanonicalIdentity`, `CanonicalRole`, `CanonicalPlan`, `TenantHeaderContract` |
| `@nebutra/contracts/billing` | `UsageLedgerEntryInput`, `UsageType`, `PricingCatalogVersion` |
| `@nebutra/contracts/events` | `EventEnvelope`, `EventContext` |

## Usage

```typescript
import { CanonicalIdentitySchema } from "@nebutra/contracts/identity";
import { EventEnvelopeSchema } from "@nebutra/contracts/events";

const identity = CanonicalIdentitySchema.parse(rawClaims);
const event = EventEnvelopeSchema.parse(rawMessage);
```
