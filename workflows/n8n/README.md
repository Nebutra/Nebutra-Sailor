# n8n Workflow Automation

Self-hosted workflow automation platform for Nebutra.

## Overview

n8n serves as the **workflow orchestration layer** for:

- Cross-service automation
- Scheduled tasks (cron replacement)
- Data pipelines
- Event-driven workflows
- Third-party integrations

## Quick Start

### Local Development

```bash
# Start n8n with dependencies
docker-compose -f docker-compose.yml up -d

# Access n8n UI
open http://localhost:5678
```

### Environment Variables

```bash
# Required
N8N_ENCRYPTION_KEY=your-encryption-key
N8N_USER_MANAGEMENT_JWT_SECRET=your-jwt-secret

# Database (uses shared Postgres)
DB_TYPE=postgresdb
DB_POSTGRESDB_HOST=postgres
DB_POSTGRESDB_PORT=5432
DB_POSTGRESDB_DATABASE=n8n
DB_POSTGRESDB_USER=postgres
DB_POSTGRESDB_PASSWORD=postgres

# Optional
N8N_BASIC_AUTH_ACTIVE=true
N8N_BASIC_AUTH_USER=admin
N8N_BASIC_AUTH_PASSWORD=your-password
WEBHOOK_URL=https://n8n.your-domain.com
```

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                      n8n Orchestrator                        │
├─────────────────────────────────────────────────────────────┤
│  Triggers          │  Actions           │  Integrations     │
│  ─────────────     │  ─────────────     │  ─────────────    │
│  • Webhook         │  • HTTP Request    │  • Supabase       │
│  • Cron/Schedule   │  • Database Query  │  • Redis          │
│  • Event Bus       │  • Code (JS)       │  • OpenAI         │
│  • Manual          │  • Email           │  • Stripe         │
│                    │  • Slack/Discord   │  • Shopify        │
└─────────────────────────────────────────────────────────────┘
         │                    │                    │
         ▼                    ▼                    ▼
┌─────────────┐      ┌─────────────┐      ┌─────────────┐
│ AI Service  │      │   Content   │      │  Ecommerce  │
│   :8001     │      │   :8002     │      │   :8004     │
└─────────────┘      └─────────────┘      └─────────────┘
```

## Use Cases

### 1. AI Content Pipeline

```
Trigger: RSS Feed / Webhook
    ↓
Fetch content from sources
    ↓
Call AI service for summarization
    ↓
Generate embeddings
    ↓
Store in Supabase (with vector)
    ↓
Notify via Slack
```

### 2. E-commerce Sync

```
Trigger: Schedule (every 15 min)
    ↓
Fetch Shopify products
    ↓
Compare with local DB
    ↓
Update inventory
    ↓
Trigger recommendation refresh
```

### 3. Daily Digest

```
Trigger: Cron (0 8 * * *)
    ↓
Query user activity
    ↓
Generate personalized digest
    ↓
Send email via Resend
```

### 4. Web3 Event Processing

```
Trigger: Webhook from blockchain indexer
    ↓
Validate event
    ↓
Update user balances
    ↓
Trigger notifications
```

## Workflow Templates

Pre-built workflows in `workflows/` directory:

| File                     | Description              |
| ------------------------ | ------------------------ |
| `content-pipeline.json`  | RSS → AI → Embed → Store |
| `ecommerce-sync.json`    | Shopify inventory sync   |
| `daily-digest.json`      | User digest emails       |
| `report-generation.json` | Scheduled reports        |
| `web3-events.json`       | Blockchain event handler |

### Import Workflow

```bash
# Via CLI
n8n import:workflow --input=workflows/content-pipeline.json

# Or via UI: Settings → Import from File
```

## Multi-tenant Considerations

When building workflows for multi-tenant system:

```javascript
// Always include tenant context in workflow data
const tenantId = $input.first().json.tenantId;

// Pass to all service calls
const response = await $http.request({
  url: "http://ai:8001/v1/generate",
  headers: {
    "X-Tenant-ID": tenantId,
  },
});
```

## Credentials

Store credentials securely in n8n:

1. **Database**: Supabase/Postgres connection
2. **Redis**: Cache connection
3. **OpenAI**: API key for AI workflows
4. **Stripe**: Payment webhooks
5. **Resend**: Email sending
6. **Shopify**: E-commerce integration

## Monitoring

### Health Check

```bash
curl http://localhost:5678/healthz
```

### Execution Logs

View in n8n UI: Executions → All Executions

### Alerts

Configure webhook on workflow failure:

```javascript
// Error workflow node
await $http.request({
  url: "https://hooks.slack.com/...",
  method: "POST",
  body: {
    text: `Workflow failed: ${$workflow.name}`,
  },
});
```

## Production Deployment

### Railway

```bash
# Deploy via Railway CLI
railway up
```

### Kubernetes

See `../k8s/n8n/` for Kubernetes manifests.

### Environment

| Variable                | Production Value  |
| ----------------------- | ----------------- |
| `N8N_PROTOCOL`          | `https`           |
| `N8N_HOST`              | `n8n.nebutra.com` |
| `N8N_PORT`              | `443`             |
| `EXECUTIONS_MODE`       | `queue`           |
| `QUEUE_BULL_REDIS_HOST` | `redis`           |

## Security

- Enable basic auth or SAML in production
- Use encrypted credentials storage
- Network isolation (internal services only)
- Audit workflow executions
- Rate limit webhook endpoints

## Related

- [Inngest](../inngest/) — Alternative for TypeScript workflows
- [Docker](../docker/) — Container setup
- [Observability](../observability/) — Logging & tracing
