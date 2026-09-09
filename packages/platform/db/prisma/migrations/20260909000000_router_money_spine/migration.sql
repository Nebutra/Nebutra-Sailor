-- Router money spine (Batch A).
--
-- Two additions, no new table. The per-request log stays `ai_request_logs`
-- (see decisions.md A2) and the wallet stays `credit_balances` — neither is
-- touched here.
--
-- 1. `api_keys` gains reversible disable plus the per-key spend counters the
--    /v1 edge needs to answer "may this key spend another cent". Daily counters
--    reset lazily on read/write when `cost_daily_reset_at` predates the current
--    UTC day; there is no cron. UTC is the ledger's timezone.
-- 2. `model_configs` becomes the one price service. `published` is the shelf
--    gate: a model with no resolvable price is never sellable.

ALTER TABLE "public"."api_keys"
  ADD COLUMN "disabled_at" TIMESTAMP(3),
  ADD COLUMN "save_logs" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "limit_total" DECIMAL(10,4),
  ADD COLUMN "limit_daily" DECIMAL(10,4),
  ADD COLUMN "cost_total" DECIMAL(12,6) NOT NULL DEFAULT 0,
  ADD COLUMN "cost_daily" DECIMAL(12,6) NOT NULL DEFAULT 0,
  ADD COLUMN "cost_daily_reset_at" TIMESTAMP(3);

CREATE INDEX "api_keys_tenant_id_disabled_at_idx" ON "public"."api_keys"("tenant_id", "disabled_at");

CREATE TYPE "public"."PriceUnit" AS ENUM (
  'PER_1M_TOKENS',
  'PER_CALL',
  'PER_SECOND',
  'PER_IMAGE',
  'PER_1M_CHARS',
  'PER_MINUTE',
  'PER_PAGE',
  'FREE',
  'PASS_THROUGH'
);

ALTER TABLE "public"."model_configs"
  ADD COLUMN "unit" "public"."PriceUnit" NOT NULL DEFAULT 'PER_1M_TOKENS',
  ADD COLUMN "unit_price" DECIMAL(12,6),
  ADD COLUMN "cache_read_per_million" DECIMAL(10,6),
  ADD COLUMN "cache_write_per_million" DECIMAL(10,6),
  ADD COLUMN "context_length" INTEGER,
  ADD COLUMN "published" BOOLEAN NOT NULL DEFAULT false;

CREATE INDEX "model_configs_published_idx" ON "public"."model_configs"("published");
