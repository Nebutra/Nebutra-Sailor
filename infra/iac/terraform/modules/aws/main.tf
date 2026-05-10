# ============================================================
# Nebutra-Sailor – AWS Infrastructure Module
# ============================================================
# Provisions:
#   • ECR repositories for all Nebutra services
#   • EKS cluster (via community eks module)
#   • RDS PostgreSQL (pgvector-compatible instance)
#   • ElastiCache Redis
#   • S3 bucket for asset storage
#   • CloudFront distribution in front of the S3 bucket
# ============================================================

terraform {
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
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
  description = "AWS region"
  type        = string
  default     = "us-east-1"
}

variable "cluster_name" {
  description = "EKS cluster name"
  type        = string
  default     = "nebutra"
}

variable "cluster_version" {
  description = "Kubernetes version for the EKS cluster"
  type        = string
  default     = "1.29"
}

variable "db_instance_class" {
  description = "RDS instance type"
  type        = string
  default     = "db.t3.medium"
}

variable "db_name" {
  description = "Initial database name"
  type        = string
  default     = "nebutra"
}

variable "db_username" {
  description = "Master DB username"
  type        = string
  default     = "nebutra_admin"
  sensitive   = true
}

variable "redis_node_type" {
  description = "ElastiCache node type"
  type        = string
  default     = "cache.t3.micro"
}

variable "redis_num_cache_nodes" {
  description = "Number of ElastiCache nodes"
  type        = number
  default     = 1
}

variable "vpc_cidr" {
  description = "CIDR block for the VPC"
  type        = string
  default     = "10.0.0.0/16"
}

# The set of container images (services) to create ECR repos for
variable "services" {
  description = "Map of service name → image tag for ECR repo creation"
  type        = map(string)
  default = {
    "web"          = "latest"
    "landing-page" = "latest"
    "api-gateway"  = "latest"
    "ai-service"   = "latest"
  }
}

# ============================================================
# Data sources
# ============================================================

data "aws_caller_identity" "current" {}
data "aws_availability_zones" "available" {
  state = "available"
}

# ============================================================
# VPC
# ============================================================

resource "aws_vpc" "main" {
  cidr_block           = var.vpc_cidr
  enable_dns_support   = true
  enable_dns_hostnames = true

  tags = {
    Name        = "nebutra-${var.environment}"
    Environment = var.environment
    ManagedBy   = "terraform"
  }
}

resource "aws_subnet" "private" {
  count             = 2
  vpc_id            = aws_vpc.main.id
  cidr_block        = cidrsubnet(var.vpc_cidr, 8, count.index)
  availability_zone = data.aws_availability_zones.available.names[count.index]

  tags = {
    Name                                                    = "nebutra-${var.environment}-private-${count.index}"
    Environment                                             = var.environment
    "kubernetes.io/cluster/nebutra-${var.environment}"      = "owned"
    "kubernetes.io/role/internal-elb"                       = "1"
  }
}

resource "aws_subnet" "public" {
  count                   = 2
  vpc_id                  = aws_vpc.main.id
  cidr_block              = cidrsubnet(var.vpc_cidr, 8, count.index + 10)
  availability_zone       = data.aws_availability_zones.available.names[count.index]
  map_public_ip_on_launch = true

  tags = {
    Name                                                    = "nebutra-${var.environment}-public-${count.index}"
    Environment                                             = var.environment
    "kubernetes.io/cluster/nebutra-${var.environment}"      = "owned"
    "kubernetes.io/role/elb"                                = "1"
  }
}

resource "aws_internet_gateway" "main" {
  vpc_id = aws_vpc.main.id

  tags = {
    Name        = "nebutra-${var.environment}-igw"
    Environment = var.environment
  }
}

resource "aws_eip" "nat" {
  count  = 1
  domain = "vpc"

  tags = {
    Name        = "nebutra-${var.environment}-nat-eip"
    Environment = var.environment
  }
}

resource "aws_nat_gateway" "main" {
  allocation_id = aws_eip.nat[0].id
  subnet_id     = aws_subnet.public[0].id

  tags = {
    Name        = "nebutra-${var.environment}-nat"
    Environment = var.environment
  }

  depends_on = [aws_internet_gateway.main]
}

resource "aws_route_table" "private" {
  vpc_id = aws_vpc.main.id

  route {
    cidr_block     = "0.0.0.0/0"
    nat_gateway_id = aws_nat_gateway.main.id
  }

  tags = {
    Name        = "nebutra-${var.environment}-private-rt"
    Environment = var.environment
  }
}

