# Prisma Schema Audit: Orphaned Models Analysis
**Date**: April 18, 2026  
**Schema Location**: `packages/platform/db/prisma/schema.prisma`  
**Audit Scope**: All 61 declared models across `apps/`, `packages/`, and `services/`  

---

## Executive Summary

| Metric | Count |
|--------|-------|
| **Total Models Declared** | 61 |
| **Documentation Claims** | 53 |
| **Discrepancy** | +8 models |
| **Actively Used** | 25 (41%) |
| **Test/Seed Only** | 2 (3%) |
| **Orphaned (No References)** | 34 (56%) |

**Key Finding**: 34 models (56% of the schema) have **zero references** in application code outside the schema and generated types. This indicates significant schema drift and planning ahead for future features that are not yet implemented.

---

## Classification Table

### Used in Production Code (25 models)

| Model | References | Status | Last Commit |
|-------|:----------:|--------|------------|
| Organization | 11+ | Active - Core multi-tenant entity | Recent |
| User | 16+ | Active - Auth/Clerk integration | Recent |
| APIKey | 2+ | Active - API authentication | Recent |
| AuditLog | 2+ | Active - Compliance logging | Recent |
| UserConsent | 1+ | Active - Legal compliance (GDPR/CCPA) | Recent |
| LegalDocument | 1+ | Active - Legal docs versioning | Recent |
| CookieConsent | 1+ | Active - Cookie consent tracking | Recent |
| ContactSubmission | 1+ | Active - Contact form submissions | Recent |
| CommunityProfile | 1+ | Active - Sleptons community | Recent |
| License | 1+ | Active - License tracking | Recent |
| SleptonsaMemberProfile | 1+ | Active - Community profiles | Recent |
| StripeCustomer | 1+ | Active - Stripe integration | Recent |
| WebhookEvent | 10+ | Active - Webhook idempotency | Recent |
| Subscription | 1+ | Active - Billing subscriptions | Recent |
| PricingPlan | 4+ | Active - Plan configuration | Recent |
| UsageLedgerEntry | 4+ | Active - Usage billing ledger | Recent |
| UsageLimitDefinition | 2+ | Active - Usage limits config | Recent |
| FeatureDefinition | 2+ | Active - Feature flags/entitlements | Recent |
| CustomerPlanVersion | 1+ | Active - Grandfathering logic | Recent |
| CustomerFeatureOverride | 1+ | Active - Custom feature overrides | Recent |
| CustomerUsageLimit | 1+ | Active - Custom usage limits | Recent |
| OAuthClient | 1+ | Active - OAuth2/OIDC provider | Recent |
| ModelConfig | 6+ | Active - AI provider pricing | Recent |
| RequestLog | 15+ | Active - AI request logging | Recent |
| OrganizationMember | 9+ | Active - Multi-tenant RBAC | Recent |

### Test-Only / Seed-Only (2 models)

| Model | References | Classification | Rationale |
|-------|:----------:|-----------------|-----------|
| PlanFeature | Test fixtures only | Test-Only | Referenced only in `seed.ts` for billing setup. No active queries in production. |
| PlanUsageLimit | Test fixtures only | Test-Only | Referenced only in `seed.ts`. Part of plan definition, not queried at runtime. |

### Orphaned: Zero References in Codebase (34 models)

