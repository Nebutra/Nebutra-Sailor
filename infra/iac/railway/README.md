# Railway Deployment

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
cd services/ai
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