resource "aws_route_table_association" "private" {
  count          = length(aws_subnet.private)
  subnet_id      = aws_subnet.private[count.index].id
  route_table_id = aws_route_table.private.id
}

resource "aws_route_table" "public" {
  vpc_id = aws_vpc.main.id

  route {
    cidr_block = "0.0.0.0/0"
    gateway_id = aws_internet_gateway.main.id
  }

  tags = {
    Name        = "nebutra-${var.environment}-public-rt"
    Environment = var.environment
  }
}

resource "aws_route_table_association" "public" {
  count          = length(aws_subnet.public)
  subnet_id      = aws_subnet.public[count.index].id
  route_table_id = aws_route_table.public.id
}

# ============================================================
# ECR – one repository per service
# ============================================================

resource "aws_ecr_repository" "services" {
  for_each = var.services

  name                 = "nebutra-${var.environment}/${each.key}"
  image_tag_mutability = "MUTABLE"

  image_scanning_configuration {
    scan_on_push = true
  }

  encryption_configuration {
    encryption_type = "AES256"
  }

  tags = {
    Name        = "nebutra-${var.environment}-${each.key}"
    Service     = each.key
    Environment = var.environment
    ManagedBy   = "terraform"
  }
}

# Lifecycle policy: keep the last 10 tagged images and expire untagged ones
resource "aws_ecr_lifecycle_policy" "services" {
  for_each   = aws_ecr_repository.services
  repository = each.value.name

  policy = jsonencode({
    rules = [
      {
        rulePriority = 1
        description  = "Keep last 10 tagged images"
        selection = {
          tagStatus   = "tagged"
          tagPrefixList = ["v"]
          countType   = "imageCountMoreThan"
          countNumber = 10
        }
        action = { type = "expire" }
      },
      {
        rulePriority = 2
        description  = "Expire untagged images after 7 days"
        selection = {
          tagStatus   = "untagged"
          countType   = "sinceImagePushed"
          countUnit   = "days"
          countNumber = 7
        }
        action = { type = "expire" }
      }
    ]
  })
}

# ============================================================
# EKS – Kubernetes cluster
# ============================================================

# IAM role for the EKS control plane
resource "aws_iam_role" "eks_cluster" {
  name = "nebutra-${var.environment}-eks-cluster"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Action    = "sts:AssumeRole"
      Effect    = "Allow"
      Principal = { Service = "eks.amazonaws.com" }
    }]
  })

  tags = {
    Environment = var.environment
  }
}

resource "aws_iam_role_policy_attachment" "eks_cluster_policy" {
  role       = aws_iam_role.eks_cluster.name
  policy_arn = "arn:aws:iam::aws:policy/AmazonEKSClusterPolicy"
}

resource "aws_eks_cluster" "main" {
  name     = "${var.cluster_name}-${var.environment}"
  role_arn = aws_iam_role.eks_cluster.arn
  version  = var.cluster_version

  vpc_config {
    subnet_ids              = concat(aws_subnet.private[*].id, aws_subnet.public[*].id)
    endpoint_private_access = true
    endpoint_public_access  = true
  }

  # Enable envelope encryption for secrets at rest
  encryption_config {
    resources = ["secrets"]
    provider {
      key_arn = aws_kms_key.eks.arn
    }
  }

  tags = {
    Name        = "${var.cluster_name}-${var.environment}"
    Environment = var.environment
    ManagedBy   = "terraform"
  }

  depends_on = [aws_iam_role_policy_attachment.eks_cluster_policy]
}

resource "aws_kms_key" "eks" {
  description             = "KMS key for EKS secrets encryption – nebutra-${var.environment}"
  deletion_window_in_days = 7

  tags = {
    Environment = var.environment
  }
}

# Managed node group
resource "aws_iam_role" "eks_nodes" {
  name = "nebutra-${var.environment}-eks-nodes"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Action    = "sts:AssumeRole"
      Effect    = "Allow"
      Principal = { Service = "ec2.amazonaws.com" }
    }]
  })
}

resource "aws_iam_role_policy_attachment" "eks_worker_node_policy" {
  role       = aws_iam_role.eks_nodes.name
  policy_arn = "arn:aws:iam::aws:policy/AmazonEKSWorkerNodePolicy"
}

resource "aws_iam_role_policy_attachment" "eks_cni_policy" {
  role       = aws_iam_role.eks_nodes.name
  policy_arn = "arn:aws:iam::aws:policy/AmazonEKS_CNI_Policy"
}