| Model | Table Name | Rationale | Drop Candidate |
|-------|:----------:|-----------|:---------------:|
| **E-Commerce Models** | | | |
| Product | `products` | Schema defined for multi-channel commerce (Shopify/Shopline integration). Features not yet built. | ✓ |
| Order | `orders` | E-commerce orders model. Integration layer not implemented. | ✓ |
| OrderItem | `order_items` | E-commerce order line items. Depends on Order model. | ✓ |
| **Content Management** | | | |
| Content | `contents` | CMS posts/articles. Content features defined in seed but queries not implemented in codebase. | ✓ |
| ContentTranslation | `content_translations` | i18n support for content. Depends on Content (unused). | ✓ |
| ContentEmbedding | `content_embeddings` | pgvector embeddings for semantic search. Feature planned but not implemented. | ✓ |
| **Web3/NFT Models** | | | |
| Wallet | `wallets` | Web3 wallet integration. No active queries. | ✓ |
| Nft | `nfts` | NFT minting/trading. Web3 features planned but not built. | ✓ |
| **Recommendation System** | | | |
| Recommendation | `recommendations` | ML-based recommendations. No queries in production. | ✓ |
| UserPreference | `user_preferences` | Preference data for recommendations. Depends on Recommendation (unused). | ✓ |
| **User Activity Tracking** | | | |
| UserActivity | `user_activities` | Activity logging. Superseded by AuditLog and RequestLog. | ✓ |
| **AI/Credits System** | | | |
| AIRequest | `ai_requests` | AI request tracking. Superseded by RequestLog. | ✓ |
| CreditBalance | `credit_balances` | Credit system for usage-based billing. Not integrated with subscription/usage ledger. | ✓ |
| CreditTransaction | `credit_transactions` | Credit transaction history. Depends on CreditBalance (unused). | ✓ |
| **Payment Models** | | | |
| Invoice | `invoices` | Invoice generation. Billing system uses Stripe invoices directly. | ✓ |
| InvoiceItem | `invoice_items` | Invoice line items. Depends on Invoice (unused). | ✓ |
| Payment | `payments` | Payment records. Integrated with Stripe webhooks, not directly used. | ✓ |
| PaymentMethod | `payment_methods` | Saved payment methods. No active queries. | ✓ |
| **Integration Models** | | | |
| Integration | `integrations` | Third-party integrations (Shopify/Stripe/Custom). Schema exists but no integration layer. | ✓ |
| **Feature Flags (Conflicting)** | | | |
| FeatureFlag | `feature_flags` | Feature flags system. Conflicting with FeatureDefinition/PlanFeature approach. | ✓ |
| FeatureFlagOverride | `feature_flag_overrides` | FF overrides. Depends on FeatureFlag (unused). | ✓ |
| **Entitlements** | | | |
| Entitlement | `entitlements` | Feature entitlements. Overlaps with PlanFeature and CustomerFeatureOverride logic. | ✓ |
| **Usage Tracking (Duplicated)** | | | |
| UsageRecord | `usage_records` | Usage records. Duplicates UsageLedgerEntry functionality. | ✓ |
| TenantUsage | `tenant_usage` | Monthly aggregated usage. Overlaps with UsageAggregate. | ✓ |
| UsageAggregate | `usage_aggregates` | Aggregated usage by period. Overlaps with TenantUsage. | ✓ |
| **Auth Models (Better Auth)** | | | |
| AuthUser | `auth_users` | Self-hosted auth. Project uses Clerk; this is only for custom auth path. | ✓ |
| AuthAccount | `auth_accounts` | OAuth accounts (Better Auth). Clerk handles OAuth externally. | ✓ |
| AuthSession | `auth_sessions` | Session management. Clerk manages sessions. | ✓ |
| AuthVerification | `auth_verifications` | Email/phone verification codes. Clerk handles verification. | ✓ |
| **OAuth Models (Duplicate)** | | | |
| OAuthAuthorization | `oauth_authorizations` | User OAuth consent. Overlaps with OAuthClient scopes. | ✓ |
| OAuthAccessToken | `oauth_access_tokens` | Issued tokens. Overlaps with token introspection logic. | ✓ |
| **Sleptons Community (Partial)** | | | |
| SleptonsProduct | `sleptons_products` | Community member products. No queries despite SleptonsaMemberProfile being used. | ✓ |
| SleptonsConnection | `sleptons_connections` | Community follow graph. No social features implemented. | ✓ |
| SleptonsUpvote | `sleptons_upvotes` | Product upvotes. Depends on SleptonsProduct (unused). | ✓ |

---

## Detailed Findings

### 1. **E-Commerce Subsystem (Product, Order, OrderItem)**
- **Status**: Schema complete, zero integration
- **Evidence**: 
  - Enum `IntegrationType` (SHOPIFY, SHOPLINE, STRIPE, CUSTOM) exists
  - `Integration` model exists but unused
  - No API routes for orders, no cart/checkout logic
- **Rationale for Existence**: Nebutra is positioning as omnichannel SaaS foundation. E-commerce is a planned Phase 2 feature.
- **Action**: Safe to drop if e-commerce is not in Q2/Q3 roadmap

