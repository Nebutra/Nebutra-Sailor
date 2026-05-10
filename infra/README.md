# Infrastructure

Enterprise-grade infrastructure configuration for Nebutra-Sailor.

## Structure

```
infra/
├── iac/                    # Infrastructure-as-code (cloud resource declarations)
│   ├── terraform/          # Cloud infrastructure (modules + per-env vars)
│   ├── k8s/                # Kubernetes manifests (Kustomize: base + overlays)
│   ├── ecs/                # Aliyun ECS / pm2 ecosystem config
│   ├── cloudflare/         # CDN, WAF, R2 storage, Edge rules
│   └── railway/            # Railway deploy config
├── runtime/                # Runtime/build configuration (containers, web servers)
│   ├── nginx/              # Nginx reverse proxy configs
│   ├── docker/             # Shared Dockerfiles (Python + Node)
│   ├── analytics/          # Self-hosted analytics stack bootstrap
│   └── docker-compose.analytics.yml
├── data/                   # Data layer (schemas, migrations, transforms)
│   ├── database/           # PostgreSQL RLS policies + Prisma migration aids
│   └── clickhouse/         # ClickHouse init SQL + dbt models
└── ops/                    # Operational tooling (monitoring, deployment scripts)
    ├── observability/      # OpenTelemetry, Sentry, Pino logger glue
    └── scripts/            # Deployment & maintenance shell/TS scripts
```

> Event-driven workflow definitions (Inngest / n8n / Pusher) live at the
> top-level [`workflows/`](../workflows/) directory — they are business logic,
> not infrastructure.

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

terraform init
terraform plan -var-file="environments/prod/terraform.tfvars"
terraform apply -var-file="environments/prod/terraform.tfvars"
```

### Kubernetes

```bash
# Preview manifests
kubectl kustomize infra/iac/k8s/overlays/prod

# Apply
kubectl apply -k infra/iac/k8s/overlays/prod
```

### ClickHouse / dbt

```bash
cd infra/data/clickhouse/dbt
dbt run
```

### Analytics stack (PostHog + Umami + Metabase)

```bash
docker compose -f infra/runtime/docker-compose.analytics.yml up -d
```

## Environments

| Environment | Purpose                | Database             | Deploy      |
| ----------- | ---------------------- | -------------------- | ----------- |
| `dev`       | Local development      | Supabase (free tier) | Manual      |
| `staging`   | Pre-production testing | Supabase (pro)       | PR merge    |
| `prod`      | Production             | Supabase / RDS       | Release tag |

## Security Notes

- Never commit `.tfvars` files with secrets
- Use environment variables or secret managers
- RLS policies provide database-level tenant isolation
- Service role bypasses RLS (use only in backend services)
