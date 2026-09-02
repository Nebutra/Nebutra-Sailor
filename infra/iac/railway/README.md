# Railway Deployment

> **Status: experimental / not exercised by CI since 2026-04 (nor before: no
> workflow has ever driven this directory); not part of the default
> create-sailor template; validate before use.**
>
> No workflow, script or test reads this directory. `railway` survives as a
> `DEPLOY_TARGET_*` enum value in `packages/ops/preset/src/deploy-target.ts`;
> create-sailor's `railway` target writes its own `railway.toml` and does not
> use this `railway.json`. The service list below names Python services
> (`content`, `recsys`, `ecommerce`, `web3`) removed from `backends/python/` in
> 2026-05 — only `backends/python/ai` remains. Closure-phase honesty layer:
> [docs/architecture/2026-08-27-closure-phase.md](../../../docs/architecture/2026-08-27-closure-phase.md).

[Railway](https://railway.app) configuration for deploying Python microservices.

## Overview

Railway is used to deploy the Python microservices:

- `ai` — AI/LLM service
- `content` — Content management
- `recsys` — Recommendation system
- `ecommerce` — E-commerce integration
- `web3` — Blockchain indexer

## Quick Start

### 1. Install Railway CLI

```bash
npm install -g @railway/cli
# or
brew install railway
```

### 2. Login

```bash
railway login
```

### 3. Initialize project

```bash
railway init
```

### 4. Link to service

```bash
cd backends/python/ai
railway link
```

### 5. Deploy

```bash
railway up
```

## Configuration

### railway.json

```json
{
  "$schema": "https://railway.app/railway.schema.json",
  "build": {
    "builder": "DOCKERFILE",
    "dockerfilePath": "Dockerfile"
  },
  "deploy": {
    "startCommand": "uvicorn app.main:app --host 0.0.0.0 --port $PORT",
    "healthcheckPath": "/health",
    "healthcheckTimeout": 30
  }
}
```

## Environment Variables

Set via Railway dashboard or CLI:

```bash
railway variables set DATABASE_URL=...
railway variables set REDIS_URL=...
railway variables set OPENAI_API_KEY=...
```

## Networking

Railway provides automatic internal networking between services:

```python
# Access another Railway service
AI_SERVICE_URL = os.getenv("AI_SERVICE_URL", "http://ai.railway.internal:8001")
```

## Custom Domains

```bash
railway domain
```

## Monitoring

- View logs: `railway logs`
- Check status: `railway status`
- Open dashboard: `railway open`

## Related

- [Railway Documentation](https://docs.railway.app)
- [Docker configs](../docker/)
