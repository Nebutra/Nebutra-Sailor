# =============================================================================
# Nebutra-Sailor — Terraform root module
#
# Variables  → variables.tf
# Outputs    → outputs.tf
# Modules    → modules/aws, modules/aliyun, modules/tencent
# State      → S3 (us-east-1) with DynamoDB locking  (see backend.tf)
# =============================================================================

terraform {
  required_version = ">= 1.9.0"

  required_providers {
    vercel = {
      source  = "vercel/vercel"
      version = "~> 2.0"
    }
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
    random = {
      source  = "hashicorp/random"
      version = "~> 3.6"
    }
  }
}

# ── Providers ────────────────────────────────────────────────────────────────

provider "vercel" {
  api_token = var.vercel_api_token
  team      = var.vercel_team_id
}

provider "aws" {
  region = var.region

  default_tags {
    tags = {
      Project     = "nebutra-sailor"
      Environment = var.environment
      ManagedBy   = "terraform"
    }
  }
}

# ── Vercel projects ──────────────────────────────────────────────────────────

resource "vercel_project" "web" {
  name      = var.vercel_project_web
  framework = "nextjs"

  git_repository = {
    type = "github"
    repo = "nebutra/nebutra-sailor"
  }

  root_directory         = "apps/web"
  build_command          = "cd ../.. && pnpm turbo build --filter=@nebutra/web"
  output_directory       = ".next"
  install_command        = "pnpm install --frozen-lockfile"

  serverless_function_region = "iad1"
}

resource "vercel_project" "landing" {
  name      = var.vercel_project_landing
  framework = "nextjs"

  git_repository = {
    type = "github"
    repo = "nebutra/nebutra-sailor"
  }

  root_directory         = "apps/landing-page"
  build_command          = "cd ../.. && pnpm turbo build --filter=@nebutra/landing-page"
  output_directory       = ".next"
  install_command        = "pnpm install --frozen-lockfile"

  serverless_function_region = "iad1"
}

# ── Vercel environment variables (non-sensitive) ─────────────────────────────

resource "vercel_project_environment_variable" "web_env" {
  for_each = {
    NEXT_PUBLIC_APP_URL         = "https://app.nebutra.ai"
    NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY = var.clerk_publishable_key != null ? var.clerk_publishable_key : ""
    NODE_ENV                    = "production"
  }

  project_id = vercel_project.web.id
  key        = each.key
  value      = each.value
  target     = ["production", "preview"]
}

resource "vercel_project_environment_variable" "web_secrets" {
  for_each = {
    CLERK_SECRET_KEY      = var.clerk_secret_key != null ? var.clerk_secret_key : ""
    DATABASE_URL          = var.database_url != null ? var.database_url : ""
    UPSTASH_REDIS_REST_URL   = var.upstash_redis_rest_url != null ? var.upstash_redis_rest_url : ""
    UPSTASH_REDIS_REST_TOKEN = var.upstash_redis_rest_token != null ? var.upstash_redis_rest_token : ""
    SENTRY_DSN            = var.sentry_dsn != null ? var.sentry_dsn : ""
  }

  project_id = vercel_project.web.id
  key        = each.key
  value      = each.value
  target     = ["production"]
  sensitive  = true
}

# ── AWS infrastructure modules ────────────────────────────────────────────────

# Uncomment once the AWS provider credentials are configured.

# module "aws" {
#   source      = "./modules/aws"
#   environment = var.environment
#   region      = var.region
# }

# ── Aliyun / Tencent (APAC) ──────────────────────────────────────────────────

# module "aliyun" {
#   source      = "./modules/aliyun"
#   environment = var.environment
# }
#
# module "tencent" {
#   source      = "./modules/tencent"
#   environment = var.environment
# }