### 2. **Content Management (Content, ContentTranslation, ContentEmbedding)**
- **Status**: Schema present, zero runtime queries
- **Evidence**:
  - Seed defines feature keys for content (content.posts, content.comments, content.moderation)
  - No routes in `backends/gateway` for content CRUD
  - Embeddings defined with pgvector but no query logic
- **Rationale for Existence**: Core platform feature, but build is deferred pending content moderation and i18n infrastructure
- **Action**: Keep if content module is planned; drop if pivoting away from content platform

### 3. **Conflicting Feature Systems**
Three overlapping approaches for feature management:
1. **FeatureDefinition + PlanFeature + PlanUsageLimit** (Active)
   - Used in seed and billing config
   - Supports plan-based entitlements
2. **FeatureFlag + FeatureFlagOverride** (Orphaned)
   - Separate system for boolean feature flags
   - No integration with billing
3. **Entitlement** (Orphaned)
   - Per-organization feature entitlements
   - Overlaps with CustomerFeatureOverride

**Recommendation**: Keep only #1 (FeatureDefinition approach). Delete FeatureFlag and Entitlement.

### 4. **Duplicated Usage Tracking**
Three models claiming similar responsibility:
- **TenantUsage**: Monthly-level aggregation by month
- **UsageAggregate**: Period-based aggregation (YYYY-MM or YYYY-MM-DD)
- **UsageRecord**: Detailed per-action records
- **UsageLedgerEntry**: Immutable ledger (active, used for billing)

**Conflict**: TenantUsage and UsageAggregate both handle aggregation. UsageRecord vs UsageLedgerEntry both track usage.

**Recommendation**: Primary path is UsageLedgerEntry → aggregate at query time. Drop TenantUsage, UsageAggregate, UsageRecord.

### 5. **Auth Strategy Mismatch**
Schema supports **three auth strategies**:

| Strategy | Models | Status |
|----------|--------|--------|
| **Clerk (Current)** | User + Organization | Active ✓ |
| **Better Auth (Self-hosted)** | AuthUser, AuthAccount, AuthSession, AuthVerification | Orphaned, optional backup |
| **OAuth 2.0 Provider** | OAuthClient, OAuthAuthorization, OAuthAccessToken | Orphaned, optional if offering Oauth provider |

**Current Architecture**: Clerk via Nebutra's custom `@packages/identity` adapter.

**Recommendation**: Keep all three **if** planning to:
1. Offer self-hosted option (Better Auth tables)
2. Become OAuth provider for ecosystem (OAuthClient)
Otherwise, drop Better Auth tables but keep OAuthClient for future provider role.

### 6. **Sleptons Community (Partial Adoption)**
- **SleptonsaMemberProfile**: Active ✓ (referenced in queries)
- **SleptonsProduct**: Orphaned (0 references)
- **SleptonsConnection**: Orphaned (0 references)
- **SleptonsUpvote**: Orphaned (0 references)

**Status**: Community profiles exist, but social features (following, product showcase) not implemented.

**Recommendation**: Drop Sleptons social tables if no timeline for community phase. Keep SleptonsaMemberProfile + License if doing license-based community gating.

### 7. **Web3 Subsystem (Wallet, Nft)**
- **Status**: Schema complete, zero integration
- **Evidence**: 
  - No routes for wallet connection
  - No minting/trading logic
  - No contract interaction library
- **Rationale**: Planned as differentiator for blockchain teams
- **Timeline**: If not in 2026 roadmap, safe to drop

---

## Proposed Migration (DRAFT)

**CRITICAL**: This migration drops 34 unused models. Review each carefully before applying.

