# =============================================================================
# Root module outputs — surfaced after `terraform apply`.
# Reference in CI with: terraform output -raw <name>
# =============================================================================

# ── Environment ───────────────────────────────────────────────────────────────

output "environment" {
  description = "Active deployment environment."
  value       = var.environment
}

# ── Vercel ────────────────────────────────────────────────────────────────────

output "vercel_web_url" {
  description = "Production URL of the dashboard app."
  value       = try(vercel_project.web.id != "" ? "https://${var.vercel_project_web}.vercel.app" : null, null)
}

output "vercel_landing_url" {
  description = "Production URL of the landing page."
  value       = try(vercel_project.landing.id != "" ? "https://${var.vercel_project_landing}.vercel.app" : null, null)
}

# ── Config summary (non-sensitive) ────────────────────────────────────────────

output "config_summary" {
  description = "Non-sensitive runtime configuration snapshot for documentation/CI."
  value = {
    environment  = var.environment
    region       = var.region
    email_from   = var.email_from
  }
}
