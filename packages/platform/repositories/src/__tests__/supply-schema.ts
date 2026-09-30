/**
 * The slice of the schema `RouterSupplyRepository` touches, as DDL — see
 * `router-schema.ts` for why this is hand-transcribed rather than the full
 * `schema.prisma`.
 */

export const SUPPLY_ENUMS = `
  CREATE TYPE "SupplySourceKind" AS ENUM ('OPENAI_COMPATIBLE','NEWAPI_CHANNEL','CLIPROXYAPI','FAL_AI');
  CREATE TYPE "SupplyProtocol" AS ENUM ('OPENAI_COMPATIBLE','NEWAPI_ADMIN','CLIPROXY_MANAGEMENT','FAL_REST','UNKNOWN');
  CREATE TYPE "SupplyModality" AS ENUM ('TEXT','IMAGE','EMBEDDING','AUDIO','VIDEO','OTHER');
  CREATE TYPE "SupplyModelState" AS ENUM ('PENDING','AVAILABLE','DEGRADED','SUSPENDED');
  CREATE TYPE "SupplyProbeKind" AS ENUM ('DISCOVERY','ACTIVE_PROBE','PASSIVE_SIGNAL','STATE_TRANSITION','MANUAL_OVERRIDE');
  CREATE TYPE "SupplyProbeOutcome" AS ENUM ('SUCCESS','FAILURE','ERROR');
  CREATE TYPE "SupplyVisibility" AS ENUM ('PUBLIC','INTERNAL');
`;

export const SUPPLY_TABLES = `
  CREATE TABLE supply_sources (
    id                      text PRIMARY KEY,
    key                     varchar(64) NOT NULL UNIQUE,
    kind                    "SupplySourceKind" NOT NULL,
    protocol                "SupplyProtocol" NOT NULL DEFAULT 'UNKNOWN',
    label                   text NOT NULL,
    base_url                text NOT NULL,
    credential_ref          text,
    enabled                 boolean NOT NULL DEFAULT true,
    visibility              "SupplyVisibility" NOT NULL DEFAULT 'PUBLIC',
    last_discovered_at      timestamp(3),
    last_discovery_summary  jsonb,
    created_at              timestamp(3) NOT NULL DEFAULT now(),
    updated_at              timestamp(3) NOT NULL DEFAULT now()
  );

  CREATE TABLE supply_source_models (
    id                      text PRIMARY KEY,
    source_id               text NOT NULL REFERENCES supply_sources(id) ON DELETE CASCADE,
    upstream_model          varchar(160) NOT NULL,
    modality                "SupplyModality" NOT NULL DEFAULT 'TEXT',
    capabilities            jsonb,
    upstream_price          jsonb,
    public_model            text,
    state                   "SupplyModelState" NOT NULL DEFAULT 'PENDING',
    state_reason            text,
    consecutive_failures    integer NOT NULL DEFAULT 0,
    consecutive_successes   integer NOT NULL DEFAULT 0,
    last_probe_at           timestamp(3),
    last_success_at         timestamp(3),
    last_failure_at         timestamp(3),
    next_probe_at           timestamp(3),
    backoff_seconds         integer NOT NULL DEFAULT 0,
    pinned                  boolean NOT NULL DEFAULT false,
    banned                  boolean NOT NULL DEFAULT false,
    discovered_at           timestamp(3) NOT NULL DEFAULT now(),
    vanished_at             timestamp(3),
    created_at              timestamp(3) NOT NULL DEFAULT now(),
    updated_at              timestamp(3) NOT NULL DEFAULT now(),
    UNIQUE (source_id, upstream_model)
  );

  CREATE TABLE supply_probe_events (
    id               text PRIMARY KEY,
    source_model_id  text NOT NULL REFERENCES supply_source_models(id) ON DELETE CASCADE,
    at               timestamp(3) NOT NULL DEFAULT now(),
    kind             "SupplyProbeKind" NOT NULL,
    outcome          "SupplyProbeOutcome" NOT NULL,
    reason           text,
    from_state       "SupplyModelState",
    to_state         "SupplyModelState",
    latency_ms       integer,
    metadata         jsonb
  );
`;

export const SUPPLY_DDL = `${SUPPLY_ENUMS}\n${SUPPLY_TABLES}`;