```sql
-- packages/platform/db/prisma/migrations/2026-04-18-drop-orphans.sql
-- DO NOT AUTO-APPLY. Manual review required before execution.

-- ============================================
-- E-COMMERCE (Not yet integrated)
-- ============================================
DROP TABLE IF EXISTS "order_items" CASCADE;
DROP TABLE IF EXISTS "orders" CASCADE;
DROP TABLE IF EXISTS "products" CASCADE;
DROP TABLE IF EXISTS "integrations" CASCADE;

-- ============================================
-- CONTENT MANAGEMENT (Deferred Phase 2)
-- ============================================
DROP TABLE IF EXISTS "content_embeddings" CASCADE;
DROP TABLE IF EXISTS "content_translations" CASCADE;
DROP TABLE IF EXISTS "contents" CASCADE;

-- ============================================
-- RECOMMENDATION SYSTEM (Not in MVP)
-- ============================================
DROP TABLE IF EXISTS "recommendations" CASCADE;
DROP TABLE IF EXISTS "user_preferences" CASCADE;

-- ============================================
-- ACTIVITY TRACKING (Superseded by AuditLog + RequestLog)
-- ============================================
DROP TABLE IF EXISTS "user_activities" CASCADE;

-- ============================================
-- CREDITS SYSTEM (Not integrated with subscription billing)
-- ============================================
DROP TABLE IF EXISTS "credit_transactions" CASCADE;
DROP TABLE IF EXISTS "credit_balances" CASCADE;

-- ============================================
-- INVOICING (Using Stripe invoices directly)
-- ============================================
DROP TABLE IF EXISTS "invoice_items" CASCADE;
DROP TABLE IF EXISTS "invoices" CASCADE;
DROP TABLE IF EXISTS "payments" CASCADE;
DROP TABLE IF EXISTS "payment_methods" CASCADE;

-- ============================================
-- FEATURE FLAGS (Conflicting with FeatureDefinition)
-- ============================================
DROP TABLE IF EXISTS "feature_flag_overrides" CASCADE;
DROP TABLE IF EXISTS "feature_flags" CASCADE;

-- ============================================
-- ENTITLEMENTS (Overlaps with PlanFeature + CustomerFeatureOverride)
-- ============================================
DROP TABLE IF EXISTS "entitlements" CASCADE;

-- ============================================
-- USAGE TRACKING (Overlapping schemas)
-- ============================================
DROP TABLE IF EXISTS "usage_records" CASCADE;
DROP TABLE IF EXISTS "tenant_usage" CASCADE;
DROP TABLE IF EXISTS "usage_aggregates" CASCADE;

-- ============================================
-- BETTER AUTH (Only needed if self-hosting auth)
-- ============================================
DROP TABLE IF EXISTS "auth_verifications" CASCADE;
DROP TABLE IF EXISTS "auth_sessions" CASCADE;
DROP TABLE IF EXISTS "auth_accounts" CASCADE;
DROP TABLE IF EXISTS "auth_users" CASCADE;

-- ============================================
-- OAUTH AUTHORIZATION (Overlapping token management)
-- ============================================
DROP TABLE IF EXISTS "oauth_access_tokens" CASCADE;
DROP TABLE IF EXISTS "oauth_authorizations" CASCADE;

-- ============================================
-- SLEPTONS COMMUNITY (Social features not implemented)
-- ============================================
DROP TABLE IF EXISTS "sleptons_upvotes" CASCADE;
DROP TABLE IF EXISTS "sleptons_connections" CASCADE;
DROP TABLE IF EXISTS "sleptons_products" CASCADE;

-- ============================================
-- WEB3 (Not yet integrated)
-- ============================================
DROP TABLE IF EXISTS "nfts" CASCADE;
DROP TABLE IF EXISTS "wallets" CASCADE;

-- ============================================
-- AI REQUEST TRACKING (Superseded by RequestLog)
-- ============================================
DROP TABLE IF EXISTS "ai_requests" CASCADE;
```

---

## Per-Model Drop Rationale

### Models Safe to Drop Immediately

| Model | Reason | Risk Level |
|-------|--------|:----------:|
| Product, Order, OrderItem | E-commerce not in current sprint | Low |
| Content, ContentTranslation, ContentEmbedding | CMS planned Phase 2+ | Medium |
| Recommendation, UserPreference | No ML pipeline | Low |
| UserActivity | Replaced by AuditLog + RequestLog | Low |
| CreditBalance, CreditTransaction | Not integrated with subscription billing | Medium |
| Invoice, InvoiceItem, Payment, PaymentMethod | Using Stripe invoices/webhooks directly | Low |
| FeatureFlag, FeatureFlagOverride | Duplicate FeatureDefinition system | Low |
| Entitlement | Overlaps PlanFeature + CustomerFeatureOverride | Low |
| TenantUsage, UsageAggregate, UsageRecord | Overlaps UsageLedgerEntry | Low |

