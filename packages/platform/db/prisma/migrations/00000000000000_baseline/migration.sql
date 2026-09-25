-- Baseline (ADR 2026-09-25 database convergence).
--
-- Replaces 42 incremental migrations that could not build a database from
-- empty: the tables before 2026-03 came from `db push` and no file ever
-- created them. This file is `prisma migrate diff --from-empty` of
-- schema.prisma, plus the two things Prisma cannot express that are data, not
-- structure. Row-level security, SQL functions and role settings are not here:
-- `pnpm db:deploy` re-applies them on every deploy from prisma/platform.sql and
-- the generated prisma/generated/rls.sql, so they can never drift.
--
-- An existing database adopts this with `prisma migrate resolve --applied`,
-- never by running it — see packages/platform/db/README.md.

-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "better_auth";

-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateExtension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- CreateExtension
CREATE EXTENSION IF NOT EXISTS "vector";

-- CreateEnum
CREATE TYPE "Plan" AS ENUM ('FREE', 'PRO', 'ENTERPRISE');

-- CreateEnum
CREATE TYPE "Role" AS ENUM ('OWNER', 'ADMIN', 'MEMBER', 'VIEWER');

-- CreateEnum
CREATE TYPE "ContentStatus" AS ENUM ('DRAFT', 'PUBLISHED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "OrderStatus" AS ENUM ('PENDING', 'PAID', 'SHIPPED', 'DELIVERED', 'CANCELLED', 'REFUNDED');

-- CreateEnum
CREATE TYPE "IntegrationType" AS ENUM ('SHOPIFY', 'SHOPLINE', 'STRIPE', 'CUSTOM');

-- CreateEnum
CREATE TYPE "SleptonsTier" AS ENUM ('V0', 'V1', 'V2', 'V_INFINITY');

-- CreateEnum
CREATE TYPE "ProductStage" AS ENUM ('IDEA', 'BUILDING', 'LAUNCHED', 'SCALING');

-- CreateEnum
CREATE TYPE "AccessInviteScope" AS ENUM ('PLATFORM', 'TENANT');

-- CreateEnum
CREATE TYPE "AccessInviteStatus" AS ENUM ('ACTIVE', 'REDEEMED', 'REVOKED', 'EXPIRED');

-- CreateEnum
CREATE TYPE "TaskStatus" AS ENUM ('QUEUED', 'RUNNING', 'SUCCEEDED', 'FAILED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "TaskPriority" AS ENUM ('LOW', 'NORMAL', 'HIGH');

-- CreateEnum
CREATE TYPE "UploadStatus" AS ENUM ('PENDING', 'COMPLETED', 'FAILED');

-- CreateEnum
CREATE TYPE "TenantKind" AS ENUM ('ORGANIZATION', 'INDIVIDUAL');

-- CreateEnum
CREATE TYPE "TenantLifecycleState" AS ENUM ('personal_draft', 'personal_paid', 'workspace_ready', 'organization_owned');

-- CreateEnum
CREATE TYPE "TenantTransferKind" AS ENUM ('company_context', 'startup_project', 'license');

-- CreateEnum
CREATE TYPE "TenantTransferStatus" AS ENUM ('pending', 'applied', 'failed');

-- CreateEnum
CREATE TYPE "AutomationStatus" AS ENUM ('ACTIVE', 'PAUSED', 'DISABLED');

-- CreateEnum
CREATE TYPE "AutomationScheduleKind" AS ENUM ('CRON', 'RRULE');

-- CreateEnum
CREATE TYPE "AutomationRunStatus" AS ENUM ('RUNNING', 'SUCCEEDED', 'FAILED', 'BLOCKED', 'PARTIAL');

-- CreateEnum
CREATE TYPE "ReasoningEffort" AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'XHIGH');

-- CreateEnum
CREATE TYPE "WorkflowStatus" AS ENUM ('ACTIVE', 'DISABLED');

-- CreateEnum
CREATE TYPE "WorkflowRunStatus" AS ENUM ('QUEUED', 'RUNNING', 'SUCCEEDED', 'FAILED');

-- CreateEnum
CREATE TYPE "ParaAssetType" AS ENUM ('IMAGE', 'VIDEO', 'AUDIO');

-- CreateEnum
CREATE TYPE "ParaAssetOrigin" AS ENUM ('UPLOAD', 'GENERATED');

-- CreateEnum
CREATE TYPE "ParaAssetScope" AS ENUM ('ACCOUNT', 'TEAM');

-- CreateEnum
CREATE TYPE "ParaAutonomy" AS ENUM ('ASK', 'ACT');

-- CreateEnum
CREATE TYPE "ParaRunStatus" AS ENUM ('QUEUED', 'RUNNING', 'AWAITING_APPROVAL', 'COMPLETED', 'FAILED');

-- CreateEnum
CREATE TYPE "ParaApprovalStatus" AS ENUM ('PENDING', 'APPROVED', 'DENIED');

-- CreateEnum
CREATE TYPE "AIProvider" AS ENUM ('OPENAI', 'ANTHROPIC', 'GOOGLE', 'SILICONFLOW', 'CUSTOM');

-- CreateEnum
CREATE TYPE "PriceUnit" AS ENUM ('PER_1M_TOKENS', 'PER_CALL', 'PER_SECOND', 'PER_IMAGE', 'PER_1M_CHARS', 'PER_MINUTE', 'PER_PAGE', 'FREE', 'PASS_THROUGH');

-- CreateEnum
CREATE TYPE "SubscriptionStatus" AS ENUM ('ACTIVE', 'PAST_DUE', 'CANCELED', 'UNPAID', 'TRIALING', 'PAUSED', 'INCOMPLETE');

-- CreateEnum
CREATE TYPE "BillingInterval" AS ENUM ('MONTHLY', 'YEARLY', 'WEEKLY', 'ONE_TIME');

-- CreateEnum
CREATE TYPE "InvoiceStatus" AS ENUM ('DRAFT', 'OPEN', 'PAID', 'VOID', 'UNCOLLECTIBLE');

-- CreateEnum
CREATE TYPE "PaymentMethodType" AS ENUM ('CARD', 'BANK_TRANSFER', 'ALIPAY', 'WECHAT_PAY', 'CRYPTO');

-- CreateEnum
CREATE TYPE "CreditTransactionType" AS ENUM ('PURCHASE', 'USAGE', 'REFUND', 'ADJUSTMENT', 'EXPIRATION', 'BONUS');

-- CreateEnum
CREATE TYPE "UsageType" AS ENUM ('API_CALL', 'AI_TOKEN', 'STORAGE', 'COMPUTE', 'BANDWIDTH', 'CUSTOM');

-- CreateEnum
CREATE TYPE "UsageLedgerSource" AS ENUM ('API', 'WORKFLOW', 'WEBHOOK', 'SYSTEM', 'BACKFILL');

-- CreateEnum
CREATE TYPE "ConsentType" AS ENUM ('EXPLICIT', 'IMPLICIT', 'OPT_IN', 'OPT_OUT');

-- CreateEnum
CREATE TYPE "LegalDocumentType" AS ENUM ('PRIVACY_POLICY', 'TERMS_OF_SERVICE', 'COOKIE_POLICY', 'REFUND_POLICY', 'ACCEPTABLE_USE', 'DATA_PROCESSING', 'SLA', 'CUSTOM');

-- CreateEnum
CREATE TYPE "OAuthClientType" AS ENUM ('CONFIDENTIAL', 'PUBLIC');

-- CreateEnum
CREATE TYPE "OAuthClientStatus" AS ENUM ('ACTIVE', 'SUSPENDED', 'REVOKED');

-- CreateEnum
CREATE TYPE "CofounderInterestKind" AS ENUM ('PASS', 'INTERESTED', 'PITCH');

-- CreateEnum
CREATE TYPE "LicenseTier" AS ENUM ('INDIVIDUAL', 'OPC', 'STARTUP', 'ENTERPRISE');

-- CreateEnum
CREATE TYPE "LicenseType" AS ENUM ('FREE', 'COMMERCIAL');

-- CreateEnum
CREATE TYPE "ResumeLang" AS ENUM ('ZH', 'EN', 'MIX');

-- CreateEnum
CREATE TYPE "PebbleDiagnosticStatus" AS ENUM ('PENDING_UPLOAD', 'STORED', 'DELETED');

-- CreateEnum
CREATE TYPE "PebbleFeedbackKind" AS ENUM ('FEEDBACK', 'CRASH');

-- CreateEnum
CREATE TYPE "PlatformStaffRole" AS ENUM ('PLATFORM_OWNER', 'PLATFORM_OPERATOR', 'PLATFORM_SUPPORT', 'PLATFORM_READONLY');

-- CreateTable
CREATE TABLE "organizations" (
    "id" TEXT NOT NULL,
    "clerk_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "plan" "Plan" NOT NULL DEFAULT 'FREE',
    "logo" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "organizations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tenants" (
    "id" TEXT NOT NULL,
    "kind" "TenantKind" NOT NULL,
    "lifecycle_state" "TenantLifecycleState" NOT NULL DEFAULT 'personal_draft',
    "organization_id" TEXT,
    "user_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "tenants_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tenant_transfer_journals" (
    "id" TEXT NOT NULL,
    "from_tenant_id" TEXT NOT NULL,
    "to_tenant_id" TEXT,
    "to_organization_id" TEXT NOT NULL,
    "kind" "TenantTransferKind" NOT NULL,
    "subject_id" TEXT,
    "status" "TenantTransferStatus" NOT NULL DEFAULT 'pending',
    "initiated_by_user_id" TEXT NOT NULL,
    "cofounder_profile_id" TEXT,
    "error" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "applied_at" TIMESTAMP(3),

    CONSTRAINT "tenant_transfer_journals_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "api_keys" (
    "id" TEXT NOT NULL,
    "name" VARCHAR(64) NOT NULL,
    "key_hash" TEXT NOT NULL,
    "key_prefix" VARCHAR(16) NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "created_by_id" TEXT,
    "last_used_at" TIMESTAMP(3),
    "revoked_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "scopes" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "rate_limit_rps" INTEGER NOT NULL DEFAULT 10,
    "expires_at" TIMESTAMP(3),
    "disabled_at" TIMESTAMP(3),
    "save_logs" BOOLEAN NOT NULL DEFAULT false,
    "limit_total" DECIMAL(10,4),
    "limit_daily" DECIMAL(10,4),
    "cost_total" DECIMAL(12,6) NOT NULL DEFAULT 0,
    "cost_daily" DECIMAL(12,6) NOT NULL DEFAULT 0,
    "cost_daily_reset_at" TIMESTAMP(3),

    CONSTRAINT "api_keys_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "clerk_id" TEXT,
    "email" TEXT,
    "name" TEXT,
    "avatar_url" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "organization_members" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "role" "Role" NOT NULL DEFAULT 'MEMBER',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "organization_members_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "organization_invitations" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'member',
    "status" TEXT NOT NULL DEFAULT 'pending',
    "inviter_id" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "accepted_at" TIMESTAMP(3),
    "declined_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "organization_invitations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notifications" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL DEFAULT '',
    "type" VARCHAR(120) NOT NULL,
    "title" VARCHAR(200) NOT NULL,
    "body" TEXT NOT NULL,
    "data" JSONB NOT NULL DEFAULT '{}',
    "read" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "notifications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notification_preferences" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL DEFAULT '',
    "channel" VARCHAR(20) NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "disabled_categories" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "frequency" VARCHAR(20) NOT NULL DEFAULT 'immediate',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "notification_preferences_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "contents" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "author_id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "slug" TEXT,
    "body" TEXT NOT NULL,
    "status" "ContentStatus" NOT NULL DEFAULT 'DRAFT',
    "published_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "contents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "content_translations" (
    "id" TEXT NOT NULL,
    "content_id" TEXT NOT NULL,
    "locale" VARCHAR(10) NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "content_translations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "content_embeddings" (
    "id" TEXT NOT NULL,
    "content_id" TEXT NOT NULL,
    "embedding" vector(1536) NOT NULL,
    "model" TEXT NOT NULL DEFAULT 'text-embedding-3-small',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "content_embeddings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "products" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "external_id" TEXT,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "price" DECIMAL(10,2) NOT NULL,
    "currency" VARCHAR(3) NOT NULL DEFAULT 'USD',
    "inventory" INTEGER NOT NULL DEFAULT 0,
    "image_url" TEXT,
    "metadata" JSONB DEFAULT '{}',
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "products_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "orders" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "external_id" TEXT,
    "status" "OrderStatus" NOT NULL DEFAULT 'PENDING',
    "totalAmount" DECIMAL(10,2) NOT NULL,
    "currency" VARCHAR(3) NOT NULL DEFAULT 'USD',
    "shipping_info" JSONB,
    "metadata" JSONB DEFAULT '{}',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "orders_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "order_items" (
    "id" TEXT NOT NULL,
    "order_id" TEXT NOT NULL,
    "product_id" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "unitPrice" DECIMAL(10,2) NOT NULL,

    CONSTRAINT "order_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "integrations" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "type" "IntegrationType" NOT NULL,
    "name" TEXT NOT NULL,
    "credentials" JSONB NOT NULL DEFAULT '{}',
    "settings" JSONB NOT NULL DEFAULT '{}',
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "last_sync_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "integrations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tenant_provider_keys" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "provider" "AIProvider" NOT NULL,
    "label" TEXT NOT NULL DEFAULT '',
    "credentials" JSONB NOT NULL DEFAULT '{}',
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "always_use" BOOLEAN NOT NULL DEFAULT false,
    "last_tested_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tenant_provider_keys_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "automations" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "name" VARCHAR(200) NOT NULL,
    "prompt" TEXT NOT NULL,
    "status" "AutomationStatus" NOT NULL DEFAULT 'ACTIVE',
    "schedule_kind" "AutomationScheduleKind" NOT NULL DEFAULT 'CRON',
    "schedule_expr" VARCHAR(256) NOT NULL,
    "timezone" VARCHAR(64) NOT NULL DEFAULT 'UTC',
    "model" VARCHAR(128) NOT NULL DEFAULT 'flagship',
    "reasoning_effort" "ReasoningEffort" NOT NULL DEFAULT 'MEDIUM',
    "scope_ref" VARCHAR(120),
    "known_issues" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "next_run_at" TIMESTAMP(3),
    "last_run_at" TIMESTAMP(3),
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "automations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "automation_runs" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "automation_id" TEXT NOT NULL,
    "status" "AutomationRunStatus" NOT NULL DEFAULT 'RUNNING',
    "idempotency_key" VARCHAR(191) NOT NULL,
    "thread_id" TEXT NOT NULL,
    "triggered_by" VARCHAR(20) NOT NULL DEFAULT 'scheduler',
    "scheduled_at" TIMESTAMP(3),
    "started_at" TIMESTAMP(3),
    "finished_at" TIMESTAMP(3),
    "summary" TEXT,
    "changed_files" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "blockers" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "verifications" JSONB NOT NULL DEFAULT '[]',
    "git_branch" VARCHAR(200),
    "git_commit_hash" VARCHAR(40),
    "git_push_status" VARCHAR(20),
    "token_usage" JSONB NOT NULL DEFAULT '{}',
    "memory_snapshot" JSONB NOT NULL DEFAULT '{}',
    "task_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "automation_runs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "para_projects" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "name" VARCHAR(200) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "para_projects_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "para_workspaces" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "project_id" TEXT NOT NULL,
    "name" VARCHAR(200) NOT NULL,
    "document" JSONB NOT NULL DEFAULT '{}',
    "document_version" INTEGER NOT NULL DEFAULT 1,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "para_workspaces_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "para_assets" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "type" "ParaAssetType" NOT NULL,
    "origin" "ParaAssetOrigin" NOT NULL,
    "scope" "ParaAssetScope" NOT NULL DEFAULT 'ACCOUNT',
    "url" VARCHAR(2048) NOT NULL,
    "label" VARCHAR(200) NOT NULL,
    "aspect" VARCHAR(8) NOT NULL DEFAULT '16:9',
    "job_id" VARCHAR(160),
    "workspace_id" TEXT,
    "project_id" TEXT,
    "favorite" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "para_assets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "para_threads" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "project_id" TEXT NOT NULL,
    "title" VARCHAR(200) NOT NULL,
    "autonomy" "ParaAutonomy" NOT NULL DEFAULT 'ASK',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "para_threads_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "para_runs" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "thread_id" TEXT NOT NULL,
    "workspace_id" TEXT NOT NULL,
    "input" TEXT NOT NULL,
    "context_node_ids" JSONB NOT NULL DEFAULT '[]',
    "status" "ParaRunStatus" NOT NULL DEFAULT 'QUEUED',
    "error" JSONB,
    "started_at" TIMESTAMP(3),
    "finished_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "para_runs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "para_approvals" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "run_id" TEXT NOT NULL,
    "tool_name" VARCHAR(120) NOT NULL,
    "args" JSONB NOT NULL DEFAULT '{}',
    "estimated_cost" INTEGER NOT NULL DEFAULT 0,
    "status" "ParaApprovalStatus" NOT NULL DEFAULT 'PENDING',
    "decided_by" TEXT,
    "decided_at" TIMESTAMP(3),
    "result_job_id" VARCHAR(160),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "para_approvals_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "workflow_definitions" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "name" VARCHAR(200) NOT NULL,
    "description" VARCHAR(500),
    "script_source" TEXT NOT NULL,
    "status" "WorkflowStatus" NOT NULL DEFAULT 'ACTIVE',
    "default_model" VARCHAR(128) NOT NULL DEFAULT 'flagship',
    "max_concurrency" INTEGER NOT NULL DEFAULT 16,
    "max_agents_per_run" INTEGER NOT NULL DEFAULT 1000,
    "max_retries" INTEGER NOT NULL DEFAULT 2,
    "timeout_ms" INTEGER NOT NULL DEFAULT 60000,
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "workflow_definitions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "workflow_runs" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "workflow_id" TEXT NOT NULL,
    "status" "WorkflowRunStatus" NOT NULL DEFAULT 'QUEUED',
    "idempotency_key" VARCHAR(191) NOT NULL,
    "thread_id" TEXT NOT NULL,
    "triggered_by" VARCHAR(20) NOT NULL DEFAULT 'api',
    "args" JSONB NOT NULL DEFAULT '{}',
    "result" JSONB,
    "events" JSONB NOT NULL DEFAULT '[]',
    "error" TEXT,
    "stats" JSONB NOT NULL DEFAULT '{}',
    "token_usage" JSONB NOT NULL DEFAULT '{}',
    "started_at" TIMESTAMP(3),
    "finished_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "workflow_runs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "model_configs" (
    "id" TEXT NOT NULL,
    "model_name" VARCHAR(128) NOT NULL,
    "provider" "AIProvider" NOT NULL,
    "input_price_per_million" DECIMAL(10,6) NOT NULL,
    "output_price_per_million" DECIMAL(10,6) NOT NULL,
    "currency" VARCHAR(3) NOT NULL DEFAULT 'USD',
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "unit" "PriceUnit" NOT NULL DEFAULT 'PER_1M_TOKENS',
    "unit_price" DECIMAL(12,6),
    "cache_read_per_million" DECIMAL(10,6),
    "cache_write_per_million" DECIMAL(10,6),
    "context_length" INTEGER,
    "published" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "model_configs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ai_request_logs" (
    "id" TEXT NOT NULL,
    "request_id" TEXT NOT NULL,
    "api_key_id" TEXT,
    "tenant_id" TEXT NOT NULL,
    "model" VARCHAR(128) NOT NULL,
    "prompt_tokens" INTEGER NOT NULL DEFAULT 0,
    "completion_tokens" INTEGER NOT NULL DEFAULT 0,
    "total_tokens" INTEGER NOT NULL DEFAULT 0,
    "cost" DECIMAL(10,6),
    "latency_ms" INTEGER,
    "status" VARCHAR(16) NOT NULL,
    "error_message" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "path" VARCHAR(120),
    "http_status" INTEGER,
    "ttfb_ms" INTEGER,
    "cached_prompt_tokens" INTEGER NOT NULL DEFAULT 0,
    "cache_write_tokens" INTEGER NOT NULL DEFAULT 0,
    "supply_path" VARCHAR(64),
    "client_ip" VARCHAR(64),
    "expires_at" TIMESTAMP(3),

    CONSTRAINT "ai_request_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "feature_definitions" (
    "id" TEXT NOT NULL,
    "key" VARCHAR(100) NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "category" VARCHAR(50) NOT NULL,
    "value_type" VARCHAR(20) NOT NULL DEFAULT 'boolean',
    "default_value" JSONB NOT NULL DEFAULT 'false',
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "feature_definitions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "usage_limit_definitions" (
    "id" TEXT NOT NULL,
    "key" VARCHAR(50) NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "unit" VARCHAR(20) NOT NULL,
    "reset_period" VARCHAR(20) NOT NULL DEFAULT 'monthly',
    "overage_rate" DECIMAL(10,8),
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "usage_limit_definitions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pricing_plans" (
    "id" TEXT NOT NULL,
    "stripe_id" TEXT,
    "name" TEXT NOT NULL,
    "slug" VARCHAR(50) NOT NULL,
    "description" TEXT,
    "plan" "Plan" NOT NULL,
    "interval" "BillingInterval" NOT NULL DEFAULT 'MONTHLY',
    "amount" DECIMAL(10,2) NOT NULL,
    "currency" VARCHAR(3) NOT NULL DEFAULT 'USD',
    "trial_days" INTEGER NOT NULL DEFAULT 0,
    "version" VARCHAR(20) NOT NULL DEFAULT 'v1',
    "effective_from" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "effective_to" TIMESTAMP(3),
    "base_plan_id" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "is_public" BOOLEAN NOT NULL DEFAULT true,
    "features" JSONB NOT NULL DEFAULT '[]',
    "limits" JSONB NOT NULL DEFAULT '{}',
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "pricing_plans_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "plan_features" (
    "id" TEXT NOT NULL,
    "plan_id" TEXT NOT NULL,
    "feature_id" TEXT NOT NULL,
    "value" JSONB NOT NULL,
    "is_enabled" BOOLEAN NOT NULL DEFAULT true,
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "plan_features_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "plan_usage_limits" (
    "id" TEXT NOT NULL,
    "plan_id" TEXT NOT NULL,
    "limit_id" TEXT NOT NULL,
    "limit_value" BIGINT NOT NULL,
    "overage_rate" DECIMAL(10,8),
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "plan_usage_limits_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "customer_plan_versions" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "plan_id" TEXT NOT NULL,
    "reason" TEXT,
    "approved_by" TEXT,
    "expires_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "customer_plan_versions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "customer_feature_overrides" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "feature_key" VARCHAR(100) NOT NULL,
    "value" JSONB NOT NULL,
    "reason" TEXT,
    "approved_by" TEXT,
    "expires_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "customer_feature_overrides_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "customer_usage_limits" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "limit_id" TEXT NOT NULL,
    "limit_value" BIGINT NOT NULL,
    "overage_rate" DECIMAL(10,8),
    "reason" TEXT,
    "approved_by" TEXT,
    "expires_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "customer_usage_limits_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "subscriptions" (
    "id" TEXT NOT NULL,
    "stripe_id" TEXT,
    "tenant_id" TEXT NOT NULL,
    "pricing_plan_id" TEXT NOT NULL,
    "status" "SubscriptionStatus" NOT NULL DEFAULT 'ACTIVE',
    "current_period_start" TIMESTAMP(3) NOT NULL,
    "current_period_end" TIMESTAMP(3) NOT NULL,
    "cancel_at_period_end" BOOLEAN NOT NULL DEFAULT false,
    "canceled_at" TIMESTAMP(3),
    "trial_start" TIMESTAMP(3),
    "trial_end" TIMESTAMP(3),
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "subscriptions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "invoices" (
    "id" TEXT NOT NULL,
    "stripe_id" TEXT,
    "tenant_id" TEXT NOT NULL,
    "subscription_id" TEXT,
    "number" TEXT NOT NULL,
    "status" "InvoiceStatus" NOT NULL DEFAULT 'DRAFT',
    "subtotal" DECIMAL(10,2) NOT NULL,
    "tax" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "total" DECIMAL(10,2) NOT NULL,
    "amount_paid" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "amount_due" DECIMAL(10,2) NOT NULL,
    "currency" VARCHAR(3) NOT NULL DEFAULT 'USD',
    "due_date" TIMESTAMP(3),
    "paid_at" TIMESTAMP(3),
    "invoice_pdf" TEXT,
    "hosted_invoice_url" TEXT,
    "billing_reason" TEXT,
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "invoices_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "invoice_items" (
    "id" TEXT NOT NULL,
    "invoice_id" TEXT NOT NULL,
    "pricing_plan_id" TEXT,
    "description" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "unit_amount" DECIMAL(10,4) NOT NULL,
    "amount" DECIMAL(10,2) NOT NULL,
    "currency" VARCHAR(3) NOT NULL DEFAULT 'USD',
    "period_start" TIMESTAMP(3) NOT NULL,
    "period_end" TIMESTAMP(3) NOT NULL,
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "invoice_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payments" (
    "id" TEXT NOT NULL,
    "stripe_id" TEXT,
    "tenant_id" TEXT NOT NULL,
    "invoice_id" TEXT,
    "amount" DECIMAL(10,2) NOT NULL,
    "currency" VARCHAR(3) NOT NULL DEFAULT 'USD',
    "status" VARCHAR(20) NOT NULL,
    "payment_method_type" "PaymentMethodType" NOT NULL,
    "payment_method_id" TEXT,
    "failure_code" TEXT,
    "failure_message" TEXT,
    "refunded_amount" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "payments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payment_methods" (
    "id" TEXT NOT NULL,
    "stripe_id" TEXT,
    "tenant_id" TEXT NOT NULL,
    "type" "PaymentMethodType" NOT NULL,
    "is_default" BOOLEAN NOT NULL DEFAULT false,
    "last_four" VARCHAR(4),
    "brand" VARCHAR(20),
    "expiry_month" INTEGER,
    "expiry_year" INTEGER,
    "billing_details" JSONB,
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "payment_methods_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "usage_ledger_entries" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "subscription_id" TEXT,
    "user_id" TEXT,
    "idempotency_key" VARCHAR(191) NOT NULL,
    "event_id" VARCHAR(191),
    "source" "UsageLedgerSource" NOT NULL DEFAULT 'API',
    "type" "UsageType" NOT NULL,
    "resource" VARCHAR(100),
    "quantity" BIGINT NOT NULL,
    "unit" VARCHAR(32) NOT NULL DEFAULT 'unit',
    "unit_cost" DECIMAL(10,8),
    "total_cost" DECIMAL(10,6),
    "currency" VARCHAR(3) NOT NULL DEFAULT 'USD',
    "occurred_at" TIMESTAMP(3) NOT NULL,
    "recorded_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ingest_version" VARCHAR(16) NOT NULL DEFAULT 'v1',
    "metadata" JSONB NOT NULL DEFAULT '{}',

    CONSTRAINT "usage_ledger_entries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "credit_balances" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "balance" DECIMAL(10,4) NOT NULL DEFAULT 0,
    "currency" VARCHAR(3) NOT NULL DEFAULT 'USD',
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "credit_balances_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "credit_transactions" (
    "id" TEXT NOT NULL,
    "credit_balance_id" TEXT NOT NULL,
    "type" "CreditTransactionType" NOT NULL,
    "amount" DECIMAL(10,4) NOT NULL,
    "balance_after" DECIMAL(10,4) NOT NULL,
    "description" TEXT,
    "expires_at" TIMESTAMP(3),
    "related_id" TEXT,
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "credit_transactions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "router_reservations" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "api_key_id" TEXT,
    "amount" DECIMAL(12,6) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expires_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "router_reservations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "stripe_customers" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "stripe_id" TEXT NOT NULL,
    "email" TEXT,
    "name" TEXT,
    "currency" VARCHAR(3) NOT NULL DEFAULT 'USD',
    "tax_exempt" VARCHAR(20) NOT NULL DEFAULT 'none',
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "stripe_customers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "retention_policies" (
    "table_name" TEXT NOT NULL,
    "keep_days" INTEGER NOT NULL,
    "time_column" TEXT NOT NULL DEFAULT 'created_at',
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "note" TEXT,

    CONSTRAINT "retention_policies_pkey" PRIMARY KEY ("table_name")
);

-- CreateTable
CREATE TABLE "webhook_events" (
    "id" TEXT NOT NULL,
    "provider" VARCHAR(20) NOT NULL,
    "event_id" TEXT NOT NULL,
    "event_type" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "processed_at" TIMESTAMP(3),
    "error_message" TEXT,
    "retry_count" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "webhook_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_logs" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT,
    "user_id" TEXT,
    "actor_type" VARCHAR(20),
    "action" VARCHAR(50) NOT NULL,
    "outcome" VARCHAR(10),
    "reason" VARCHAR(255),
    "entity_type" VARCHAR(50) NOT NULL,
    "entity_id" TEXT,
    "old_value" JSONB,
    "new_value" JSONB,
    "ip_address" VARCHAR(45),
    "user_agent" TEXT,
    "metadata" JSONB DEFAULT '{}',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "legal_documents" (
    "id" TEXT NOT NULL,
    "slug" VARCHAR(100) NOT NULL,
    "type" "LegalDocumentType" NOT NULL,
    "locale" VARCHAR(10) NOT NULL DEFAULT 'en',
    "version" VARCHAR(20) NOT NULL,
    "title" TEXT NOT NULL,
    "summary" TEXT,
    "content_hash" VARCHAR(64),
    "effective_at" TIMESTAMP(3) NOT NULL,
    "expires_at" TIMESTAMP(3),
    "changelog" JSONB NOT NULL DEFAULT '[]',
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "is_required" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "legal_documents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_consents" (
    "id" TEXT NOT NULL,
    "user_id" TEXT,
    "tenant_id" TEXT,
    "visitor_id" TEXT,
    "document_id" TEXT NOT NULL,
    "document_slug" VARCHAR(100) NOT NULL,
    "document_version" VARCHAR(20) NOT NULL,
    "consent_type" "ConsentType" NOT NULL DEFAULT 'EXPLICIT',
    "consent_given" BOOLEAN NOT NULL DEFAULT true,
    "ip_address" VARCHAR(45),
    "user_agent" TEXT,
    "consent_context" VARCHAR(100),
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "consented_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "withdrawn_at" TIMESTAMP(3),

    CONSTRAINT "user_consents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cookie_consents" (
    "id" TEXT NOT NULL,
    "visitor_id" TEXT NOT NULL,
    "user_id" TEXT,
    "necessary" BOOLEAN NOT NULL DEFAULT true,
    "functional" BOOLEAN NOT NULL DEFAULT false,
    "analytics" BOOLEAN NOT NULL DEFAULT false,
    "marketing" BOOLEAN NOT NULL DEFAULT false,
    "third_party" BOOLEAN NOT NULL DEFAULT false,
    "ip_address" VARCHAR(45),
    "user_agent" TEXT,
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "consented_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "expires_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "cookie_consents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "contact_submissions" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "company" TEXT,
    "phone" TEXT,
    "subject" VARCHAR(200) NOT NULL,
    "message" TEXT NOT NULL,
    "category" VARCHAR(50) NOT NULL DEFAULT 'general',
    "status" VARCHAR(20) NOT NULL DEFAULT 'new',
    "ip_address" VARCHAR(45),
    "user_agent" TEXT,
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "responded_at" TIMESTAMP(3),

    CONSTRAINT "contact_submissions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "waitlist_entries" (
    "id" TEXT NOT NULL,
    "email" VARCHAR(254) NOT NULL,
    "position" SERIAL NOT NULL,
    "referral_code" VARCHAR(40) NOT NULL,
    "referred_by" VARCHAR(40),
    "referral_count" INTEGER NOT NULL DEFAULT 0,
    "status" VARCHAR(20) NOT NULL DEFAULT 'waiting',
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "admitted_at" TIMESTAMP(3),

    CONSTRAINT "waitlist_entries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tasks" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "user_id" TEXT,
    "type" VARCHAR(80) NOT NULL,
    "status" "TaskStatus" NOT NULL DEFAULT 'QUEUED',
    "priority" "TaskPriority" NOT NULL DEFAULT 'NORMAL',
    "progress" INTEGER NOT NULL DEFAULT 0,
    "payload" JSONB NOT NULL DEFAULT '{}',
    "result" JSONB,
    "error" JSONB,
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "idempotency_key" VARCHAR(120),
    "queue_name" VARCHAR(64) NOT NULL DEFAULT 'ai',
    "dispatcher_provider" VARCHAR(32),
    "provider_job_id" VARCHAR(160),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "started_at" TIMESTAMP(3),
    "completed_at" TIMESTAMP(3),
    "expires_at" TIMESTAMP(3),

    CONSTRAINT "tasks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "uploads" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "user_id" TEXT,
    "status" "UploadStatus" NOT NULL DEFAULT 'PENDING',
    "provider" VARCHAR(32) NOT NULL,
    "bucket" VARCHAR(160) NOT NULL,
    "object_key" VARCHAR(700) NOT NULL,
    "filename" VARCHAR(255) NOT NULL,
    "content_type" VARCHAR(255) NOT NULL,
    "size_bytes" BIGINT NOT NULL,
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "idempotency_key" VARCHAR(120),
    "upload_url_expires_at" TIMESTAMP(3) NOT NULL,
    "etag" VARCHAR(255),
    "checksum_sha256" VARCHAR(64),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "completed_at" TIMESTAMP(3),

    CONSTRAINT "uploads_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "oauth_clients" (
    "id" TEXT NOT NULL,
    "client_id" TEXT NOT NULL,
    "client_secret_hash" TEXT,
    "client_secret_envelope" JSONB,
    "type" "OAuthClientType" NOT NULL DEFAULT 'CONFIDENTIAL',
    "status" "OAuthClientStatus" NOT NULL DEFAULT 'ACTIVE',
    "name" TEXT NOT NULL,
    "description" TEXT,
    "logo_url" TEXT,
    "website_url" TEXT,
    "privacy_policy_url" TEXT,
    "tos_url" TEXT,
    "redirect_uris" TEXT[],
    "allowed_scopes" TEXT[] DEFAULT ARRAY['openid', 'profile']::TEXT[],
    "grant_types" TEXT[] DEFAULT ARRAY['authorization_code']::TEXT[],
    "response_types" TEXT[] DEFAULT ARRAY['code']::TEXT[],
    "token_endpoint_auth_method" TEXT NOT NULL DEFAULT 'client_secret_basic',
    "rate_limit_rpm" INTEGER NOT NULL DEFAULT 60,
    "access_token_ttl" INTEGER NOT NULL DEFAULT 3600,
    "refresh_token_ttl" INTEGER NOT NULL DEFAULT 2592000,
    "tenant_id" TEXT,
    "created_by_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "oauth_clients_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "oauth_authorizations" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "client_id" TEXT NOT NULL,
    "scopes" TEXT[],
    "granted_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "revoked_at" TIMESTAMP(3),

    CONSTRAINT "oauth_authorizations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "oauth_access_tokens" (
    "id" TEXT NOT NULL,
    "token_hash" TEXT NOT NULL,
    "client_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "scopes" TEXT[],
    "expires_at" TIMESTAMP(3) NOT NULL,
    "revoked_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "oauth_access_tokens_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "auth_users" (
    "id" TEXT NOT NULL,
    "email" TEXT,
    "phone" TEXT,
    "email_verified" BOOLEAN NOT NULL DEFAULT false,
    "phone_verified" BOOLEAN NOT NULL DEFAULT false,
    "name" TEXT,
    "image" TEXT,
    "password_hash" TEXT,
    "two_factor_enabled" BOOLEAN NOT NULL DEFAULT false,
    "two_factor_secret" TEXT,
    "backup_codes" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "auth_users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "chat_sessions" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "title" VARCHAR(200) NOT NULL DEFAULT 'New chat',
    "mode" VARCHAR(20) NOT NULL DEFAULT 'chat',
    "messages" JSONB NOT NULL DEFAULT '[]',
    "message_count" INTEGER NOT NULL DEFAULT 0,
    "last_message_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "chat_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "threads" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "title" VARCHAR(200) NOT NULL DEFAULT 'Untitled',
    "summary" TEXT,
    "last_activity_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "threads_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_profiles" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "nickname" VARCHAR(80),
    "occupation" VARCHAR(120),
    "bio" TEXT,
    "custom_instructions" TEXT,
    "preferences" JSONB NOT NULL DEFAULT '{}',
    "updated_at" TIMESTAMP(3) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_profiles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "skills" (
    "id" TEXT NOT NULL,
    "slug" VARCHAR(80) NOT NULL,
    "name" VARCHAR(120) NOT NULL,
    "description" TEXT NOT NULL,
    "category" VARCHAR(40),
    "is_official" BOOLEAN NOT NULL DEFAULT false,
    "version" VARCHAR(20) NOT NULL,
    "tags" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "icon_url" TEXT,
    "config" JSONB NOT NULL DEFAULT '{}',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "skills_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_skills" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "tenant_id" TEXT,
    "skill_id" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "config" JSONB NOT NULL DEFAULT '{}',
    "installed_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_skills_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "connectors" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "tenant_id" TEXT,
    "type" VARCHAR(40) NOT NULL,
    "name" VARCHAR(120) NOT NULL,
    "icon_url" TEXT,
    "config" JSONB NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "last_used_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "connectors_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cofounder_profiles" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "archetype" VARCHAR(40),
    "arena" VARCHAR(60) NOT NULL,
    "headline" VARCHAR(280) NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "cofounder_profiles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cofounder_interests" (
    "id" TEXT NOT NULL,
    "from_profile_id" TEXT NOT NULL,
    "to_profile_id" TEXT NOT NULL,
    "kind" "CofounderInterestKind" NOT NULL,
    "pitch" VARCHAR(1000),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "cofounder_interests_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "access_invite_codes" (
    "id" TEXT NOT NULL,
    "code_hash" VARCHAR(128) NOT NULL,
    "code_prefix" VARCHAR(16) NOT NULL,
    "scope" "AccessInviteScope" NOT NULL DEFAULT 'PLATFORM',
    "tenant_id" TEXT,
    "issued_by_user_id" TEXT NOT NULL,
    "issued_to_email" VARCHAR(254),
    "status" "AccessInviteStatus" NOT NULL DEFAULT 'ACTIVE',
    "max_redemptions" INTEGER NOT NULL DEFAULT 1,
    "redemption_count" INTEGER NOT NULL DEFAULT 0,
    "expires_at" TIMESTAMP(3),
    "revoked_at" TIMESTAMP(3),
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "access_invite_codes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "access_invite_redemptions" (
    "id" TEXT NOT NULL,
    "invite_code_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "tenant_id" TEXT,
    "email" VARCHAR(254),
    "ip_address" VARCHAR(45),
    "redeemed_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "metadata" JSONB NOT NULL DEFAULT '{}',

    CONSTRAINT "access_invite_redemptions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "referrals" (
    "id" TEXT NOT NULL,
    "code" VARCHAR(20) NOT NULL,
    "referrer_user_id" TEXT NOT NULL,
    "referred_email" VARCHAR(254),
    "referred_user_id" TEXT,
    "status" VARCHAR(20) NOT NULL DEFAULT 'pending',
    "reward_credits" INTEGER NOT NULL DEFAULT 0,
    "level" INTEGER NOT NULL DEFAULT 0,
    "expires_at" TIMESTAMP(3),
    "claimed_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "referrals_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "redemption_codes" (
    "id" TEXT NOT NULL,
    "code" VARCHAR(40) NOT NULL,
    "type" VARCHAR(20) NOT NULL,
    "reward_amount" INTEGER NOT NULL DEFAULT 0,
    "reward_payload" JSONB NOT NULL DEFAULT '{}',
    "max_redemptions" INTEGER NOT NULL DEFAULT 1,
    "redemption_count" INTEGER NOT NULL DEFAULT 0,
    "expires_at" TIMESTAMP(3),
    "campaign_name" VARCHAR(80),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "redemption_codes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "code_redemptions" (
    "id" TEXT NOT NULL,
    "code_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "tenant_id" TEXT,
    "redeemed_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ip_address" VARCHAR(45),

    CONSTRAINT "code_redemptions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "feedback_reports" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT,
    "user_id" TEXT,
    "area" VARCHAR(40) NOT NULL,
    "mode" VARCHAR(20),
    "description" TEXT NOT NULL,
    "contact_email" VARCHAR(254),
    "session_id" TEXT,
    "user_agent" VARCHAR(500),
    "page_url" VARCHAR(500),
    "resolved" BOOLEAN NOT NULL DEFAULT false,
    "resolved_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "feedback_reports_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "auth_accounts" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "account_id" TEXT NOT NULL,
    "provider_id" TEXT NOT NULL,
    "access_token" TEXT,
    "refresh_token" TEXT,
    "access_token_expires_at" TIMESTAMP(3),
    "refresh_token_expires_at" TIMESTAMP(3),
    "scope" TEXT,
    "id_token" TEXT,
    "password" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "auth_accounts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "auth_sessions" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "ip_address" TEXT,
    "user_agent" TEXT,
    "active_organization_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "auth_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "desktop_auth_handoffs" (
    "id" TEXT NOT NULL,
    "token_hash" VARCHAR(64) NOT NULL,
    "user_id" TEXT NOT NULL,
    "scheme" VARCHAR(40) NOT NULL,
    "state" VARCHAR(64) NOT NULL,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "consumed_at" TIMESTAMP(3),
    "ip_address" VARCHAR(45),
    "user_agent" VARCHAR(500),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "desktop_auth_handoffs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "desktop_auth_sessions" (
    "id" TEXT NOT NULL,
    "token_hash" VARCHAR(64) NOT NULL,
    "handoff_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "scheme" VARCHAR(40) NOT NULL,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "revoked_at" TIMESTAMP(3),
    "last_used_at" TIMESTAMP(3),
    "ip_address" VARCHAR(45),
    "user_agent" VARCHAR(500),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "desktop_auth_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "auth_verifications" (
    "id" TEXT NOT NULL,
    "identifier" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "auth_verifications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "community_profiles" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "display_name" TEXT,
    "role" TEXT NOT NULL,
    "company" TEXT,
    "team_size" TEXT,
    "industry" TEXT,
    "use_case" TEXT,
    "building_what" TEXT,
    "referral_source" TEXT,
    "showcase_url" TEXT,
    "github_handle" TEXT,
    "twitter_handle" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "community_profiles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "licenses" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "tier" "LicenseTier" NOT NULL,
    "type" "LicenseType" NOT NULL,
    "license_key" TEXT NOT NULL,
    "accepted_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "accepted_ip" TEXT,
    "accepted_version" TEXT NOT NULL DEFAULT '1.0',
    "stripe_customer_id" TEXT,
    "stripe_subscription_id" TEXT,
    "stripe_price_id" TEXT,
    "expires_at" TIMESTAMP(3),
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "project_name" TEXT,
    "project_url" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "licenses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sleptons_member_profiles" (
    "id" TEXT NOT NULL,
    "member_number" SERIAL NOT NULL,
    "user_id" TEXT NOT NULL,
    "license_id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "display_name" TEXT NOT NULL,
    "bio" TEXT,
    "avatar_url" TEXT,
    "product_name" TEXT,
    "product_url" TEXT,
    "product_tagline" TEXT,
    "tech_stack" TEXT[],
    "looking_for" TEXT[],
    "tier" "SleptonsTier" NOT NULL DEFAULT 'V0',
    "is_public" BOOLEAN NOT NULL DEFAULT true,
    "embedding" vector(1536),
    "github_handle" TEXT,
    "github_data" JSONB,
    "github_refreshed_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "sleptons_member_profiles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sleptons_products" (
    "id" TEXT NOT NULL,
    "member_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "tagline" TEXT NOT NULL,
    "description" TEXT,
    "url" TEXT,
    "github_url" TEXT,
    "thumbnail_url" TEXT,
    "stage" "ProductStage" NOT NULL DEFAULT 'BUILDING',
    "is_featured" BOOLEAN NOT NULL DEFAULT false,
    "featured_at" TIMESTAMP(3),
    "featured_week" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "sleptons_products_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sleptons_upvotes" (
    "member_id" TEXT NOT NULL,
    "product_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "sleptons_upvotes_pkey" PRIMARY KEY ("member_id","product_id")
);

-- CreateTable
CREATE TABLE "sleptons_connections" (
    "follower_id" TEXT NOT NULL,
    "following_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "sleptons_connections_pkey" PRIMARY KEY ("follower_id","following_id")
);

-- CreateTable
CREATE TABLE "sleptons_resumes" (
    "id" TEXT NOT NULL,
    "member_id" TEXT NOT NULL,
    "content" JSONB NOT NULL,
    "schema_version" INTEGER NOT NULL DEFAULT 1,
    "headline" VARCHAR(120),
    "skills_flat" TEXT[],
    "highlights" TEXT[],
    "years_active" INTEGER,
    "completeness" INTEGER NOT NULL DEFAULT 0,
    "is_public" BOOLEAN NOT NULL DEFAULT false,
    "language" "ResumeLang" NOT NULL DEFAULT 'MIX',
    "last_exported_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "sleptons_resumes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "better_auth"."organization" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "logo" TEXT,
    "metadata" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "organization_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "better_auth"."member" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'member',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "member_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "better_auth"."invitation" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "inviter_id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "role" TEXT,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "expires_at" TIMESTAMP(3),
    "token" TEXT,
    "accepted_at" TIMESTAMP(3),
    "declined_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "invitation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "better_auth"."passkey" (
    "id" TEXT NOT NULL,
    "name" TEXT,
    "public_key" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "credential_i_d" TEXT NOT NULL,
    "counter" INTEGER NOT NULL,
    "device_type" TEXT NOT NULL,
    "backed_up" BOOLEAN NOT NULL,
    "transports" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "passkey_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "auth_device_codes" (
    "id" TEXT NOT NULL,
    "device_code" TEXT NOT NULL,
    "user_code" TEXT NOT NULL,
    "user_id" TEXT,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "last_polled_at" TIMESTAMP(3),
    "polling_interval" INTEGER,
    "client_id" TEXT,
    "scope" TEXT,

    CONSTRAINT "auth_device_codes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "atelier_canvas" (
    "pk" TEXT NOT NULL,
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "scene" JSONB NOT NULL DEFAULT '{"elements":[],"files":[]}',
    "thumbnail" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "atelier_canvas_pkey" PRIMARY KEY ("pk")
);

-- CreateTable
CREATE TABLE "agent_rollout_lines" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "thread_id" TEXT NOT NULL,
    "seq" INTEGER NOT NULL,
    "at" TIMESTAMP(3) NOT NULL,
    "payload" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "agent_rollout_lines_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pebble_diagnostic_tickets" (
    "id" TEXT NOT NULL,
    "bundle_submission_id" VARCHAR(191) NOT NULL,
    "status" "PebbleDiagnosticStatus" NOT NULL DEFAULT 'PENDING_UPLOAD',
    "declared_bytes" INTEGER NOT NULL,
    "stored_bytes" INTEGER,
    "bucket" VARCHAR(191),
    "object_key" VARCHAR(255),
    "checksum_sha256" VARCHAR(64),
    "app_version" VARCHAR(64),
    "platform" VARCHAR(32),
    "expires_at" TIMESTAMP(3) NOT NULL,
    "stored_at" TIMESTAMP(3),
    "deleted_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "pebble_diagnostic_tickets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pebble_feedback" (
    "id" TEXT NOT NULL,
    "submission_id" VARCHAR(191) NOT NULL,
    "kind" "PebbleFeedbackKind" NOT NULL DEFAULT 'FEEDBACK',
    "message" TEXT NOT NULL,
    "contact_email" VARCHAR(320),
    "app_version" VARCHAR(64),
    "platform" VARCHAR(32),
    "locale" VARCHAR(35),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "pebble_feedback_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "platform_staff" (
    "user_id" TEXT NOT NULL,
    "role" "PlatformStaffRole" NOT NULL,
    "granted_by_id" TEXT,
    "granted_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "revoked_at" TIMESTAMP(3),
    "note" TEXT,

    CONSTRAINT "platform_staff_pkey" PRIMARY KEY ("user_id")
);

-- CreateIndex
CREATE UNIQUE INDEX "organizations_clerk_id_key" ON "organizations"("clerk_id");

-- CreateIndex
CREATE UNIQUE INDEX "organizations_slug_key" ON "organizations"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "tenants_organization_id_key" ON "tenants"("organization_id");

-- CreateIndex
CREATE UNIQUE INDEX "tenants_user_id_key" ON "tenants"("user_id");

-- CreateIndex
CREATE INDEX "tenant_transfer_journals_to_organization_id_status_idx" ON "tenant_transfer_journals"("to_organization_id", "status");

-- CreateIndex
CREATE INDEX "tenant_transfer_journals_from_tenant_id_idx" ON "tenant_transfer_journals"("from_tenant_id");

-- CreateIndex
CREATE INDEX "tenant_transfer_journals_to_tenant_id_idx" ON "tenant_transfer_journals"("to_tenant_id");

-- CreateIndex
CREATE UNIQUE INDEX "api_keys_key_hash_key" ON "api_keys"("key_hash");

-- CreateIndex
CREATE INDEX "api_keys_tenant_id_idx" ON "api_keys"("tenant_id");

-- CreateIndex
CREATE INDEX "api_keys_key_hash_idx" ON "api_keys"("key_hash");

-- CreateIndex
CREATE INDEX "api_keys_tenant_id_revoked_at_idx" ON "api_keys"("tenant_id", "revoked_at");

-- CreateIndex
CREATE INDEX "api_keys_tenant_id_disabled_at_idx" ON "api_keys"("tenant_id", "disabled_at");

-- CreateIndex
CREATE UNIQUE INDEX "users_clerk_id_key" ON "users"("clerk_id");

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "organization_members_organization_id_user_id_key" ON "organization_members"("organization_id", "user_id");

-- CreateIndex
CREATE UNIQUE INDEX "organization_invitations_token_key" ON "organization_invitations"("token");

-- CreateIndex
CREATE INDEX "organization_invitations_email_idx" ON "organization_invitations"("email");

-- CreateIndex
CREATE INDEX "organization_invitations_organization_id_idx" ON "organization_invitations"("organization_id");

-- CreateIndex
CREATE INDEX "notifications_user_id_tenant_id_read_created_at_idx" ON "notifications"("user_id", "tenant_id", "read", "created_at" DESC);

-- CreateIndex
CREATE INDEX "notifications_tenant_id_created_at_idx" ON "notifications"("tenant_id", "created_at" DESC);

-- CreateIndex
CREATE INDEX "notification_preferences_tenant_id_channel_idx" ON "notification_preferences"("tenant_id", "channel");

-- CreateIndex
CREATE UNIQUE INDEX "notification_preferences_user_id_tenant_id_channel_key" ON "notification_preferences"("user_id", "tenant_id", "channel");

-- CreateIndex
CREATE INDEX "contents_tenant_id_idx" ON "contents"("tenant_id");

-- CreateIndex
CREATE INDEX "contents_author_id_idx" ON "contents"("author_id");

-- CreateIndex
CREATE INDEX "contents_status_idx" ON "contents"("status");

-- CreateIndex
CREATE INDEX "contents_tenant_id_status_idx" ON "contents"("tenant_id", "status");

-- CreateIndex
CREATE INDEX "contents_tenant_id_published_at_idx" ON "contents"("tenant_id", "published_at");

-- CreateIndex
CREATE UNIQUE INDEX "contents_tenant_id_slug_key" ON "contents"("tenant_id", "slug");

-- CreateIndex
CREATE UNIQUE INDEX "content_translations_content_id_locale_key" ON "content_translations"("content_id", "locale");

-- CreateIndex
CREATE INDEX "content_embeddings_content_id_idx" ON "content_embeddings"("content_id");

-- CreateIndex
CREATE INDEX "products_tenant_id_idx" ON "products"("tenant_id");

-- CreateIndex
CREATE UNIQUE INDEX "products_tenant_id_external_id_key" ON "products"("tenant_id", "external_id");

-- CreateIndex
CREATE INDEX "orders_tenant_id_idx" ON "orders"("tenant_id");

-- CreateIndex
CREATE INDEX "orders_user_id_idx" ON "orders"("user_id");

-- CreateIndex
CREATE INDEX "orders_status_idx" ON "orders"("status");

-- CreateIndex
CREATE INDEX "orders_tenant_id_status_idx" ON "orders"("tenant_id", "status");

-- CreateIndex
CREATE INDEX "orders_tenant_id_user_id_idx" ON "orders"("tenant_id", "user_id");

-- CreateIndex
CREATE UNIQUE INDEX "integrations_tenant_id_type_name_key" ON "integrations"("tenant_id", "type", "name");

-- CreateIndex
CREATE INDEX "tenant_provider_keys_tenant_id_idx" ON "tenant_provider_keys"("tenant_id");

-- CreateIndex
CREATE UNIQUE INDEX "tenant_provider_keys_tenant_id_provider_key" ON "tenant_provider_keys"("tenant_id", "provider");

-- CreateIndex
CREATE INDEX "automations_tenant_id_status_next_run_at_idx" ON "automations"("tenant_id", "status", "next_run_at");

-- CreateIndex
CREATE INDEX "automations_tenant_id_created_at_idx" ON "automations"("tenant_id", "created_at" DESC);

-- CreateIndex
CREATE UNIQUE INDEX "automations_tenant_id_name_key" ON "automations"("tenant_id", "name");

-- CreateIndex
CREATE INDEX "automation_runs_tenant_id_automation_id_created_at_idx" ON "automation_runs"("tenant_id", "automation_id", "created_at" DESC);

-- CreateIndex
CREATE INDEX "automation_runs_tenant_id_status_created_at_idx" ON "automation_runs"("tenant_id", "status", "created_at" DESC);

-- CreateIndex
CREATE UNIQUE INDEX "automation_runs_tenant_id_idempotency_key_key" ON "automation_runs"("tenant_id", "idempotency_key");

-- CreateIndex
CREATE INDEX "para_projects_tenant_id_updated_at_idx" ON "para_projects"("tenant_id", "updated_at" DESC);

-- CreateIndex
CREATE INDEX "para_workspaces_tenant_id_project_id_updated_at_idx" ON "para_workspaces"("tenant_id", "project_id", "updated_at" DESC);

-- CreateIndex
CREATE INDEX "para_assets_tenant_id_origin_created_at_idx" ON "para_assets"("tenant_id", "origin", "created_at" DESC);

-- CreateIndex
CREATE INDEX "para_assets_tenant_id_workspace_id_idx" ON "para_assets"("tenant_id", "workspace_id");

-- CreateIndex
CREATE INDEX "para_threads_tenant_id_project_id_updated_at_idx" ON "para_threads"("tenant_id", "project_id", "updated_at" DESC);

-- CreateIndex
CREATE INDEX "para_runs_tenant_id_thread_id_created_at_idx" ON "para_runs"("tenant_id", "thread_id", "created_at" DESC);

-- CreateIndex
CREATE INDEX "para_runs_tenant_id_status_idx" ON "para_runs"("tenant_id", "status");

-- CreateIndex
CREATE INDEX "para_approvals_tenant_id_run_id_created_at_idx" ON "para_approvals"("tenant_id", "run_id", "created_at" DESC);

-- CreateIndex
CREATE INDEX "para_approvals_tenant_id_status_idx" ON "para_approvals"("tenant_id", "status");

-- CreateIndex
CREATE INDEX "workflow_definitions_tenant_id_status_created_at_idx" ON "workflow_definitions"("tenant_id", "status", "created_at" DESC);

-- CreateIndex
CREATE UNIQUE INDEX "workflow_definitions_tenant_id_name_key" ON "workflow_definitions"("tenant_id", "name");

-- CreateIndex
CREATE INDEX "workflow_runs_tenant_id_workflow_id_created_at_idx" ON "workflow_runs"("tenant_id", "workflow_id", "created_at" DESC);

-- CreateIndex
CREATE INDEX "workflow_runs_tenant_id_status_created_at_idx" ON "workflow_runs"("tenant_id", "status", "created_at" DESC);

-- CreateIndex
CREATE UNIQUE INDEX "workflow_runs_tenant_id_idempotency_key_key" ON "workflow_runs"("tenant_id", "idempotency_key");

-- CreateIndex
CREATE UNIQUE INDEX "model_configs_model_name_key" ON "model_configs"("model_name");

-- CreateIndex
CREATE INDEX "model_configs_published_idx" ON "model_configs"("published");

-- CreateIndex
CREATE UNIQUE INDEX "ai_request_logs_request_id_key" ON "ai_request_logs"("request_id");

-- CreateIndex
CREATE INDEX "ai_request_logs_tenant_id_created_at_idx" ON "ai_request_logs"("tenant_id", "created_at");

-- CreateIndex
CREATE INDEX "ai_request_logs_api_key_id_idx" ON "ai_request_logs"("api_key_id");

-- CreateIndex
CREATE INDEX "ai_request_logs_api_key_id_created_at_idx" ON "ai_request_logs"("api_key_id", "created_at");

-- CreateIndex
CREATE INDEX "ai_request_logs_model_created_at_idx" ON "ai_request_logs"("model", "created_at");

-- CreateIndex
CREATE INDEX "ai_request_logs_expires_at_idx" ON "ai_request_logs"("expires_at");

-- CreateIndex
CREATE UNIQUE INDEX "feature_definitions_key_key" ON "feature_definitions"("key");

-- CreateIndex
CREATE INDEX "feature_definitions_category_idx" ON "feature_definitions"("category");

-- CreateIndex
CREATE UNIQUE INDEX "usage_limit_definitions_key_key" ON "usage_limit_definitions"("key");

-- CreateIndex
CREATE UNIQUE INDEX "pricing_plans_stripe_id_key" ON "pricing_plans"("stripe_id");

-- CreateIndex
CREATE UNIQUE INDEX "pricing_plans_slug_key" ON "pricing_plans"("slug");

-- CreateIndex
CREATE INDEX "pricing_plans_plan_is_active_idx" ON "pricing_plans"("plan", "is_active");

-- CreateIndex
CREATE UNIQUE INDEX "pricing_plans_slug_version_key" ON "pricing_plans"("slug", "version");

-- CreateIndex
CREATE UNIQUE INDEX "plan_features_plan_id_feature_id_key" ON "plan_features"("plan_id", "feature_id");

-- CreateIndex
CREATE UNIQUE INDEX "plan_usage_limits_plan_id_limit_id_key" ON "plan_usage_limits"("plan_id", "limit_id");

-- CreateIndex
CREATE UNIQUE INDEX "customer_plan_versions_tenant_id_key" ON "customer_plan_versions"("tenant_id");

-- CreateIndex
CREATE INDEX "customer_feature_overrides_feature_key_idx" ON "customer_feature_overrides"("feature_key");

-- CreateIndex
CREATE UNIQUE INDEX "customer_feature_overrides_tenant_id_feature_key_key" ON "customer_feature_overrides"("tenant_id", "feature_key");

-- CreateIndex
CREATE UNIQUE INDEX "customer_usage_limits_tenant_id_limit_id_key" ON "customer_usage_limits"("tenant_id", "limit_id");

-- CreateIndex
CREATE UNIQUE INDEX "subscriptions_stripe_id_key" ON "subscriptions"("stripe_id");

-- CreateIndex
CREATE INDEX "subscriptions_tenant_id_idx" ON "subscriptions"("tenant_id");

-- CreateIndex
CREATE INDEX "subscriptions_status_idx" ON "subscriptions"("status");

-- CreateIndex
CREATE INDEX "subscriptions_tenant_id_status_idx" ON "subscriptions"("tenant_id", "status");

-- CreateIndex
CREATE UNIQUE INDEX "invoices_stripe_id_key" ON "invoices"("stripe_id");

-- CreateIndex
CREATE UNIQUE INDEX "invoices_number_key" ON "invoices"("number");

-- CreateIndex
CREATE INDEX "invoices_tenant_id_idx" ON "invoices"("tenant_id");

-- CreateIndex
CREATE INDEX "invoices_status_idx" ON "invoices"("status");

-- CreateIndex
CREATE INDEX "invoices_due_date_idx" ON "invoices"("due_date");

-- CreateIndex
CREATE INDEX "invoices_tenant_id_status_idx" ON "invoices"("tenant_id", "status");

-- CreateIndex
CREATE INDEX "invoices_tenant_id_created_at_idx" ON "invoices"("tenant_id", "created_at");

-- CreateIndex
CREATE UNIQUE INDEX "payments_stripe_id_key" ON "payments"("stripe_id");

-- CreateIndex
CREATE INDEX "payments_tenant_id_idx" ON "payments"("tenant_id");

-- CreateIndex
CREATE INDEX "payments_status_idx" ON "payments"("status");

-- CreateIndex
CREATE INDEX "payments_tenant_id_status_idx" ON "payments"("tenant_id", "status");

-- CreateIndex
CREATE INDEX "payments_tenant_id_created_at_idx" ON "payments"("tenant_id", "created_at");

-- CreateIndex
CREATE UNIQUE INDEX "payment_methods_stripe_id_key" ON "payment_methods"("stripe_id");

-- CreateIndex
CREATE INDEX "payment_methods_tenant_id_idx" ON "payment_methods"("tenant_id");

-- CreateIndex
CREATE INDEX "usage_ledger_entries_tenant_id_occurred_at_idx" ON "usage_ledger_entries"("tenant_id", "occurred_at");

-- CreateIndex
CREATE INDEX "usage_ledger_entries_tenant_id_type_occurred_at_idx" ON "usage_ledger_entries"("tenant_id", "type", "occurred_at");

-- CreateIndex
CREATE INDEX "usage_ledger_entries_event_id_idx" ON "usage_ledger_entries"("event_id");

-- CreateIndex
CREATE UNIQUE INDEX "usage_ledger_entries_tenant_id_idempotency_key_key" ON "usage_ledger_entries"("tenant_id", "idempotency_key");

-- CreateIndex
CREATE UNIQUE INDEX "credit_balances_tenant_id_key" ON "credit_balances"("tenant_id");

-- CreateIndex
CREATE INDEX "credit_transactions_credit_balance_id_idx" ON "credit_transactions"("credit_balance_id");

-- CreateIndex
CREATE INDEX "credit_transactions_type_idx" ON "credit_transactions"("type");

-- CreateIndex
CREATE INDEX "credit_transactions_created_at_idx" ON "credit_transactions"("created_at");

-- CreateIndex
CREATE UNIQUE INDEX "credit_transactions_credit_balance_id_type_related_id_key" ON "credit_transactions"("credit_balance_id", "type", "related_id");

-- CreateIndex
CREATE INDEX "router_reservations_expires_at_idx" ON "router_reservations"("expires_at");

-- CreateIndex
CREATE INDEX "router_reservations_tenant_id_expires_at_idx" ON "router_reservations"("tenant_id", "expires_at");

-- CreateIndex
CREATE UNIQUE INDEX "stripe_customers_tenant_id_key" ON "stripe_customers"("tenant_id");

-- CreateIndex
CREATE UNIQUE INDEX "stripe_customers_stripe_id_key" ON "stripe_customers"("stripe_id");

-- CreateIndex
CREATE INDEX "webhook_events_event_type_idx" ON "webhook_events"("event_type");

-- CreateIndex
CREATE INDEX "webhook_events_processed_at_idx" ON "webhook_events"("processed_at");

-- CreateIndex
CREATE UNIQUE INDEX "webhook_events_provider_event_id_key" ON "webhook_events"("provider", "event_id");

-- CreateIndex
CREATE INDEX "audit_logs_tenant_id_idx" ON "audit_logs"("tenant_id");

-- CreateIndex
CREATE INDEX "audit_logs_user_id_idx" ON "audit_logs"("user_id");

-- CreateIndex
CREATE INDEX "audit_logs_entity_type_entity_id_idx" ON "audit_logs"("entity_type", "entity_id");

-- CreateIndex
CREATE INDEX "audit_logs_action_idx" ON "audit_logs"("action");

-- CreateIndex
CREATE INDEX "audit_logs_outcome_idx" ON "audit_logs"("outcome");

-- CreateIndex
CREATE INDEX "audit_logs_created_at_idx" ON "audit_logs"("created_at");

-- CreateIndex
CREATE INDEX "audit_logs_tenant_id_created_at_idx" ON "audit_logs"("tenant_id", "created_at");

-- CreateIndex
CREATE INDEX "audit_logs_tenant_id_user_id_idx" ON "audit_logs"("tenant_id", "user_id");

-- CreateIndex
CREATE INDEX "legal_documents_type_is_active_idx" ON "legal_documents"("type", "is_active");

-- CreateIndex
CREATE INDEX "legal_documents_locale_idx" ON "legal_documents"("locale");

-- CreateIndex
CREATE INDEX "legal_documents_slug_is_active_effective_at_idx" ON "legal_documents"("slug", "is_active", "effective_at");

-- CreateIndex
CREATE INDEX "legal_documents_locale_is_active_effective_at_idx" ON "legal_documents"("locale", "is_active", "effective_at");

-- CreateIndex
CREATE UNIQUE INDEX "legal_documents_slug_version_locale_key" ON "legal_documents"("slug", "version", "locale");

-- CreateIndex
CREATE INDEX "user_consents_user_id_idx" ON "user_consents"("user_id");

-- CreateIndex
CREATE INDEX "user_consents_tenant_id_idx" ON "user_consents"("tenant_id");

-- CreateIndex
CREATE INDEX "user_consents_visitor_id_idx" ON "user_consents"("visitor_id");

-- CreateIndex
CREATE INDEX "user_consents_document_slug_document_version_idx" ON "user_consents"("document_slug", "document_version");

-- CreateIndex
CREATE INDEX "user_consents_consented_at_idx" ON "user_consents"("consented_at");

-- CreateIndex
CREATE INDEX "user_consents_document_slug_consent_given_withdrawn_at_idx" ON "user_consents"("document_slug", "consent_given", "withdrawn_at");

-- CreateIndex
CREATE INDEX "cookie_consents_user_id_idx" ON "cookie_consents"("user_id");

-- CreateIndex
CREATE INDEX "cookie_consents_consented_at_idx" ON "cookie_consents"("consented_at");

-- CreateIndex
CREATE INDEX "cookie_consents_user_id_expires_at_idx" ON "cookie_consents"("user_id", "expires_at");

-- CreateIndex
CREATE UNIQUE INDEX "cookie_consents_visitor_id_key" ON "cookie_consents"("visitor_id");

-- CreateIndex
CREATE INDEX "contact_submissions_email_idx" ON "contact_submissions"("email");

-- CreateIndex
CREATE INDEX "contact_submissions_category_idx" ON "contact_submissions"("category");

-- CreateIndex
CREATE INDEX "contact_submissions_status_idx" ON "contact_submissions"("status");

-- CreateIndex
CREATE INDEX "contact_submissions_created_at_idx" ON "contact_submissions"("created_at");

-- CreateIndex
CREATE UNIQUE INDEX "waitlist_entries_email_key" ON "waitlist_entries"("email");

-- CreateIndex
CREATE UNIQUE INDEX "waitlist_entries_position_key" ON "waitlist_entries"("position");

-- CreateIndex
CREATE UNIQUE INDEX "waitlist_entries_referral_code_key" ON "waitlist_entries"("referral_code");

-- CreateIndex
CREATE INDEX "waitlist_entries_status_created_at_idx" ON "waitlist_entries"("status", "created_at" DESC);

-- CreateIndex
CREATE INDEX "waitlist_entries_referred_by_idx" ON "waitlist_entries"("referred_by");

-- CreateIndex
CREATE INDEX "waitlist_entries_referral_count_created_at_idx" ON "waitlist_entries"("referral_count", "created_at" DESC);

-- CreateIndex
CREATE INDEX "tasks_tenant_id_status_created_at_idx" ON "tasks"("tenant_id", "status", "created_at" DESC);

-- CreateIndex
CREATE INDEX "tasks_tenant_id_type_created_at_idx" ON "tasks"("tenant_id", "type", "created_at" DESC);

-- CreateIndex
CREATE INDEX "tasks_tenant_id_updated_at_idx" ON "tasks"("tenant_id", "updated_at" DESC);

-- CreateIndex
CREATE UNIQUE INDEX "tasks_tenant_id_idempotency_key_key" ON "tasks"("tenant_id", "idempotency_key");

-- CreateIndex
CREATE INDEX "uploads_tenant_id_status_created_at_idx" ON "uploads"("tenant_id", "status", "created_at" DESC);

-- CreateIndex
CREATE INDEX "uploads_tenant_id_updated_at_idx" ON "uploads"("tenant_id", "updated_at" DESC);

-- CreateIndex
CREATE UNIQUE INDEX "oauth_clients_client_id_key" ON "oauth_clients"("client_id");

-- CreateIndex
CREATE INDEX "oauth_clients_tenant_id_idx" ON "oauth_clients"("tenant_id");

-- CreateIndex
CREATE INDEX "oauth_clients_status_idx" ON "oauth_clients"("status");

-- CreateIndex
CREATE INDEX "oauth_authorizations_user_id_idx" ON "oauth_authorizations"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "oauth_authorizations_user_id_client_id_key" ON "oauth_authorizations"("user_id", "client_id");

-- CreateIndex
CREATE UNIQUE INDEX "oauth_access_tokens_token_hash_key" ON "oauth_access_tokens"("token_hash");

-- CreateIndex
CREATE INDEX "oauth_access_tokens_client_id_idx" ON "oauth_access_tokens"("client_id");

-- CreateIndex
CREATE INDEX "oauth_access_tokens_user_id_idx" ON "oauth_access_tokens"("user_id");

-- CreateIndex
CREATE INDEX "oauth_access_tokens_expires_at_idx" ON "oauth_access_tokens"("expires_at");

-- CreateIndex
CREATE UNIQUE INDEX "auth_users_email_key" ON "auth_users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "auth_users_phone_key" ON "auth_users"("phone");

-- CreateIndex
CREATE INDEX "chat_sessions_tenant_id_last_message_at_idx" ON "chat_sessions"("tenant_id", "last_message_at" DESC);

-- CreateIndex
CREATE INDEX "chat_sessions_user_id_last_message_at_idx" ON "chat_sessions"("user_id", "last_message_at" DESC);

-- CreateIndex
CREATE INDEX "threads_tenant_id_last_activity_at_idx" ON "threads"("tenant_id", "last_activity_at" DESC);

-- CreateIndex
CREATE INDEX "threads_user_id_last_activity_at_idx" ON "threads"("user_id", "last_activity_at" DESC);

-- CreateIndex
CREATE UNIQUE INDEX "user_profiles_user_id_key" ON "user_profiles"("user_id");

-- CreateIndex
CREATE INDEX "user_profiles_user_id_idx" ON "user_profiles"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "skills_slug_key" ON "skills"("slug");

-- CreateIndex
CREATE INDEX "skills_is_official_category_idx" ON "skills"("is_official", "category");

-- CreateIndex
CREATE INDEX "user_skills_user_id_enabled_idx" ON "user_skills"("user_id", "enabled");

-- CreateIndex
CREATE INDEX "user_skills_tenant_id_idx" ON "user_skills"("tenant_id");

-- CreateIndex
CREATE UNIQUE INDEX "user_skills_user_id_skill_id_key" ON "user_skills"("user_id", "skill_id");

-- CreateIndex
CREATE INDEX "connectors_user_id_is_active_last_used_at_idx" ON "connectors"("user_id", "is_active", "last_used_at" DESC);

-- CreateIndex
CREATE INDEX "connectors_tenant_id_idx" ON "connectors"("tenant_id");

-- CreateIndex
CREATE UNIQUE INDEX "cofounder_profiles_tenant_id_key" ON "cofounder_profiles"("tenant_id");

-- CreateIndex
CREATE INDEX "cofounder_profiles_is_active_arena_idx" ON "cofounder_profiles"("is_active", "arena");

-- CreateIndex
CREATE INDEX "cofounder_interests_to_profile_id_kind_idx" ON "cofounder_interests"("to_profile_id", "kind");

-- CreateIndex
CREATE UNIQUE INDEX "cofounder_interests_from_profile_id_to_profile_id_key" ON "cofounder_interests"("from_profile_id", "to_profile_id");

-- CreateIndex
CREATE UNIQUE INDEX "access_invite_codes_code_hash_key" ON "access_invite_codes"("code_hash");

-- CreateIndex
CREATE INDEX "access_invite_codes_issued_by_user_id_status_created_at_idx" ON "access_invite_codes"("issued_by_user_id", "status", "created_at" DESC);

-- CreateIndex
CREATE INDEX "access_invite_codes_tenant_id_status_idx" ON "access_invite_codes"("tenant_id", "status");

-- CreateIndex
CREATE INDEX "access_invite_codes_code_prefix_idx" ON "access_invite_codes"("code_prefix");

-- CreateIndex
CREATE INDEX "access_invite_redemptions_user_id_redeemed_at_idx" ON "access_invite_redemptions"("user_id", "redeemed_at" DESC);

-- CreateIndex
CREATE INDEX "access_invite_redemptions_tenant_id_redeemed_at_idx" ON "access_invite_redemptions"("tenant_id", "redeemed_at" DESC);

-- CreateIndex
CREATE UNIQUE INDEX "access_invite_redemptions_invite_code_id_user_id_key" ON "access_invite_redemptions"("invite_code_id", "user_id");

-- CreateIndex
CREATE UNIQUE INDEX "referrals_code_key" ON "referrals"("code");

-- CreateIndex
CREATE INDEX "referrals_referrer_user_id_status_created_at_idx" ON "referrals"("referrer_user_id", "status", "created_at" DESC);

-- CreateIndex
CREATE INDEX "referrals_referred_user_id_idx" ON "referrals"("referred_user_id");

-- CreateIndex
CREATE UNIQUE INDEX "redemption_codes_code_key" ON "redemption_codes"("code");

-- CreateIndex
CREATE INDEX "redemption_codes_campaign_name_created_at_idx" ON "redemption_codes"("campaign_name", "created_at" DESC);

-- CreateIndex
CREATE INDEX "code_redemptions_user_id_redeemed_at_idx" ON "code_redemptions"("user_id", "redeemed_at" DESC);

-- CreateIndex
CREATE INDEX "code_redemptions_tenant_id_idx" ON "code_redemptions"("tenant_id");

-- CreateIndex
CREATE UNIQUE INDEX "code_redemptions_code_id_user_id_key" ON "code_redemptions"("code_id", "user_id");

-- CreateIndex
CREATE INDEX "feedback_reports_tenant_id_created_at_idx" ON "feedback_reports"("tenant_id", "created_at" DESC);

-- CreateIndex
CREATE INDEX "feedback_reports_resolved_created_at_idx" ON "feedback_reports"("resolved", "created_at" DESC);

-- CreateIndex
CREATE INDEX "auth_accounts_user_id_idx" ON "auth_accounts"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "auth_accounts_provider_id_account_id_key" ON "auth_accounts"("provider_id", "account_id");

-- CreateIndex
CREATE UNIQUE INDEX "auth_sessions_token_key" ON "auth_sessions"("token");

-- CreateIndex
CREATE INDEX "auth_sessions_user_id_idx" ON "auth_sessions"("user_id");

-- CreateIndex
CREATE INDEX "auth_sessions_token_idx" ON "auth_sessions"("token");

-- CreateIndex
CREATE INDEX "auth_sessions_active_organization_id_idx" ON "auth_sessions"("active_organization_id");

-- CreateIndex
CREATE UNIQUE INDEX "desktop_auth_handoffs_token_hash_key" ON "desktop_auth_handoffs"("token_hash");

-- CreateIndex
CREATE INDEX "desktop_auth_handoffs_user_id_created_at_idx" ON "desktop_auth_handoffs"("user_id", "created_at" DESC);

-- CreateIndex
CREATE INDEX "desktop_auth_handoffs_scheme_state_idx" ON "desktop_auth_handoffs"("scheme", "state");

-- CreateIndex
CREATE INDEX "desktop_auth_handoffs_expires_at_idx" ON "desktop_auth_handoffs"("expires_at");

-- CreateIndex
CREATE UNIQUE INDEX "desktop_auth_sessions_token_hash_key" ON "desktop_auth_sessions"("token_hash");

-- CreateIndex
CREATE UNIQUE INDEX "desktop_auth_sessions_handoff_id_key" ON "desktop_auth_sessions"("handoff_id");

-- CreateIndex
CREATE INDEX "desktop_auth_sessions_user_id_revoked_at_expires_at_idx" ON "desktop_auth_sessions"("user_id", "revoked_at", "expires_at");

-- CreateIndex
CREATE INDEX "desktop_auth_sessions_scheme_created_at_idx" ON "desktop_auth_sessions"("scheme", "created_at" DESC);

-- CreateIndex
CREATE INDEX "desktop_auth_sessions_expires_at_idx" ON "desktop_auth_sessions"("expires_at");

-- CreateIndex
CREATE UNIQUE INDEX "auth_verifications_identifier_value_key" ON "auth_verifications"("identifier", "value");

-- CreateIndex
CREATE UNIQUE INDEX "community_profiles_user_id_key" ON "community_profiles"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "licenses_license_key_key" ON "licenses"("license_key");

-- CreateIndex
CREATE UNIQUE INDEX "sleptons_member_profiles_member_number_key" ON "sleptons_member_profiles"("member_number");

-- CreateIndex
CREATE UNIQUE INDEX "sleptons_member_profiles_user_id_key" ON "sleptons_member_profiles"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "sleptons_member_profiles_license_id_key" ON "sleptons_member_profiles"("license_id");

-- CreateIndex
CREATE UNIQUE INDEX "sleptons_member_profiles_slug_key" ON "sleptons_member_profiles"("slug");

-- CreateIndex
CREATE INDEX "sleptons_member_profiles_tier_is_public_idx" ON "sleptons_member_profiles"("tier", "is_public");

-- CreateIndex
CREATE INDEX "sleptons_member_profiles_created_at_idx" ON "sleptons_member_profiles"("created_at");

-- CreateIndex
CREATE INDEX "sleptons_products_member_id_idx" ON "sleptons_products"("member_id");

-- CreateIndex
CREATE INDEX "sleptons_products_is_featured_featured_week_idx" ON "sleptons_products"("is_featured", "featured_week");

-- CreateIndex
CREATE UNIQUE INDEX "sleptons_resumes_member_id_key" ON "sleptons_resumes"("member_id");

-- CreateIndex
CREATE INDEX "sleptons_resumes_is_public_completeness_idx" ON "sleptons_resumes"("is_public", "completeness");

-- CreateIndex
CREATE UNIQUE INDEX "organization_slug_key" ON "better_auth"."organization"("slug");

-- CreateIndex
CREATE INDEX "member_organization_id_idx" ON "better_auth"."member"("organization_id");

-- CreateIndex
CREATE UNIQUE INDEX "member_user_id_organization_id_key" ON "better_auth"."member"("user_id", "organization_id");

-- CreateIndex
CREATE INDEX "invitation_email_idx" ON "better_auth"."invitation"("email");

-- CreateIndex
CREATE UNIQUE INDEX "passkey_credential_i_d_key" ON "better_auth"."passkey"("credential_i_d");

-- CreateIndex
CREATE INDEX "passkey_user_id_idx" ON "better_auth"."passkey"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "auth_device_codes_device_code_key" ON "auth_device_codes"("device_code");

-- CreateIndex
CREATE UNIQUE INDEX "auth_device_codes_user_code_key" ON "auth_device_codes"("user_code");

-- CreateIndex
CREATE INDEX "auth_device_codes_user_id_idx" ON "auth_device_codes"("user_id");

-- CreateIndex
CREATE INDEX "auth_device_codes_expires_at_idx" ON "auth_device_codes"("expires_at");

-- CreateIndex
CREATE INDEX "atelier_canvas_tenant_id_updated_at_idx" ON "atelier_canvas"("tenant_id", "updated_at");

-- CreateIndex
CREATE UNIQUE INDEX "atelier_canvas_tenant_id_id_key" ON "atelier_canvas"("tenant_id", "id");

-- CreateIndex
CREATE INDEX "agent_rollout_lines_tenant_id_thread_id_seq_idx" ON "agent_rollout_lines"("tenant_id", "thread_id", "seq");

-- CreateIndex
CREATE UNIQUE INDEX "agent_rollout_lines_tenant_id_thread_id_seq_key" ON "agent_rollout_lines"("tenant_id", "thread_id", "seq");

-- CreateIndex
CREATE UNIQUE INDEX "pebble_diagnostic_tickets_bundle_submission_id_key" ON "pebble_diagnostic_tickets"("bundle_submission_id");

-- CreateIndex
CREATE INDEX "pebble_diagnostic_tickets_status_expires_at_idx" ON "pebble_diagnostic_tickets"("status", "expires_at");

-- CreateIndex
CREATE UNIQUE INDEX "pebble_feedback_submission_id_key" ON "pebble_feedback"("submission_id");

-- CreateIndex
CREATE INDEX "pebble_feedback_kind_created_at_idx" ON "pebble_feedback"("kind", "created_at" DESC);

-- CreateIndex
CREATE INDEX "platform_staff_role_revoked_at_idx" ON "platform_staff"("role", "revoked_at");

-- AddForeignKey
ALTER TABLE "tenants" ADD CONSTRAINT "tenants_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tenants" ADD CONSTRAINT "tenants_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tenant_transfer_journals" ADD CONSTRAINT "tenant_transfer_journals_from_tenant_id_fkey" FOREIGN KEY ("from_tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tenant_transfer_journals" ADD CONSTRAINT "tenant_transfer_journals_to_tenant_id_fkey" FOREIGN KEY ("to_tenant_id") REFERENCES "tenants"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "api_keys" ADD CONSTRAINT "api_keys_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "organization_members" ADD CONSTRAINT "organization_members_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "organization_members" ADD CONSTRAINT "organization_members_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "contents" ADD CONSTRAINT "contents_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "contents" ADD CONSTRAINT "contents_author_id_fkey" FOREIGN KEY ("author_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "content_translations" ADD CONSTRAINT "content_translations_content_id_fkey" FOREIGN KEY ("content_id") REFERENCES "contents"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "content_embeddings" ADD CONSTRAINT "content_embeddings_content_id_fkey" FOREIGN KEY ("content_id") REFERENCES "contents"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "products" ADD CONSTRAINT "products_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "orders" ADD CONSTRAINT "orders_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "orders" ADD CONSTRAINT "orders_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "order_items" ADD CONSTRAINT "order_items_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "order_items" ADD CONSTRAINT "order_items_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "integrations" ADD CONSTRAINT "integrations_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tenant_provider_keys" ADD CONSTRAINT "tenant_provider_keys_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "automations" ADD CONSTRAINT "automations_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "automation_runs" ADD CONSTRAINT "automation_runs_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "automation_runs" ADD CONSTRAINT "automation_runs_automation_id_fkey" FOREIGN KEY ("automation_id") REFERENCES "automations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "para_projects" ADD CONSTRAINT "para_projects_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "para_workspaces" ADD CONSTRAINT "para_workspaces_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "para_workspaces" ADD CONSTRAINT "para_workspaces_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "para_projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "para_assets" ADD CONSTRAINT "para_assets_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "para_threads" ADD CONSTRAINT "para_threads_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "para_threads" ADD CONSTRAINT "para_threads_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "para_projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "para_runs" ADD CONSTRAINT "para_runs_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "para_runs" ADD CONSTRAINT "para_runs_thread_id_fkey" FOREIGN KEY ("thread_id") REFERENCES "para_threads"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "para_approvals" ADD CONSTRAINT "para_approvals_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "para_approvals" ADD CONSTRAINT "para_approvals_run_id_fkey" FOREIGN KEY ("run_id") REFERENCES "para_runs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "workflow_definitions" ADD CONSTRAINT "workflow_definitions_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "workflow_runs" ADD CONSTRAINT "workflow_runs_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "workflow_runs" ADD CONSTRAINT "workflow_runs_workflow_id_fkey" FOREIGN KEY ("workflow_id") REFERENCES "workflow_definitions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ai_request_logs" ADD CONSTRAINT "ai_request_logs_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pricing_plans" ADD CONSTRAINT "pricing_plans_base_plan_id_fkey" FOREIGN KEY ("base_plan_id") REFERENCES "pricing_plans"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "plan_features" ADD CONSTRAINT "plan_features_plan_id_fkey" FOREIGN KEY ("plan_id") REFERENCES "pricing_plans"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "plan_features" ADD CONSTRAINT "plan_features_feature_id_fkey" FOREIGN KEY ("feature_id") REFERENCES "feature_definitions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "plan_usage_limits" ADD CONSTRAINT "plan_usage_limits_plan_id_fkey" FOREIGN KEY ("plan_id") REFERENCES "pricing_plans"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "plan_usage_limits" ADD CONSTRAINT "plan_usage_limits_limit_id_fkey" FOREIGN KEY ("limit_id") REFERENCES "usage_limit_definitions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "customer_plan_versions" ADD CONSTRAINT "customer_plan_versions_plan_id_fkey" FOREIGN KEY ("plan_id") REFERENCES "pricing_plans"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "customer_plan_versions" ADD CONSTRAINT "customer_plan_versions_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "customer_feature_overrides" ADD CONSTRAINT "customer_feature_overrides_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "customer_usage_limits" ADD CONSTRAINT "customer_usage_limits_limit_id_fkey" FOREIGN KEY ("limit_id") REFERENCES "usage_limit_definitions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "customer_usage_limits" ADD CONSTRAINT "customer_usage_limits_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "subscriptions" ADD CONSTRAINT "subscriptions_pricing_plan_id_fkey" FOREIGN KEY ("pricing_plan_id") REFERENCES "pricing_plans"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "subscriptions" ADD CONSTRAINT "subscriptions_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_subscription_id_fkey" FOREIGN KEY ("subscription_id") REFERENCES "subscriptions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invoice_items" ADD CONSTRAINT "invoice_items_invoice_id_fkey" FOREIGN KEY ("invoice_id") REFERENCES "invoices"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invoice_items" ADD CONSTRAINT "invoice_items_pricing_plan_id_fkey" FOREIGN KEY ("pricing_plan_id") REFERENCES "pricing_plans"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payments" ADD CONSTRAINT "payments_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payments" ADD CONSTRAINT "payments_invoice_id_fkey" FOREIGN KEY ("invoice_id") REFERENCES "invoices"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payments" ADD CONSTRAINT "payments_payment_method_id_fkey" FOREIGN KEY ("payment_method_id") REFERENCES "payment_methods"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payment_methods" ADD CONSTRAINT "payment_methods_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "usage_ledger_entries" ADD CONSTRAINT "usage_ledger_entries_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "usage_ledger_entries" ADD CONSTRAINT "usage_ledger_entries_subscription_id_fkey" FOREIGN KEY ("subscription_id") REFERENCES "subscriptions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "credit_balances" ADD CONSTRAINT "credit_balances_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "credit_transactions" ADD CONSTRAINT "credit_transactions_credit_balance_id_fkey" FOREIGN KEY ("credit_balance_id") REFERENCES "credit_balances"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "router_reservations" ADD CONSTRAINT "router_reservations_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stripe_customers" ADD CONSTRAINT "stripe_customers_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_consents" ADD CONSTRAINT "user_consents_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_consents" ADD CONSTRAINT "user_consents_document_id_fkey" FOREIGN KEY ("document_id") REFERENCES "legal_documents"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "uploads" ADD CONSTRAINT "uploads_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "oauth_clients" ADD CONSTRAINT "oauth_clients_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "oauth_authorizations" ADD CONSTRAINT "oauth_authorizations_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "oauth_authorizations" ADD CONSTRAINT "oauth_authorizations_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "oauth_clients"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "oauth_access_tokens" ADD CONSTRAINT "oauth_access_tokens_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "oauth_clients"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "chat_sessions" ADD CONSTRAINT "chat_sessions_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "chat_sessions" ADD CONSTRAINT "chat_sessions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth_users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "threads" ADD CONSTRAINT "threads_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "threads" ADD CONSTRAINT "threads_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_skills" ADD CONSTRAINT "user_skills_skill_id_fkey" FOREIGN KEY ("skill_id") REFERENCES "skills"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_skills" ADD CONSTRAINT "user_skills_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "connectors" ADD CONSTRAINT "connectors_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cofounder_profiles" ADD CONSTRAINT "cofounder_profiles_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cofounder_interests" ADD CONSTRAINT "cofounder_interests_from_profile_id_fkey" FOREIGN KEY ("from_profile_id") REFERENCES "cofounder_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cofounder_interests" ADD CONSTRAINT "cofounder_interests_to_profile_id_fkey" FOREIGN KEY ("to_profile_id") REFERENCES "cofounder_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "access_invite_redemptions" ADD CONSTRAINT "access_invite_redemptions_invite_code_id_fkey" FOREIGN KEY ("invite_code_id") REFERENCES "access_invite_codes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "code_redemptions" ADD CONSTRAINT "code_redemptions_code_id_fkey" FOREIGN KEY ("code_id") REFERENCES "redemption_codes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "code_redemptions" ADD CONSTRAINT "code_redemptions_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "feedback_reports" ADD CONSTRAINT "feedback_reports_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "auth_accounts" ADD CONSTRAINT "auth_accounts_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth_users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "auth_sessions" ADD CONSTRAINT "auth_sessions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth_users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "desktop_auth_handoffs" ADD CONSTRAINT "desktop_auth_handoffs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth_users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "desktop_auth_sessions" ADD CONSTRAINT "desktop_auth_sessions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth_users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "desktop_auth_sessions" ADD CONSTRAINT "desktop_auth_sessions_handoff_id_fkey" FOREIGN KEY ("handoff_id") REFERENCES "desktop_auth_handoffs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sleptons_member_profiles" ADD CONSTRAINT "sleptons_member_profiles_license_id_fkey" FOREIGN KEY ("license_id") REFERENCES "licenses"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sleptons_products" ADD CONSTRAINT "sleptons_products_member_id_fkey" FOREIGN KEY ("member_id") REFERENCES "sleptons_member_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sleptons_upvotes" ADD CONSTRAINT "sleptons_upvotes_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "sleptons_products"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sleptons_connections" ADD CONSTRAINT "sleptons_connections_follower_id_fkey" FOREIGN KEY ("follower_id") REFERENCES "sleptons_member_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sleptons_connections" ADD CONSTRAINT "sleptons_connections_following_id_fkey" FOREIGN KEY ("following_id") REFERENCES "sleptons_member_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sleptons_resumes" ADD CONSTRAINT "sleptons_resumes_member_id_fkey" FOREIGN KEY ("member_id") REFERENCES "sleptons_member_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "better_auth"."member" ADD CONSTRAINT "member_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth_users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "better_auth"."member" ADD CONSTRAINT "member_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "better_auth"."organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "better_auth"."invitation" ADD CONSTRAINT "invitation_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "better_auth"."organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "better_auth"."passkey" ADD CONSTRAINT "passkey_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth_users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "auth_device_codes" ADD CONSTRAINT "auth_device_codes_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth_users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "atelier_canvas" ADD CONSTRAINT "atelier_canvas_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "platform_staff" ADD CONSTRAINT "platform_staff_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;


-- Not expressible in schema.prisma --------------------------------------------

ALTER TABLE "public"."retention_policies"
  ADD CONSTRAINT "retention_policies_keep_days_check" CHECK ("keep_days" > 0);

INSERT INTO "public"."retention_policies" ("table_name", "keep_days", "time_column", "note") VALUES
  ('audit_logs',            365, 'created_at',  'Compliance evidence — do not shorten without a compliance review'),
  ('ai_request_logs',        90, 'created_at',  'Debugging and abuse investigation; usage totals live in metering'),
  ('webhook_events',         30, 'created_at',  'Delivery attempts; redelivery windows are far shorter'),
  ('usage_ledger_entries',  400, 'occurred_at', 'Billing evidence — must outlive the longest dispute window'),
  ('auth_sessions',           7, 'expires_at',  'Purge on expiry, not creation — an expired session is dead weight immediately'),
  ('desktop_auth_sessions',   7, 'expires_at',  'Same'),
  ('automation_runs',        90, 'created_at',  'Run history'),
  ('workflow_runs',          90, 'created_at',  'Run history')
ON CONFLICT ("table_name") DO NOTHING;
