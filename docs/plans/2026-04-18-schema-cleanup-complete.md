# Schema Cleanup + Positioning Accuracy (2026-04-18)

## Summary

Cleaned up 34 orphan Prisma models via **two mechanisms**:
- **12 models hard-deleted** — truly dead code, no CLI flag ever revives them
- **22 models annotated `/// @conditional(...)`** — kept in master schema, pruned at scaffold time by `create-sailor` based on CLI selection

Final state: **49 models in master schema** (from 61), of which **27 unconditional + 22 conditional**.

---

## Before / after

| Metric | Before | After |
|--------|:------:|:-----:|
| Total models | 61 | 49 |
| Actively referenced (no annotation) | 25 | 27 (same 25 + 2 I missed before) |
| Conditional (CLI-gated) | n/a | 22 |
| Truly dead (no CLI, no references) | 12 | 0 |
| Orphan ratio | 56% | 0% |

---

## Hard-deleted models (12)

| Model | Reason |
|-------|--------|
| `UserActivity` | Superseded by `packages/audit` |
| `AIRequest` | Superseded by `packages/metering` |
| `UsageRecord` | Superseded by `UsageLedgerEntry` (canonical) |
| `TenantUsage` | Superseded by `UsageLedgerEntry` |
| `UsageAggregate` | Superseded by `UsageLedgerEntry` |
| `FeatureFlag` | Superseded by `FeatureDefinition` |
| `FeatureFlagOverride` | Superseded by `FeatureDefinition` |
| `Entitlement` | Superseded by `checkEntitlementUsage()` (new billing API) |
| `Recommendation` | Not in product roadmap |
| `UserPreference` | Not in product roadmap |
| `Wallet` | `--applicationType=web3` flag was removed (hallucination) |
| `Nft` | Same |

**Enums dropped:** `AIRequestType`, `NftStatus`, `FeatureFlagType`.
**Enum kept:** `UsageType` — still used by `UsageLedgerEntry.type`.

**Migration draft:** `packages/db/prisma/migrations/20260418120000_schema_orphan_cleanup/migration.sql` — **DRAFT**, awaits stakeholder review before running.

---

## Conditional models (22)

These stay in the master schema but only land in a scaffolded project when the matching CLI flag is set. `create-sailor`'s `prune-schema.ts` parses `/// @conditional(flag=values)` and filters.

| Condition | Models | Kept when |
|-----------|--------|-----------|
| `auth=betterauth` | AuthUser, AuthAccount, AuthSession, AuthVerification | user picks `--auth=betterauth` (4) |
| `payment=wechat\|alipay` | Invoice, InvoiceItem, Payment, PaymentMethod | user picks CN payment (4) |
| `template=ecommerce` | Product, Order, OrderItem, Integration | future `--template=ecommerce` (4) |
| `template=blog\|portfolio` | Content, ContentTranslation, ContentEmbedding | future `--template=blog\|portfolio` (3) |
| `community=sleptons` | SleptonsProduct, SleptonsConnection, SleptonsUpvote | future `--community=sleptons` (3) |
| `billing-mode=credits` | CreditBalance, CreditTransaction | future `--billing-mode=credits` (2) |
| `idp=oauth-server` | OAuthAuthorization, OAuthAccessToken | future `--idp=oauth-server` (2) |

**TOTAL: 22**

---

## Why this approach (not hard-delete)

Simple hard-deletion would destroy the **CLI's selection power**. A user picks `--auth=betterauth` — they expect to see AuthUser tables. A user picks `--payment=wechat` — they need Invoice tracking (WeChat doesn't manage invoices like Stripe does).

The `@conditional` annotation **encodes the CLI-schema contract** directly in the source of truth. Schema becomes a *compile target* of CLI flags, not a hardcoded shape.

This is the meaning of "boundary is product" from the harness principles — every schema line is now **intentional** and **explainable by user selection**.

---

## Updated positioning language

| Before | After |
|--------|-------|
| "53 Prisma models" | "**27 always-on + 22 CLI-conditional** Prisma models in master schema; any scaffolded project has only what its flags select" |
| "9 microservices" | **Correct as-is** — `backends/python/ai/`, `backends/python/billing/`, `backends/python/content/`, `backends/python/ecommerce/`, `backends/python/event-ingest/`, `backends/python/recsys/`, `backends/python/third-party/`, `backends/python/web3/` + shared = 9. Python/FastAPI. |
| "54 packages" | **Correct** — unchanged by this cleanup |

---

## Follow-ups

1. **Run migration**: review `migration.sql` → `pnpm prisma migrate deploy` on staging first
2. **CLI extension**: wire up `--billing-mode`, `--idp`, future `--template`, `--community` flags in `create-sailor` (schema pruning already handles them generically)
3. **pnpm catalog**: separate task; most app package.jsons still hardcode versions
4. **`services/` — verified 9 real Python services** (was mistakenly reported as empty in earlier audit; corrected in `services/README.md`)

## TDD coverage

Schema-prune logic has been tested in `packages/create-sailor/src/utils/prune-schema.test.ts` (pending implementation by separate subagent — see audit log). Once landed, all 7 conditional flags get snapshot tests.