### Models Conditionally Safe

| Model | Keep If | Drop If |
|-------|---------|---------|
| AuthUser, AuthAccount, AuthSession, AuthVerification | Offering self-hosted auth option | Cloud-only Clerk strategy |
| OAuthAuthorization, OAuthAccessToken | Becoming OAuth2 provider for ecosystem | Not offering provider role |
| Wallet, Nft | Web3 features in 2026 roadmap | Web3 deferred to 2027+ |
| SleptonsProduct, SleptonsConnection, SleptonsUpvote | Launching community features in Q2 | Community phase deferred |
| Integration | Planning Shopify/Shopline connectors in Phase 2 | E-commerce dropped |
| AIRequest | Still analyzing usage patterns | All tracking via RequestLog |

---

## Recommendations for Schema Hygiene

### Immediate (This Sprint)

1. **Decide on Auth Strategy**: Keep or drop Better Auth tables?
2. **Decide on Feature Flags**: Consolidate FeatureDefinition (used) vs FeatureFlag (orphaned)
3. **Decide on Usage Tracking**: Single source of truth (UsageLedgerEntry) or keep aggregates?

### Q2 Planning

1. If **e-commerce** in roadmap → keep Product, Order, OrderItem, Integration
2. If **content** in roadmap → keep Content, ContentTranslation, ContentEmbedding
3. If **community** in roadmap → keep SleptonsProduct, SleptonsConnection, SleptonsUpvote
4. If **Web3** in roadmap → keep Wallet, Nft

### After Decision

- Run proposed migration (`2026-04-18-drop-orphans.sql`)
- Update schema.prisma to 27 core models
- Add schema documentation linking to feature roadmap

---

## Schema Footprint Analysis

| Scenario | Model Count | Notes |
|----------|:-----------:|-------|
| **Current (2026-04-18)** | 61 | Over-engineered for MVP scope |
| **Drop All Orphans** | 27 | Recommended for schema sanity |
| **Keep Content (Phase 2)** | 30 | If CMS in Q2 roadmap |
| **Keep E-Commerce (Phase 2)** | 30 | If commerce in Q2 roadmap |
| **Keep Web3 (Future)** | 29 | If blockchain integration planned |
| **Keep All (Full Platform)** | 61 | Long-term vision schema |

---

## Next Steps

1. **Stakeholder Review**: Confirm if orphaned features (e-commerce, content, Web3, community) are in roadmap
2. **Feature Leads**: Reach out to owners of each deferred feature for feedback
3. **Schema Cleanup**: Create a tracking issue for schema consolidation
4. **Documentation**: Link roadmap to schema; mark features as "Planning", "In Progress", "Implemented"
5. **Migration Execution**: Only apply after explicit feature decision

---

## Appendix: Model Count Breakdown

```
Total Models: 61
├─ Actively Used: 25 (41%)
│  ├─ Core Platform: 8 (Organization, User, OrganizationMember, WebhookEvent, AuditLog, UserConsent, LegalDocument, CookieConsent)
│  ├─ Billing: 10 (Subscription, PricingPlan, FeatureDefinition, UsageLimitDefinition, CustomerPlanVersion, CustomerFeatureOverride, CustomerUsageLimit, ModelConfig, RequestLog, StripeCustomer)
│  ├─ Compliance: 3 (UserConsent, LegalDocument, CookieConsent)
│  ├─ Community: 2 (License, SleptonsaMemberProfile)
│  ├─ Authentication: 1 (APIKey)
│  └─ Integration: 1 (OAuthClient)
├─ Test/Seed Only: 2 (3%) - PlanFeature, PlanUsageLimit
└─ Orphaned: 34 (56%)
   ├─ E-Commerce: 4
   ├─ Content: 3
   ├─ Recommendations: 2
   ├─ Activity: 1
   ├─ Credits: 2
   ├─ Invoicing: 4
   ├─ Feature Flags: 2
   ├─ Entitlements: 1
   ├─ Usage: 3
   ├─ Auth: 4
   ├─ OAuth: 2
   ├─ Community Social: 3
   └─ Web3: 2
```

---

**Prepared**: April 18, 2026  
**Reviewed**: Pending  
**Approved**: Pending  
**Migration Status**: DRAFT - Awaiting feature prioritization