resource "aws_iam_role_policy_attachment" "eks_ecr_read_only" {
  role       = aws_iam_role.eks_nodes.name
  policy_arn = "arn:aws:iam::aws:policy/AmazonEC2ContainerRegistryReadOnly"
}

resource "aws_eks_node_group" "main" {
  cluster_name    = aws_eks_cluster.main.name
  node_group_name = "nebutra-${var.environment}-nodes"
  node_role_arn   = aws_iam_role.eks_nodes.arn
  subnet_ids      = aws_subnet.private[*].id

  instance_types = ["t3.medium"]

  scaling_config {
    desired_size = 2
    max_size     = 5
    min_size     = 1
  }

  update_config {
    max_unavailable = 1
  }

  tags = {
    Environment = var.environment
  }

  depends_on = [
    aws_iam_role_policy_attachment.eks_worker_node_policy,
    aws_iam_role_policy_attachment.eks_cni_policy,
    aws_iam_role_policy_attachment.eks_ecr_read_only,
  ]
}

# ============================================================
# RDS PostgreSQL
# NOTE: pgvector extension must be installed post-provision via:
#   psql -c "CREATE EXTENSION IF NOT EXISTS vector;"
# ============================================================

resource "aws_db_subnet_group" "main" {
  name        = "nebutra-${var.environment}"
  subnet_ids  = aws_subnet.private[*].id
  description = "Subnet group for Nebutra RDS – ${var.environment}"

  tags = {
    Environment = var.environment
  }
}

