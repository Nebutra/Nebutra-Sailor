/**
 * The slice of the schema the Router's repositories touch, as DDL.
 *
 * Deliberately not the whole `schema.prisma`: applying all of it would make
 * every repository test a schema test and would tie these assertions to tables
 * they never read. What is here is transcribed from the Prisma models the
 * Router money spine and console actually use, including the constraints the
 * behaviour depends on — the unique `(tenant_id, idempotency_key)` that makes a
 * replayed settle a no-op, and the unique `tenant_id` on `credit_balances`.
 */

export const ROUTER_ENUMS = `
  CREATE TYPE "CreditTransactionType" AS ENUM
    ('PURCHASE','USAGE','REFUND','ADJUSTMENT','EXPIRATION','BONUS');
  CREATE TYPE "UsageType" AS ENUM
    ('API_CALL','AI_TOKEN','STORAGE','COMPUTE','BANDWIDTH','CUSTOM');
  CREATE TYPE "UsageLedgerSource" AS ENUM
    ('API','WORKFLOW','WEBHOOK','SYSTEM','BACKFILL');
  CREATE TYPE "AIProvider" AS ENUM
    ('OPENAI','ANTHROPIC','GOOGLE','SILICONFLOW','CUSTOM');
  CREATE TYPE "PriceUnit" AS ENUM
    ('PER_1M_TOKENS','PER_CALL','PER_SECOND','PER_IMAGE','PER_1M_CHARS',
     'PER_MINUTE','PER_PAGE','FREE','PASS_THROUGH');
`;

export const ROUTER_TABLES = `
  CREATE TABLE credit_balances (
    id         text PRIMARY KEY,
    tenant_id  text NOT NULL UNIQUE,
    balance    numeric(10,4) NOT NULL DEFAULT 0,
    currency   varchar(3) NOT NULL DEFAULT 'USD',
    updated_at timestamp(3) NOT NULL DEFAULT now()
  );

  CREATE TABLE credit_transactions (
    id                text PRIMARY KEY,
    credit_balance_id text NOT NULL,
    type              "CreditTransactionType" NOT NULL,
    amount            numeric(10,4) NOT NULL,
    balance_after     numeric(10,4) NOT NULL,
    description       text,
    expires_at        timestamp(3),
    related_id        text,
    metadata          jsonb NOT NULL DEFAULT '{}',
    created_at        timestamp(3) NOT NULL DEFAULT now(),
    CONSTRAINT credit_transactions_credit_balance_id_type_related_id_key
      UNIQUE (credit_balance_id, type, related_id)
  );

  CREATE TABLE usage_ledger_entries (
    id              text PRIMARY KEY,
    tenant_id       text NOT NULL,
    subscription_id text,
    user_id         text,
    idempotency_key varchar(191) NOT NULL,
    event_id        varchar(191),
    source          "UsageLedgerSource" NOT NULL DEFAULT 'API',
    type            "UsageType" NOT NULL,
    resource        varchar(100),
    quantity        bigint NOT NULL,
    unit            varchar(32) NOT NULL DEFAULT 'unit',
    unit_cost       numeric(10,8),
    total_cost      numeric(10,6),
    currency        varchar(3) NOT NULL DEFAULT 'USD',
    occurred_at     timestamp(3) NOT NULL,
    recorded_at     timestamp(3) NOT NULL DEFAULT now(),
    ingest_version  varchar(16) NOT NULL DEFAULT 'v1',
    metadata        jsonb NOT NULL DEFAULT '{}',
    UNIQUE (tenant_id, idempotency_key)
  );

  CREATE TABLE router_reservations (
    id         text PRIMARY KEY,
    tenant_id  text NOT NULL,
    api_key_id text,
    amount     numeric(12,6) NOT NULL,
    created_at timestamp(3) NOT NULL DEFAULT now(),
    expires_at timestamp(3) NOT NULL
  );

  CREATE TABLE api_keys (
    id                  text PRIMARY KEY,
    name                varchar(64) NOT NULL,
    key_hash            text NOT NULL UNIQUE,
    key_prefix          varchar(16) NOT NULL,
    tenant_id           text NOT NULL,
    created_by_id       text,
    last_used_at        timestamp(3),
    revoked_at          timestamp(3),
    created_at          timestamp(3) NOT NULL DEFAULT now(),
    updated_at          timestamp(3) NOT NULL DEFAULT now(),
    scopes              text[] NOT NULL DEFAULT '{}',
    rate_limit_rps      integer NOT NULL DEFAULT 10,
    expires_at          timestamp(3),
    disabled_at         timestamp(3),
    save_logs           boolean NOT NULL DEFAULT false,
    limit_total         numeric(10,4),
    limit_daily         numeric(10,4),
    cost_total          numeric(12,6) NOT NULL DEFAULT 0,
    cost_daily          numeric(12,6) NOT NULL DEFAULT 0,
    cost_daily_reset_at timestamp(3)
  );

  CREATE TABLE model_configs (
    id                       text PRIMARY KEY,
    model_name               varchar(128) NOT NULL UNIQUE,
    provider                 "AIProvider" NOT NULL,
    input_price_per_million  numeric(10,6) NOT NULL,
    output_price_per_million numeric(10,6) NOT NULL,
    currency                 varchar(3) NOT NULL DEFAULT 'USD',
    is_active                boolean NOT NULL DEFAULT true,
    created_at               timestamp(3) NOT NULL DEFAULT now(),
    updated_at               timestamp(3) NOT NULL DEFAULT now(),
    unit                     "PriceUnit" NOT NULL DEFAULT 'PER_1M_TOKENS',
    unit_price               numeric(12,6),
    cache_read_per_million   numeric(10,6),
    cache_write_per_million  numeric(10,6),
    context_length           integer,
    published                boolean NOT NULL DEFAULT false
  );

  CREATE TABLE ai_request_logs (
    id                   text PRIMARY KEY,
    request_id           text NOT NULL UNIQUE,
    api_key_id           text,
    tenant_id            text NOT NULL,
    model                varchar(128) NOT NULL,
    prompt_tokens        integer NOT NULL DEFAULT 0,
    completion_tokens    integer NOT NULL DEFAULT 0,
    total_tokens         integer NOT NULL DEFAULT 0,
    cost                 numeric(10,6),
    latency_ms           integer,
    status               varchar(16) NOT NULL,
    error_message        text,
    created_at           timestamp(3) NOT NULL DEFAULT now(),
    path                 varchar(120),
    http_status          integer,
    ttfb_ms              integer,
    cached_prompt_tokens integer NOT NULL DEFAULT 0,
    cache_write_tokens   integer NOT NULL DEFAULT 0,
    supply_path          varchar(64),
    client_ip            varchar(64),
    expires_at           timestamp(3)
  );
`;

export const ROUTER_DDL = `${ROUTER_ENUMS}\n${ROUTER_TABLES}`;
