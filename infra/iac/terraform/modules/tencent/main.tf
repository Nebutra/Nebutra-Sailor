# ============================================================
# Nebutra-Sailor – Tencent Cloud Infrastructure Module
# ============================================================
# Provisions:
#   • TCR (Tencent Container Registry) instance, namespace
#   • TKE (Tencent Kubernetes Engine) managed cluster
#   • TencentDB for PostgreSQL
#   • TencentDB for Redis
#   • COS bucket for asset storage
#   • (Optional/commented) CDN acceleration
# ============================================================

terraform {
  required_providers {
    tencentcloud = {
      source  = "tencentcloudstack/tencentcloud"
      version = "~> 1.81"
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
  description = "Tencent Cloud region"
  type        = string
  default     = "ap-guangzhou"
}

variable "vpc_cidr" {
  description = "CIDR block for the VPC"
  type        = string
  default     = "10.0.0.0/16"
}

variable "k8s_version" {
  description = "Kubernetes version for the TKE managed cluster"
  type        = string
  default     = "1.28.3"
}

variable "worker_instance_type" {
  description = "CVM instance type for Kubernetes worker nodes"
  type        = string
  default     = "S5.XLARGE8"
}

variable "worker_count" {
  description = "Number of worker nodes"
  type        = number
  default     = 2
}

variable "db_instance_type" {
  description = "TencentDB for PostgreSQL instance specification"
  type        = string
  default     = "2C4G"
}

variable "db_name" {
  description = "Initial PostgreSQL database name"
  type        = string
  default     = "nebutra"
}

variable "db_username" {
  description = "Master PostgreSQL username"
  type        = string
  default     = "nebutra_admin"
  sensitive   = true
}

variable "db_password" {
  description = "Master PostgreSQL password – supply via TF_VAR_db_password env var"
  type        = string
  sensitive   = true
}

variable "redis_type" {
  description = "Redis instance type: 2 = standard master-replica"
  type        = number
  default     = 2
}

variable "redis_password" {
  description = "Redis auth password – supply via TF_VAR_redis_password env var"
  type        = string
  sensitive   = true
}

variable "cos_bucket_suffix" {
  description = "Tencent Cloud account AppID appended to COS bucket name (required by COS naming rules)"
  type        = string
  # Set via TF_VAR_cos_bucket_suffix or terraform.tfvars
}

# The set of services to create TCR repos for
variable "services" {
  description = "Set of service names for TCR repository creation"
  type        = set(string)
  default = [
    "web",
    "landing-page",
    "api-gateway",
    "ai-service",
  ]
}

# ============================================================
# VPC & Subnets
# ============================================================

resource "tencentcloud_vpc" "main" {
  name       = "nebutra-${var.environment}"
  cidr_block = var.vpc_cidr

  tags = {
    Environment = var.environment
    ManagedBy   = "terraform"
  }
}

resource "tencentcloud_subnet" "main" {
  count             = 2
  vpc_id            = tencentcloud_vpc.main.id
  name              = "nebutra-${var.environment}-subnet-${count.index}"
  cidr_block        = cidrsubnet(var.vpc_cidr, 8, count.index)
  availability_zone = data.tencentcloud_availability_zones_by_product.k8s.zones[count.index].name

  tags = {
    Environment = var.environment
  }
}

data "tencentcloud_availability_zones_by_product" "k8s" {
  product = "cvm"
}

# ============================================================
# TCR – Tencent Container Registry
# ============================================================

# A premium TCR instance (supports geo-replication and fine-grained access)
resource "tencentcloud_tcr_instance" "nebutra" {
  name          = "nebutra-${var.environment}"
  # "Premium" supports geo-replication; use "Basic" or "Standard" for cost savings
  instance_type = "Premium"
  delete_bucket = true

  tags = {
    Environment = var.environment
    ManagedBy   = "terraform"
  }
}

# A namespace inside the TCR instance groups all service repos
resource "tencentcloud_tcr_namespace" "nebutra" {
  instance_id    = tencentcloud_tcr_instance.nebutra.id
  name           = "nebutra-${var.environment}"
  is_public      = false
  is_auto_scan   = true
  is_prevent_vul = true
}

# One repository per service
resource "tencentcloud_tcr_repository" "services" {
  for_each = var.services

  instance_id    = tencentcloud_tcr_instance.nebutra.id
  namespace_name = tencentcloud_tcr_namespace.nebutra.name
  name           = each.value
  brief_desc     = "Nebutra ${each.value} service – ${var.environment}"
  description    = "Container image repository for the ${each.value} service in the ${var.environment} environment."
}

# ============================================================
# TKE – Tencent Kubernetes Engine (managed cluster)
# ============================================================

resource "tencentcloud_kubernetes_cluster" "main" {
  cluster_name           = "nebutra-${var.environment}"
  cluster_version        = var.k8s_version
  cluster_cidr           = "172.16.0.0/16"
  cluster_max_pod_num    = 256
  cluster_desc           = "Nebutra ${var.environment} cluster"
  cluster_internet       = true   # Enable public apiserver endpoint
  cluster_intranet       = true   # Enable private VPC endpoint
  cluster_intranet_subnet_id = tencentcloud_subnet.main[0].id
  vpc_id                 = tencentcloud_vpc.main.id

  # Container network type: GR (GlobalRouter) or VPC-CNI
  network_type = "GR"

  # Cluster-level service account OIDC for fine-grained CAM roles (similar to IRSA on AWS)
  # Requires enabling the feature on the cluster after creation via the console.

  tags = {
    Environment = var.environment
    ManagedBy   = "terraform"
  }
}

# Managed node pool attached to the TKE cluster
resource "tencentcloud_kubernetes_node_pool" "main" {
  cluster_id         = tencentcloud_kubernetes_cluster.main.id
  name               = "nebutra-${var.environment}-nodes"
  vpc_id             = tencentcloud_vpc.main.id
  subnet_ids         = tencentcloud_subnet.main[*].id
  max_size           = 5
  min_size           = 1
  desired_capacity   = var.worker_count
  enable_auto_scale  = true

  auto_scaling_config {
    instance_type      = var.worker_instance_type
    system_disk_type   = "CLOUD_PREMIUM"
    system_disk_size   = 100
    internet_max_bandwidth_out = 0
    # Spot instances can reduce cost; set instance_charge_type = "SPOTPAID" for non-prod
    instance_charge_type = "POSTPAID_BY_HOUR"
  }

  labels = {
    environment = var.environment
  }
}

# ============================================================
# TencentDB for PostgreSQL
# NOTE: pgvector support depends on the PostgreSQL version and plugin list.
#       Enable the "vector" plugin in the console after instance creation.
# ============================================================

resource "tencentcloud_postgresql_instance" "main" {
  name              = "nebutra-${var.environment}-postgres"
  availability_zone = data.tencentcloud_availability_zones_by_product.k8s.zones[0].name
  charge_type       = "POSTPAID_BY_HOUR"
  vpc_id            = tencentcloud_vpc.main.id
  subnet_id         = tencentcloud_subnet.main[0].id
  engine_version    = "16.0"
  db_major_version  = "16"
  db_kernel_version = "v16.0_r1.0"
  root_user         = var.db_username
  root_password     = var.db_password
  memory            = 4096  # MB
  storage           = 50    # GB
  project_id        = 0

  tags = {
    Name        = "nebutra-${var.environment}-postgres"
    Environment = var.environment
    ManagedBy   = "terraform"
  }
}

# ============================================================
# TencentDB for Redis
# ============================================================

resource "tencentcloud_redis_instance" "main" {
  name               = "nebutra-${var.environment}-redis"
  availability_zone  = data.tencentcloud_availability_zones_by_product.k8s.zones[0].name
  type_id            = var.redis_type
  password           = var.redis_password
  mem_size           = 1024   # MB
  redis_replicas_num = 1
  redis_shard_num    = 1
  vpc_id             = tencentcloud_vpc.main.id
  subnet_id          = tencentcloud_subnet.main[0].id

  tags = {
    Name        = "nebutra-${var.environment}-redis"
    Environment = var.environment
    ManagedBy   = "terraform"
  }
}

# ============================================================
# COS – Cloud Object Storage (S3 equivalent)
# COS bucket names must be globally unique and follow the pattern:
#   <name>-<AppID>
# ============================================================

resource "tencentcloud_cos_bucket" "assets" {
  # bucket name must include your Tencent Cloud AppID as suffix
  bucket = "nebutra-${var.environment}-assets-${var.cos_bucket_suffix}"
  acl    = "private"

  # Server-side encryption
  encryption_algorithm = "AES256"

  versioning_enable = true

  tags = {
    Name        = "nebutra-${var.environment}-assets"
    Environment = var.environment
    ManagedBy   = "terraform"
  }
}

# Block public access via a bucket policy
resource "tencentcloud_cos_bucket_policy" "assets_deny_public" {
  bucket = tencentcloud_cos_bucket.assets.bucket

  policy = jsonencode({
    version = "2.0"
    Statement = [{
      Effect    = "Deny"
      Principal = { qcs = ["qcs::cam::anyone:anyone"] }
      Action    = ["name/cos:*"]
      Resource  = [
        "qcs::cos:${var.region}:uid/${var.cos_bucket_suffix}:${tencentcloud_cos_bucket.assets.bucket}/*",
      ]
      Condition = {
        Bool = { "SecureTransport" = ["false"] }
      }
    }]
  })
}

# ── CDN (optional) ──────────────────────────────────────────
# Uncomment to place Tencent Cloud CDN in front of the COS bucket.
# Requires the CDN service to be enabled on the account.
#
# resource "tencentcloud_cdn_domain" "assets" {
#   domain = "assets.nebutra.${var.environment}.example.com"
#
#   origin {
#     origin_type          = "cos"
#     origin_list          = [tencentcloud_cos_bucket.assets.cos_bucket_url]
#     cos_private_access   = "on"
#   }
#
#   https_config {
#     https_switch       = "on"
#     http2_switch       = "on"
#   }
# }

# ============================================================
# Outputs
# ============================================================

output "tcr_registry_url" {
  description = "TCR instance public domain (used as registry URL)"
  value       = tencentcloud_tcr_instance.nebutra.public_domain
}

output "tcr_repository_urls" {
  description = "Map of service name → full TCR repository URL"
  value = {
    for k, v in tencentcloud_tcr_repository.services :
    k => "${tencentcloud_tcr_instance.nebutra.public_domain}/${tencentcloud_tcr_namespace.nebutra.name}/${v.name}"
  }
}

output "tke_cluster_id" {
  description = "TKE cluster ID"
  value       = tencentcloud_kubernetes_cluster.main.id
}

output "tke_cluster_endpoint" {
  description = "TKE cluster Kubernetes API endpoint (internet)"
  value       = tencentcloud_kubernetes_cluster.main.kube_config_intranet
  sensitive   = true
}

output "db_ip" {
  description = "TencentDB PostgreSQL private IP address"
  value       = tencentcloud_postgresql_instance.main.private_access_ip
}

output "db_port" {
  description = "TencentDB PostgreSQL port"
  value       = tencentcloud_postgresql_instance.main.private_access_port
}

output "redis_ip" {
  description = "TencentDB Redis private IP address"
  value       = tencentcloud_redis_instance.main.ip
}

output "redis_port" {
  description = "TencentDB Redis port"
  value       = tencentcloud_redis_instance.main.port
}

output "cos_bucket_url" {
  description = "COS bucket endpoint URL"
  value       = tencentcloud_cos_bucket.assets.cos_bucket_url
}

output "cos_bucket_name" {
  description = "COS bucket name"
  value       = tencentcloud_cos_bucket.assets.bucket
}

output "vpc_id" {
  description = "VPC ID"
  value       = tencentcloud_vpc.main.id
}