resource "aws_security_group" "rds" {
  name        = "nebutra-${var.environment}-rds"
  description = "Allow PostgreSQL access from within the VPC"
  vpc_id      = aws_vpc.main.id

  ingress {
    from_port   = 5432
    to_port     = 5432
    protocol    = "tcp"
    cidr_blocks = [var.vpc_cidr]
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = {
    Name        = "nebutra-${var.environment}-rds-sg"
    Environment = var.environment
  }
}

resource "aws_db_instance" "postgres" {
  identifier        = "nebutra-${var.environment}"
  engine            = "postgres"
  # PostgreSQL 16 supports pgvector via the extension mechanism
  engine_version    = "16.3"
  instance_class    = var.db_instance_class
  allocated_storage = 20
  storage_encrypted = true

  db_name  = var.db_name
  username = var.db_username
  # Password must be supplied via TF_VAR_db_password env var – never hardcoded
  manage_master_user_password = true

  db_subnet_group_name   = aws_db_subnet_group.main.name
  vpc_security_group_ids = [aws_security_group.rds.id]

  backup_retention_period = 7
  skip_final_snapshot     = var.environment != "prod"
  deletion_protection     = var.environment == "prod"

  tags = {
    Name        = "nebutra-${var.environment}-postgres"
    Environment = var.environment
    ManagedBy   = "terraform"
  }
}

# ============================================================
# ElastiCache Redis
# ============================================================

resource "aws_security_group" "redis" {
  name        = "nebutra-${var.environment}-redis"
  description = "Allow Redis access from within the VPC"
  vpc_id      = aws_vpc.main.id

  ingress {
    from_port   = 6379
    to_port     = 6379
    protocol    = "tcp"
    cidr_blocks = [var.vpc_cidr]
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = {
    Name        = "nebutra-${var.environment}-redis-sg"
    Environment = var.environment
  }
}

resource "aws_elasticache_subnet_group" "main" {
  name        = "nebutra-${var.environment}"
  subnet_ids  = aws_subnet.private[*].id
  description = "Subnet group for Nebutra ElastiCache – ${var.environment}"
}

resource "aws_elasticache_cluster" "redis" {
  cluster_id           = "nebutra-${var.environment}"
  engine               = "redis"
  node_type            = var.redis_node_type
  num_cache_nodes      = var.redis_num_cache_nodes
  parameter_group_name = "default.redis7"
  engine_version       = "7.0"
  port                 = 6379
  subnet_group_name    = aws_elasticache_subnet_group.main.name
  security_group_ids   = [aws_security_group.redis.id]

  tags = {
    Name        = "nebutra-${var.environment}-redis"
    Environment = var.environment
    ManagedBy   = "terraform"
  }
}

# ============================================================
# S3 – Asset storage
# ============================================================

resource "aws_s3_bucket" "assets" {
  bucket = "nebutra-${var.environment}-assets-${data.aws_caller_identity.current.account_id}"

  tags = {
    Name        = "nebutra-${var.environment}-assets"
    Environment = var.environment
    ManagedBy   = "terraform"
  }
}

resource "aws_s3_bucket_versioning" "assets" {
  bucket = aws_s3_bucket.assets.id

  versioning_configuration {
    status = "Enabled"
  }
}

resource "aws_s3_bucket_server_side_encryption_configuration" "assets" {
  bucket = aws_s3_bucket.assets.id

  rule {
    apply_server_side_encryption_by_default {
      sse_algorithm = "AES256"
    }
  }
}

resource "aws_s3_bucket_public_access_block" "assets" {
  bucket                  = aws_s3_bucket.assets.id
  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

# ============================================================
# CloudFront – CDN in front of S3
# ============================================================

resource "aws_cloudfront_origin_access_control" "assets" {
  name                              = "nebutra-${var.environment}-assets-oac"
  description                       = "OAC for Nebutra assets bucket – ${var.environment}"
  origin_access_control_origin_type = "s3"
  signing_behavior                  = "always"
  signing_protocol                  = "sigv4"
}

resource "aws_cloudfront_distribution" "assets" {
  enabled             = true
  is_ipv6_enabled     = true
  comment             = "Nebutra ${var.environment} assets CDN"
  default_root_object = "index.html"

  origin {
    domain_name              = aws_s3_bucket.assets.bucket_regional_domain_name
    origin_id                = "s3-assets"
    origin_access_control_id = aws_cloudfront_origin_access_control.assets.id
  }

  default_cache_behavior {
    allowed_methods        = ["GET", "HEAD"]
    cached_methods         = ["GET", "HEAD"]
    target_origin_id       = "s3-assets"
    viewer_protocol_policy = "redirect-to-https"
    compress               = true

    forwarded_values {
      query_string = false
      cookies {
        forward = "none"
      }
    }

    min_ttl     = 0
    default_ttl = 86400
    max_ttl     = 31536000
  }

  restrictions {
    geo_restriction {
      restriction_type = "none"
    }
  }

  viewer_certificate {
    cloudfront_default_certificate = true
  }

  tags = {
    Name        = "nebutra-${var.environment}-cdn"
    Environment = var.environment
    ManagedBy   = "terraform"
  }
}

# S3 bucket policy – allow CloudFront OAC to read objects
data "aws_iam_policy_document" "assets_bucket_policy" {
  statement {
    sid    = "AllowCloudFrontServicePrincipal"
    effect = "Allow"

    principals {
      type        = "Service"
      identifiers = ["cloudfront.amazonaws.com"]
    }

    actions   = ["s3:GetObject"]
    resources = ["${aws_s3_bucket.assets.arn}/*"]

    condition {
      test     = "StringEquals"
      variable = "AWS:SourceArn"
      values   = [aws_cloudfront_distribution.assets.arn]
    }
  }
}

resource "aws_s3_bucket_policy" "assets" {
  bucket = aws_s3_bucket.assets.id
  policy = data.aws_iam_policy_document.assets_bucket_policy.json
}

# ============================================================
# Outputs
# ============================================================

output "ecr_registry_url" {
  description = "ECR registry base URL (without repo name)"
  value       = "${data.aws_caller_identity.current.account_id}.dkr.ecr.${var.region}.amazonaws.com"
}

output "ecr_repository_urls" {
  description = "Map of service name → full ECR repository URL"
  value       = { for k, v in aws_ecr_repository.services : k => v.repository_url }
}

output "eks_cluster_name" {
  description = "EKS cluster name"
  value       = aws_eks_cluster.main.name
}

output "eks_cluster_endpoint" {
  description = "EKS API server endpoint"
  value       = aws_eks_cluster.main.endpoint
}

output "eks_cluster_certificate_authority" {
  description = "EKS cluster CA certificate (base64)"
  value       = aws_eks_cluster.main.certificate_authority[0].data
  sensitive   = true
}

output "rds_endpoint" {
  description = "RDS PostgreSQL connection endpoint"
  value       = aws_db_instance.postgres.endpoint
}

output "rds_port" {
  description = "RDS PostgreSQL port"
  value       = aws_db_instance.postgres.port
}

output "redis_endpoint" {
  description = "ElastiCache Redis primary endpoint"
  value       = aws_elasticache_cluster.redis.cache_nodes[0].address
}

output "redis_port" {
  description = "ElastiCache Redis port"
  value       = aws_elasticache_cluster.redis.port
}

output "assets_bucket_name" {
  description = "S3 assets bucket name"
  value       = aws_s3_bucket.assets.bucket
}

output "cdn_domain" {
  description = "CloudFront distribution domain name"
  value       = aws_cloudfront_distribution.assets.domain_name
}

output "vpc_id" {
  description = "VPC ID"
  value       = aws_vpc.main.id
}
