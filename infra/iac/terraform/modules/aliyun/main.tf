# ============================================================
# Nebutra-Sailor – Alibaba Cloud (Aliyun) Infrastructure Module
# ============================================================
# Provisions:
#   • ACR (Alibaba Container Registry) namespace + repositories
#   • ACK (Alibaba Container Service for Kubernetes) managed cluster
#   • RDS for PostgreSQL
#   • KVStore (Tair/Redis)
#   • OSS bucket for asset storage
#   • (Optional/commented) CDN acceleration
# ============================================================

terraform {
  required_providers {
    alicloud = {
      source  = "aliyun/alicloud"
      version = "~> 1.200"
    }
  }
}

# ============================================================
# Variables
# ============================================================

variable "environment" {
  description = "Deployment environment (dev | staging | prod)"
  type        = string
}

variable "region" {
  description = "Alibaba Cloud region"
  type        = string
  default     = "cn-hangzhou"
}

variable "vpc_cidr" {
  description = "CIDR block for the VPC"
  type        = string
  default     = "192.168.0.0/16"
}

variable "k8s_version" {
  description = "Kubernetes version for the ACK managed cluster"
  type        = string
  default     = "1.29.3-aliyun.1"
}

variable "worker_instance_type" {
  description = "ECS instance type for Kubernetes worker nodes"
  type        = string
  default     = "ecs.c6.xlarge"
}

variable "worker_count" {
  description = "Number of worker nodes"
  type        = number
  default     = 2
}

variable "db_instance_class" {
  description = "RDS instance class"
  type        = string
  default     = "rds.pg.c1.large"
}

variable "db_name" {
  description = "Initial PostgreSQL database name"
  type        = string
  default     = "nebutra"
}

variable "db_account" {
  description = "Master RDS account name"
  type        = string
  default     = "nebutra_admin"
  sensitive   = true
}

variable "redis_instance_class" {
  description = "KVStore instance class"
  type        = string
  default     = "redis.master.small.default"
}

# The set of services to create ACR repos for
variable "services" {
  description = "Set of service names for ACR repository creation"
  type        = set(string)
  default = [
    "web",
    "landing-page",
    "api-gateway",
    "ai-service",
  ]
}

# ============================================================
# VPC & vSwitches
# ============================================================

resource "alicloud_vpc" "main" {
  vpc_name   = "nebutra-${var.environment}"
  cidr_block = var.vpc_cidr

  tags = {
    Name        = "nebutra-${var.environment}"
    Environment = var.environment
    ManagedBy   = "terraform"
  }
}

# Two vSwitches across different availability zones for HA
resource "alicloud_vswitch" "main" {
  count        = 2
  vpc_id       = alicloud_vpc.main.id
  cidr_block   = cidrsubnet(var.vpc_cidr, 8, count.index)
  zone_id      = data.alicloud_zones.available.zones[count.index].id
  vswitch_name = "nebutra-${var.environment}-vsw-${count.index}"

  tags = {
    Environment = var.environment
  }
}

data "alicloud_zones" "available" {
  available_resource_creation = "VSwitch"
}

# ============================================================
# ACR – Alibaba Container Registry
# ============================================================

# A namespace groups all Nebutra service repositories
resource "alicloud_cr_namespace" "nebutra" {
  name               = "nebutra-${var.environment}"
  auto_create        = false
  default_visibility = "PRIVATE"
}

# One repository per service inside the namespace
resource "alicloud_cr_repo" "services" {
  for_each = var.services

  namespace = alicloud_cr_namespace.nebutra.name
  name      = each.value
  summary   = "Nebutra ${each.value} service – ${var.environment}"
  repo_type = "PRIVATE"
}

# ============================================================
# ACK – Alibaba Container Service for Kubernetes (managed)
# ============================================================

# Resource Access Management role required by ACK
resource "alicloud_ram_role" "ack" {
  name        = "nebutra-${var.environment}-ack-role"
  description = "RAM role for Nebutra ACK cluster – ${var.environment}"
  force       = true

  document = jsonencode({
    Statement = [{
      Action    = "sts:AssumeRole"
      Effect    = "Allow"
      Principal = { Service = ["cs.aliyuncs.com"] }
    }]
    Version = "1"
  })
}

resource "alicloud_ram_role_policy_attachment" "ack_admin" {
  role_name   = alicloud_ram_role.ack.name
  policy_name = "AdministratorAccess"
  policy_type = "System"
}

resource "alicloud_cs_managed_kubernetes" "main" {
  name                  = "nebutra-${var.environment}"
  cluster_spec          = "ack.pro.small"
  version               = var.k8s_version
  vswitch_ids           = alicloud_vswitch.main[*].id
  pod_cidr              = "172.20.0.0/16"
  service_cidr          = "172.21.0.0/20"
  new_nat_gateway       = true
  slb_internet_enabled  = true

  # Worker node pool is managed separately via alicloud_cs_kubernetes_node_pool
  worker_number      = 0
  worker_vswitch_ids = alicloud_vswitch.main[*].id

  # Enable RRSA (RAM Roles for Service Accounts) for pod-level IAM
  enable_rrsa = true

  tags = {
    Environment = var.environment
    ManagedBy   = "terraform"
  }

  depends_on = [alicloud_ram_role_policy_attachment.ack_admin]
}

resource "alicloud_cs_kubernetes_node_pool" "main" {
  cluster_id     = alicloud_cs_managed_kubernetes.main.id
  name           = "nebutra-${var.environment}-nodes"
  vswitch_ids    = alicloud_vswitch.main[*].id
  instance_types = [var.worker_instance_type]
  desired_size   = var.worker_count
  min_size       = 1
  max_size       = 5

  system_disk_category = "cloud_essd"
  system_disk_size     = 100

  tags = {
    Environment = var.environment
  }
}

