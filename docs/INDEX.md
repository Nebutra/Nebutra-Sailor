# Documentation Index

Complete navigation to all project documentation.

## Apps

| Name                                           | Description                 |
| ---------------------------------------------- | --------------------------- |
| [landing-page](../apps/landing-page/README.md) | Marketing site with AI i18n |
| [web](../apps/web/README.md)                   | Main SaaS dashboard         |

## Services

> Language policy: TypeScript-by-default for new backend work.
> Python services exist only when batch/ML/specialized libs justify them
> (see [ADR 2026-05-10](architecture/2026-05-10-ts-by-default-python-only-when-justified.md)).

### TypeScript

| Service                                                | Description                              |
| ------------------------------------------------------ | ---------------------------------------- |
| [gateway](../backends/gateway/README.md)               | BFF: auth, tenancy, rate-limit, routing  |

### Python — active

| Service                                              | Port | Description                             |
| ---------------------------------------------------- | ---- | --------------------------------------- |
| [ai](../backends/python/ai/README.md)                | 8001 | Batch translation, embeddings, generation |
| [ecommerce](../backends/python/ecommerce/README.md)  | 8004 | Shopify/Shopline sync                   |
| [event-ingest](../backends/python/event-ingest/README.md) | 8008 | High-throughput event ingestion       |

## Packages

| Package                                              | Description                   |
| ---------------------------------------------------- | ----------------------------- |
| [ai-providers](../packages/ai/ai-providers/README.md)   | AI provider abstractions      |
| [alerting](../packages/platform/alerting/README.md)           | Alert management              |
| [analytics](../packages/platform/analytics/README.md)         | Dub-powered link analytics    |
| [audit](../packages/iam/audit/README.md)                 | Audit logging                 |
| [brand](../packages/design/brand/README.md)                 | White-label customization     |
| [cache](../packages/integrations/cache/README.md)                 | Redis caching strategies      |
| [captcha](../packages/iam/captcha/README.md)             | CAPTCHA verification          |
| [config](../packages/platform/config/README.md)               | Shared configuration          |
| [marketing](../packages/commerce/marketing/README.md)         | Conversion-optimized marketing UI  |
| [db](../packages/platform/db/README.md)                       | Prisma schema and client      |
| [errors](../packages/platform/errors/README.md)               | Error handling                |
| [event-bus](../packages/integrations/event-bus/README.md)         | Cross-service events          |
| [feature-flags](../packages/platform/feature-flags/README.md) | Feature flag management       |
| [health](../packages/platform/health/README.md)               | Health check utilities        |
| [mcp](../packages/ai/mcp/README.md)                     | Model Context Protocol        |
| [rate-limit](../packages/platform/rate-limit/README.md)       | Multi-tenant rate limiting    |
| [saga](../packages/integrations/saga/README.md)                   | Distributed transactions      |
| [sanity](../packages/ops/sanity/README.md)               | Sanity CMS integration        |
| [status](../packages/platform/status/README.md)               | Status page utilities         |
| [storage](../packages/integrations/storage/README.md)             | File storage abstraction      |
| [supabase](../packages/ops/supabase/README.md)           | Realtime, Storage, Edge Funcs |
| [ui](../packages/design/ui/README.md)                       | Shared UI components          |

## Infrastructure

> Layout follows the W3a single-responsibility split: `iac/` (declarative infra), `runtime/` (containers/proxies), `data/` (databases/warehouses), `ops/` (observability/scripts).

| Component                                                 | Description                          |
| --------------------------------------------------------- | ------------------------------------ |
| [infra](../infra/README.md)                               | Infrastructure overview              |
| [iac/cloudflare](../infra/iac/cloudflare/README.md)       | Cloudflare configuration             |
| [iac/cloudflare/r2](../infra/iac/cloudflare/r2/README.md) | R2 object storage                    |
| [iac/k8s](../infra/iac/k8s/README.md)                     | Kubernetes manifests                 |
| [iac/railway](../infra/iac/railway/README.md)             | Railway deployment                   |
| [iac/terraform](../infra/iac/terraform/README.md)         | IaC definitions                      |
| [runtime/docker](../infra/runtime/docker/README.md)       | Docker base images & compose configs |
| [runtime/nginx](../infra/runtime/nginx/README.md)         | Nginx reverse proxy                  |
| [runtime/analytics](../infra/runtime/analytics/README.md) | Analytics runtime stack              |
| [data/database](../infra/data/database/README.md)         | Database (RLS policies, etc.)        |
| [data/clickhouse](../infra/data/clickhouse/README.md)     | ClickHouse warehouse + dbt models    |
| [ops/observability](../infra/ops/observability/README.md) | Logging, tracing, metrics            |

## Workflows

| Component                                 | Description                          |
| ----------------------------------------- | ------------------------------------ |
| [workflows](../workflows/README.md)       | Event-driven workflow overview       |
| [inngest](../workflows/inngest/README.md) | Background job workflows (Inngest)   |
| [n8n](../workflows/n8n/README.md)         | No-code workflow automation          |
| [pusher](../workflows/pusher/README.md)   | Realtime fan-out                     |

## Design System

| Document                                                  | Description                      |
| --------------------------------------------------------- | -------------------------------- |
| [UI Guidelines](./UI-GUIDELINES.md)                       | Design tokens, styles, usage     |
| [Typography](./TYPOGRAPHY.md)                             | Font stacks, type scale, loading |
| [Component Library Policy](./COMPONENT-LIBRARY-POLICY.md) | External component governance    |
| [Marketing Infrastructure](./MARKETING-INFRASTRUCTURE.md) | Landing page & marketing spec    |

## External Resources

| Resource     | URL                                        | Description                                            |
| ------------ | ------------------------------------------ | ------------------------------------------------------ |
| SVGL         | [svgl.app](https://svgl.app)               | 300+ MIT-licensed tech SVG logos (dark/light variants) |
| Simple Icons | [simpleicons.org](https://simpleicons.org) | Fallback icon CDN                                      |
| Primer       | [primer.style](https://primer.style)       | GitHub's design system (foundation)                    |

## Other

| Document                            | Description          |
| ----------------------------------- | -------------------- |
| [DOMAINS](./DOMAINS.md)             | Domain configuration |
| [changelog](../changelog/README.md) | Version history      |
| [Alibaba Cloud ECS](./阿里云ECS部署指南.md) | ECS deployment guide |
