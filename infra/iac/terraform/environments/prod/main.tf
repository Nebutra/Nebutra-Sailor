# ============================================================
# Nebutra-Sailor – Production Environment
# ============================================================
# Select the cloud provider by setting var.cloud_provider to one of:
#   vercel | aws | aliyun | tencent
#
# Usage:
#   terraform init -backend-config=backend.hcl
#   terraform plan  -var="cloud_provider=aws"
#   terraform apply -var="cloud_provider=aws"
# ============================================================

terraform {
  required_version = ">= 1.5.0"

  required_providers {
    # ── AWS ────────────────────────────────────────────────
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
    # ── Alibaba Cloud ───────────────────────────────────────
    alicloud = {
      source  = "aliyun/alicloud"
      version = "~> 1.200"
    }
    # ── Tencent Cloud ───────────────────────────────────────
    tencentcloud = {
      source  = "tencentcloudstack/tencentcloud"
      version = "~> 1.81"
    }
    # ── Vercel (legacy / preview deployments) ───────────────
    vercel = {
      source  = "vercel/vercel"
      version = "~> 1.0"
    }
  }

  # ── Remote state ─────────────────────────────────────────
  # Uncomment the block matching your chosen cloud provider.
  # Only one backend block may be active at a time.

  # AWS S3 backend
  # backend "s3" {
  #   bucket         = "nebutra-terraform-state-prod"
  #   key            = "sailor/prod/terraform.tfstate"
  #   region         = "us-east-1"
  #   encrypt        = true
  #   dynamodb_table = "nebutra-terraform-locks"
  # }

  # Alibaba Cloud OSS backend
  # backend "oss" {
  #   bucket              = "nebutra-terraform-state-prod"
  #   prefix              = "sailor/prod"
  #   region              = "cn-hangzhou"
  #   tablestore_endpoint = "https://nebutra-locks.cn-hangzhou.ots.aliyuncs.com"
  #   tablestore_table    = "terraform_locks"
  # }

  # Tencent Cloud COS backend
  # backend "cos" {
  #   bucket = "nebutra-terraform-state-prod-1234567890"
  #   region = "ap-guangzhou"
  #   prefix = "sailor/prod"
  # }
}

# ============================================================
# Variables
# ============================================================

variable "cloud_provider" {
  description = "Target cloud provider: vercel | aws | aliyun | tencent"
  type        = string
  default     = "aws"

  validation {
    condition     = contains(["vercel", "aws", "aliyun", "tencent"], var.cloud_provider)
    error_message = "cloud_provider must be one of: vercel, aws, aliyun, tencent."
  }
}

variable "environment" {
  description = "Deployment environment (always prod here, exposed for module reuse)"
  type        = string
  default     = "prod"

  validation {
    condition     = contains(["dev", "staging", "prod"], var.environment)
    error_message = "environment must be dev, staging, or prod."
  }
}

# ── AWS ──────────────────────────────────────────────────────
variable "aws_region" {
  description = "AWS region for the prod deployment"
  type        = string
  default     = "us-east-1"
}

variable "aws_cluster_name" {
  description = "EKS cluster name"
  type        = string
  default     = "nebutra-prod"
}

variable "aws_db_instance_class" {
  description = "RDS instance class"
  type        = string
  default     = "db.t3.medium"
}

variable "aws_redis_node_type" {
  description = "ElastiCache node type"
  type        = string
  default     = "cache.t3.micro"
}

# ── Alibaba Cloud ─────────────────────────────────────────────
variable "aliyun_region" {
  description = "Alibaba Cloud region for the prod deployment"
  type        = string
  default     = "cn-hangzhou"
}

# ── Tencent Cloud ─────────────────────────────────────────────
variable "tencent_region" {
  description = "Tencent Cloud region for the prod deployment"
  type        = string
  default     = "ap-guangzhou"
}

# ── Vercel ────────────────────────────────────────────────────
variable "vercel_api_token" {
  description = "Vercel API token (required when cloud_provider = vercel)"
  type        = string
  default     = ""
  sensitive   = true
}

variable "vercel_team_id" {
  description = "Vercel team ID (optional)"
  type        = string
  default     = null
}

# ============================================================
# Providers – configure only the active provider
# ============================================================

provider "aws" {
  region = var.aws_region
  # Credentials are resolved via the standard AWS credential chain:
  #   AWS_ACCESS_KEY_ID / AWS_SECRET_ACCESS_KEY env vars, or ~/.aws/credentials
}

provider "alicloud" {
  region = var.aliyun_region
  # Credentials: ALICLOUD_ACCESS_KEY / ALICLOUD_SECRET_KEY env vars
}

provider "tencentcloud" {
  region = var.tencent_region
  # Credentials: TENCENTCLOUD_SECRET_ID / TENCENTCLOUD_SECRET_KEY env vars
}

provider "vercel" {
  api_token = var.vercel_api_token
  team      = var.vercel_team_id
}

# ============================================================
# Module selection – only the matching module is activated
# ============================================================

module "aws" {
  source = "../../modules/aws"
  count  = var.cloud_provider == "aws" ? 1 : 0

  environment        = var.environment
  region             = var.aws_region
  cluster_name       = var.aws_cluster_name
  db_instance_class  = var.aws_db_instance_class
  redis_node_type    = var.aws_redis_node_type
}

module "aliyun" {
  source = "../../modules/aliyun"
  count  = var.cloud_provider == "aliyun" ? 1 : 0

  environment = var.environment
  region      = var.aliyun_region
}

module "tencent" {
  source = "../../modules/tencent"
  count  = var.cloud_provider == "tencent" ? 1 : 0

  environment = var.environment
  region      = var.tencent_region
}

# ============================================================
# Outputs (conditionally populated based on active provider)
# ============================================================

output "active_provider" {
  description = "The cloud provider selected for this deployment"
  value       = var.cloud_provider
}

output "aws_outputs" {
  description = "AWS module outputs (empty when provider != aws)"
  value       = length(module.aws) > 0 ? module.aws[0] : null
}

output "aliyun_outputs" {
  description = "Alibaba Cloud module outputs (empty when provider != aliyun)"
  value       = length(module.aliyun) > 0 ? module.aliyun[0] : null
}

output "tencent_outputs" {
  description = "Tencent Cloud module outputs (empty when provider != tencent)"
  value       = length(module.tencent) > 0 ? module.tencent[0] : null
}
