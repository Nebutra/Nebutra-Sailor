# Infrastructure

Enterprise-grade infrastructure configuration for Nebutra-Sailor.

## Structure

```
infra/
├── cloudflare/         # CDN, WAF, R2 storage, Edge rules
│   ├── wrangler.toml   # Wrangler CLI config
│   ├── r2/             # R2 bucket configs
│   └── rules/          # Cache & WAF rules
├── database/           # Database configs (RLS policies)
├── terraform/          # Cloud infrastructure as code
│   ├── main.tf
│   ├── modules/        # Reusable modules
│   └── environments/   # Environment-specific vars
├── k8s/                # Kubernetes manifests (Kustomize)
│   ├── base/           # Base resources
│   └── overlays/       # Environment overlays
├── inngest/            # Background job workflows
├── pusher/             # Real-time communication (Pusher/Soketi)
├── observability/      # Monitoring, logging, tracing
├── openstatus/         # Uptime monitoring
└── scripts/            # Deployment & maintenance scripts
```

## Quick Start

### Database

```bash
# Apply Prisma migrations
pnpm db:migrate

# Apply RLS policies
psql $DATABASE_URL -f infra/data/database/policies/rls.sql
```

### Terraform

```bash
cd infra/iac/terraform

# Initialize
terraform init

# Plan changes
terraform plan -var-file="environments/dev/terraform.tfvars"

# Apply
terraform apply -var-file="environments/dev/terraform.tfvars"
```

### Kubernetes

```bash
# Preview manifests
kubectl kustomize infra/iac/k8s/overlays/prod

# Apply
kubectl apply -k infra/iac/k8s/overlays/prod
```

## Environments

| Environment | Purpose                | Database             | Deploy      |
| ----------- | ---------------------- | -------------------- | ----------- |
| `dev`       | Local development      | Supabase (free tier) | Manual      |
| `staging`   | Pre-production testing | Supabase (pro)       | PR merge    |
| `prod`      | Production             | Supabase/RDS         | Release tag |

## Security Notes

- Never commit `.tfvars` files with secrets
- Use environment variables or secret managers
- RLS policies provide database-level tenant isolation
- Service role bypasses RLS (use only in backend services)
