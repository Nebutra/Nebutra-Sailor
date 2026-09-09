# @nebutra/prepaid-wallet

Status: WIP — contracts and in-memory adapters exist; Prisma/gateway production wiring is host-owned.

Product control-plane contracts for **Nebutra Router** and **Nebutra Forge**:

- Prepaid wallet port (`PrepaidWallet`) + in-memory implementation for tests
- API key issue/hash helpers (SHA-256 fingerprint, `sk-sailor-` prefix — same as gateway)
- Scopes: `models:*` / `tools:*`
- Dual-ledger **UsageEnvelope** (customer charge truth + optional supply cost)

This package does **not** own Prisma migrations; wire `PrepaidWallet` to existing `CreditBalance` in the gateway/billing layer at integration time.

## Usage

```ts
import {
  MemoryPrepaidWallet,
  issueApiKey,
  hasScope,
  API_SCOPES,
  createUsageEnvelope,
} from "@nebutra/prepaid-wallet";

const wallet = new MemoryPrepaidWallet();
await wallet.topUp({ tenantId: "org_1", amount: 10 });

const key = issueApiKey({ scopes: [API_SCOPES.TOOLS_ALL] });
hasScope(key.scopes, "tools:word-count"); // true

const envelope = createUsageEnvelope({
  requestId: "req_1",
  tenantId: "org_1",
  apiKeyId: null,
  product: "forge",
  meterId: "forge.text.word_count",
  customerCharge: { amount: 0, currency: "USD", unit: "call" },
  quantity: 1,
  status: "success",
});
```

## `MemoryPrepaidWallet` is a test double

`MemoryPrepaidWallet` is process-local: two instances disagree about the balance
and a restart loses it. It exists for unit tests. **No product surface may
construct it** — every real wallet is `createCreditLedgerWallet()` over
`CreditBalance` / `CreditTransaction`, keyed by `Tenant.id` (personal or org
tenant; `CreditBalance.tenantId` is unique and FK'd to `Tenant`).

## CreditBalance adapter

```ts
import * as credits from "@nebutra/billing/credits";
import { createCreditLedgerWallet } from "@nebutra/prepaid-wallet";

const wallet = createCreditLedgerWallet({
  getCreditBalance: credits.getCreditBalance,
  getCreditBalanceFresh: credits.getCreditBalanceFresh,
  invalidateCreditCache: credits.invalidateCreditCache,
  addCredits: credits.addCredits,
  deductCredits: credits.deductCredits,
});
```

The host must have called `configureBillingTenantDb(getTenantDb)` at bootstrap,
or every call throws "requires a host tenant DB".

### Two reads, on purpose

`getCreditBalance` reads through a module-level 60s cache in the billing
service. On a second instance that cache can report a balance the first
instance has already spent — an overdraw. So the port has two reads and the
wallet has two:

| Method | Cache | Use for |
|---|---|---|
| `getBalance` / `hasBalance` | cached | dashboards, display |
| `getBalanceFresh` / `hasBalanceFresh` | uncached | every admit/guard/spend decision |

Every mutation calls `invalidateCreditCache(tenantId)` before it re-reads.

Customer charge remains Nebutra ledger truth; wire `createUsageEnvelope` after debit.

## Design

See `docs/plans/2026-07-23-nebutra-router-forge-design.md` (PR-A).
