# ============================================================
# Nebutra-Sailor - Google Cloud Infrastructure Module
# ============================================================
# Provisions:
#   - Artifact Registry Docker repository for Nebutra service images
#
# This module is intentionally narrow. It creates the registry contract first so
# CI/CD can publish the same images to GHCR, AWS ECR, or GCP Artifact Registry
# without committing to a compute migration yet.
# ============================================================

terraform {
  required_providers {
    google = {
      source  = "hashicorp/google"
      version = "~> 6.0"
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

variable "project_id" {
  description = "Google Cloud project ID"
  type        = string
}

variable "region" {
  description = "Google Cloud region"
  type        = string
  default     = "us-central1"
}

variable "artifact_repository" {
  description = "Artifact Registry Docker repository ID"
  type        = string
  default     = "nebutra"
}

variable "services" {
  description = "Map of service name to default image tag for image URL outputs"
  type        = map(string)
  default = {
    "web"          = "latest"
    "landing-page" = "latest"
    "api-gateway"  = "latest"
    "ai"           = "latest"
  }
}

# ============================================================
# Artifact Registry
# ============================================================

locals {
  labels = {
    environment = var.environment
    managed_by  = "terraform"
    project     = "nebutra-sailor"
  }
}

resource "google_artifact_registry_repository" "containers" {
  project       = var.project_id
  location      = var.region
  repository_id = var.artifact_repository
  format        = "DOCKER"
  description   = "Nebutra Sailor container images for ${var.environment}"
  labels        = local.labels
}

# ============================================================
# Outputs
# ============================================================

output "artifact_registry_host" {
  description = "Docker registry host for the configured Artifact Registry region"
  value       = "${var.region}-docker.pkg.dev"
}

output "artifact_registry_repository" {
  description = "Artifact Registry repository resource name"
  value       = google_artifact_registry_repository.containers.name
}

output "artifact_registry_image_urls" {
  description = "Canonical image URL prefixes for Nebutra service images"
  value = {
    for service, _ in var.services :
    service => "${var.region}-docker.pkg.dev/${var.project_id}/${google_artifact_registry_repository.containers.repository_id}/nebutra-${service}"
  }
}
