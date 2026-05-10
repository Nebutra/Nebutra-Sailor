# =============================================================================
# Root module variables — extracted from main.tf for clean module composition.
# Pass values via terraform.tfvars (git-ignored) or CI env vars.
# =============================================================================

# ── Environment ───────────────────────────────────────────────────────────────

variable "environment" {
  description = "Deployment environment (dev | staging | prod)."
  type        = string
  default     = "dev"

  validation {
    condition     = contains(["dev", "staging", "prod"], var.environment)
    error_message = "Must be one of: dev, staging, prod."
  }
}

variable "region" {
  description = "Primary cloud region."
  type        = string
  default     = "us-east-1"
}

# ── Vercel ────────────────────────────────────────────────────────────────────

variable "vercel_api_token" {
  description = "Vercel API token (sensitive)."
  type        = string
  sensitive   = true
}

variable "vercel_team_id" {
  description = "Vercel team/org slug. Null for personal accounts."
  type        = string
  default     = null
}

variable "vercel_project_web" {
  description = "Vercel project name for the dashboard (apps/web)."
  type        = string
  default     = "nebutra-web"
}

variable "vercel_project_landing" {
  description = "Vercel project name for the landing page (apps/landing-page)."
  type        = string
  default     = "nebutra-landing"
}

# ── Database ──────────────────────────────────────────────────────────────────

variable "database_url" {
  description = "Supabase / Postgres connection string (with pooler for Prisma)."
  type        = string
  sensitive   = true
  default     = null
}

variable "database_direct_url" {
  description = "Direct Postgres URL (bypasses PgBouncer — used by Prisma migrations)."
  type        = string
  sensitive   = true
  default     = null
}

# ── Cache ─────────────────────────────────────────────────────────────────────

variable "upstash_redis_rest_url" {
  description = "Upstash Redis REST URL."
  type        = string
  sensitive   = true
  default     = null
}

variable "upstash_redis_rest_token" {
  description = "Upstash Redis REST token."
  type        = string
  sensitive   = true
  default     = null
}

# ── Auth ──────────────────────────────────────────────────────────────────────

variable "clerk_secret_key" {
  description = "Clerk backend secret key (sk_live_…)."
  type        = string
  sensitive   = true
  default     = null
}

variable "clerk_publishable_key" {
  description = "Clerk publishable key (pk_live_…)."
  type        = string
  default     = null
}

variable "clerk_webhook_secret" {
  description = "Clerk webhook signing secret."
  type        = string
  sensitive   = true
  default     = null
}

# ── AI ────────────────────────────────────────────────────────────────────────

variable "openai_api_key" {
  description = "OpenAI API key."
  type        = string
  sensitive   = true
  default     = null
}

variable "anthropic_api_key" {
  description = "Anthropic API key."
  type        = string
  sensitive   = true
  default     = null
}

# ── Billing ───────────────────────────────────────────────────────────────────

variable "stripe_secret_key" {
  description = "Stripe secret key (sk_live_…)."
  type        = string
  sensitive   = true
  default     = null
}

variable "stripe_webhook_secret" {
  description = "Stripe webhook signing secret."
  type        = string
  sensitive   = true
  default     = null
}

# ── Observability ─────────────────────────────────────────────────────────────

variable "sentry_dsn" {
  description = "Sentry DSN for server-side error tracking."
  type        = string
  default     = null
}

variable "sentry_auth_token" {
  description = "Sentry auth token for source map uploads in CI."
  type        = string
  sensitive   = true
  default     = null
}

# ── Email ─────────────────────────────────────────────────────────────────────

variable "resend_api_key" {
  description = "Resend API key for transactional email."
  type        = string
  sensitive   = true
  default     = null
}

variable "email_from" {
  description = "Sender address for transactional emails."
  type        = string
  default     = "noreply@nebutra.ai"
}

# ── Background jobs ───────────────────────────────────────────────────────────

variable "inngest_event_key" {
  description = "Inngest event key for sending events."
  type        = string
  sensitive   = true
  default     = null
}

variable "inngest_signing_key" {
  description = "Inngest signing key for verifying webhook requests."
  type        = string
  sensitive   = true
  default     = null
}

# ── Admin ─────────────────────────────────────────────────────────────────────

variable "admin_api_key" {
  description = "32+ char secret for /api/v1/admin endpoints."
  type        = string
  sensitive   = true
  default     = null

  validation {
    condition     = var.admin_api_key == null || length(var.admin_api_key) >= 32
    error_message = "admin_api_key must be at least 32 characters."
  }
}