# ============================================================
# RDS – PostgreSQL
# NOTE: pgvector is not natively available on Alibaba RDS.
#       Consider using PolarDB-PG or self-managed PG on ECS
#       with the pgvector extension installed manually.
# ============================================================

resource "alicloud_db_instance" "postgres" {
  engine           = "PostgreSQL"
  engine_version   = "16.0"
  instance_type    = var.db_instance_class
  instance_storage = 20
  instance_name    = "nebutra-${var.environment}-postgres"
  vswitch_id       = alicloud_vswitch.main[0].id

  tags = {
    Name        = "nebutra-${var.environment}-postgres"
    Environment = var.environment
    ManagedBy   = "terraform"
  }
}

resource "alicloud_db_database" "main" {
  instance_id = alicloud_db_instance.postgres.id
  name        = var.db_name
  character_set = "UTF8"
}

resource "alicloud_rds_account" "admin" {
  db_instance_id   = alicloud_db_instance.postgres.id
  account_name     = var.db_account
  # Password must be supplied at apply time via -var or TF_VAR_db_password
  account_password = var.db_password
  account_type     = "Super"
}

variable "db_password" {
  description = "Master RDS password – supply via TF_VAR_db_password env var"
  type        = string
  sensitive   = true
}

# ============================================================
# KVStore – Redis (Tair)
# ============================================================

resource "alicloud_kvstore_instance" "redis" {
  db_instance_name = "nebutra-${var.environment}-redis"
  instance_class   = var.redis_instance_class
  vswitch_id       = alicloud_vswitch.main[0].id
  engine_version   = "7.0"
  instance_type    = "Redis"
  # Password must be supplied via TF_VAR_redis_password
  password         = var.redis_password

  tags = {
    Name        = "nebutra-${var.environment}-redis"
    Environment = var.environment
    ManagedBy   = "terraform"
  }
}

variable "redis_password" {
  description = "KVStore Redis password – supply via TF_VAR_redis_password env var"
  type        = string
  sensitive   = true
}

# ============================================================
# OSS – Object Storage Service (S3 equivalent)
# ============================================================

resource "alicloud_oss_bucket" "assets" {
  bucket = "nebutra-${var.environment}-assets"
  acl    = "private"

  server_side_encryption_rule {
    sse_algorithm = "AES256"
  }

  versioning {
    status = "Enabled"
  }

  tags = {
    Name        = "nebutra-${var.environment}-assets"
    Environment = var.environment
    ManagedBy   = "terraform"
  }
}

# Block all public access to the OSS bucket
resource "alicloud_oss_bucket_policy" "assets_deny_public" {
  bucket = alicloud_oss_bucket.assets.bucket

  policy = jsonencode({
    Version   = "1"
    Statement = [{
      Effect    = "Deny"
      Principal = ["*"]
      Action    = ["oss:*"]
      Resource  = [
        "acs:oss:*:*:${alicloud_oss_bucket.assets.bucket}",
        "acs:oss:*:*:${alicloud_oss_bucket.assets.bucket}/*",
      ]
      Condition = {
        Bool = { "acs:SecureTransport" = ["false"] }
      }
    }]
  })
}

# ── CDN (optional) ──────────────────────────────────────────
# Uncomment to enable Alibaba Cloud CDN in front of the OSS bucket.
# Requires the CDN service to be enabled on the account.
#
# resource "alicloud_cdn_domain_new" "assets" {
#   domain_name = "assets.nebutra.${var.environment}.example.com"
#   cdn_type    = "web"
#   scope       = "overseas"
#
#   sources {
#     content  = alicloud_oss_bucket.assets.bucket_domain_name
#     type     = "oss"
#     priority = 20
#     port     = 80
#     weight   = 15
#   }
# }

# ============================================================
# Outputs
# ============================================================

output "acr_registry_url" {
  description = "ACR registry endpoint for the Nebutra namespace"
  value       = "registry.${var.region}.aliyuncs.com/${alicloud_cr_namespace.nebutra.name}"
}

output "acr_repository_urls" {
  description = "Map of service name → full ACR repository URL"
  value = {
    for k, v in alicloud_cr_repo.services :
    k => "registry.${var.region}.aliyuncs.com/${alicloud_cr_namespace.nebutra.name}/${v.name}"
  }
}

output "ack_cluster_id" {
  description = "ACK managed cluster ID"
  value       = alicloud_cs_managed_kubernetes.main.id
}

output "ack_cluster_name" {
  description = "ACK managed cluster name"
  value       = alicloud_cs_managed_kubernetes.main.name
}

output "rds_connection_string" {
  description = "RDS PostgreSQL connection endpoint"
  value       = alicloud_db_instance.postgres.connection_string
}

output "rds_port" {
  description = "RDS PostgreSQL port"
  value       = alicloud_db_instance.postgres.port
}

output "redis_connection_string" {
  description = "KVStore Redis connection domain"
  value       = alicloud_kvstore_instance.redis.connection_domain
}

output "redis_port" {
  description = "KVStore Redis port"
  value       = alicloud_kvstore_instance.redis.port
}

output "oss_bucket_name" {
  description = "OSS bucket name for asset storage"
  value       = alicloud_oss_bucket.assets.bucket
}

output "oss_bucket_domain" {
  description = "OSS bucket public endpoint"
  value       = alicloud_oss_bucket.assets.bucket_domain_name
}

output "vpc_id" {
  description = "VPC ID"
  value       = alicloud_vpc.main.id
}
