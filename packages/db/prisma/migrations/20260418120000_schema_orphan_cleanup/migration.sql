-- Schema orphan cleanup (2026-04-18)
-- DRAFT migration — review carefully before applying.
--
-- Removes 12 orphan models that were never referenced in application code:
--   - UserActivity       (superseded by @nebutra/audit)
--   - AIRequest          (superseded by @nebutra/metering)
--   - UsageRecord        (superseded by UsageLedgerEntry)
--   - TenantUsage        (superseded by UsageLedgerEntry)
--   - UsageAggregate     (superseded by UsageLedgerEntry)
--   - FeatureFlag        (superseded by FeatureDefinition)
--   - FeatureFlagOverride (superseded by FeatureDefinition)
--   - Entitlement        (superseded by checkEntitlementUsage)
--   - Recommendation     (not in roadmap)
--   - UserPreference     (not in roadmap)
--   - Wallet             (applicationType=web3 flag was removed)
--   - Nft                (applicationType=web3 flag was removed)
--
-- Also drops 3 related enums that no longer have referencing models:
--   - AIRequestType
--   - NftStatus
--   - FeatureFlagType
-- (UsageType is kept — still referenced by UsageLedgerEntry.type)
--
-- PRESERVES 22 "conditional" models that are kept in schema but annotated with
-- /// @conditional(flag=values). These stay in the master schema; create-sailor's
-- prune step trims them out when the user's CLI flags don't match.

-- Drop tables (in dependency order — children first)
DROP TABLE IF EXISTS "feature_flag_overrides" CASCADE;
DROP TABLE IF EXISTS "feature_flags" CASCADE;
DROP TABLE IF EXISTS "usage_aggregates" CASCADE;
DROP TABLE IF EXISTS "tenant_usages" CASCADE;
DROP TABLE IF EXISTS "usage_records" CASCADE;
DROP TABLE IF EXISTS "entitlements" CASCADE;
DROP TABLE IF EXISTS "recommendations" CASCADE;
DROP TABLE IF EXISTS "user_preferences" CASCADE;
DROP TABLE IF EXISTS "user_activities" CASCADE;
DROP TABLE IF EXISTS "ai_requests" CASCADE;
DROP TABLE IF EXISTS "nfts" CASCADE;
DROP TABLE IF EXISTS "wallets" CASCADE;

-- Drop enums
DROP TYPE IF EXISTS "AIRequestType";
DROP TYPE IF EXISTS "NftStatus";
DROP TYPE IF EXISTS "FeatureFlagType";

-- Note: UsageType enum preserved — still used by UsageLedgerEntry.type
