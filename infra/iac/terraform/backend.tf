# Terraform Remote State Backend
#
# Uses Terraform Cloud (app.terraform.io) as the remote backend.
# This provides:
#   - Remote state storage (no local .tfstate files committed to git)
#   - State locking (prevents concurrent apply conflicts)
#   - Remote plan/apply execution with audit log
#   - Secrets never touch developer machines in production runs
#
# Setup:
#   1. Create a Terraform Cloud org + workspace at https://app.terraform.io
#   2. Set TF_TOKEN_app_terraform_io in CI as an environment variable
#      (Settings → API Tokens → Generate organization token)
#   3. Run: terraform init
#
# Per-environment workspaces are created in the organization via the
# workspace naming convention: nebutra-sailor-<env>
# This matches the backend workspace_tags strategy below.

terraform {
  required_version = ">= 1.9"

  required_providers {
    kubernetes = {
      source  = "hashicorp/kubernetes"
      version = "~> 2.31"
    }
    helm = {
      source  = "hashicorp/helm"
      version = "~> 2.14"
    }
    cloudflare = {
      source  = "cloudflare/cloudflare"
      version = "~> 4.38"
    }
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.60"
    }
    random = {
      source  = "hashicorp/random"
      version = "~> 3.6"
    }
    time = {
      source  = "hashicorp/time"
      version = "~> 0.11"
    }
  }

  # Terraform Cloud remote backend
  # workspace.name is resolved at init time from TF_WORKSPACE env var.
  # CI sets TF_WORKSPACE=nebutra-sailor-prod (or -staging, -dev).
  cloud {
    organization = "nebutra"

    workspaces {
      tags = ["nebutra-sailor"]
    }
  }
}

# ── Provider configuration ─────────────────────────────────────────────────

# Kubernetes provider — kubeconfig injected by CI pipeline
# (KUBE_CONFIG_PATH or KUBE_HOST + KUBE_TOKEN env vars)
provider "kubernetes" {
  host                   = var.k8s_host
  cluster_ca_certificate = base64decode(var.k8s_cluster_ca_certificate)
  token                  = var.k8s_token
}

provider "helm" {
  kubernetes {
    host                   = var.k8s_host
    cluster_ca_certificate = base64decode(var.k8s_cluster_ca_certificate)
    token                  = var.k8s_token
  }
}

provider "cloudflare" {
  api_token = var.cloudflare_api_token
}

provider "aws" {
  region = var.aws_region

  default_tags {
    tags = {
      Project     = "nebutra-sailor"
      Environment = var.environment
      ManagedBy   = "terraform"
    }
  }
}
