# Recommendation System Service

Python-based recommendation engine with recall and ranking pipelines.

## Features

- **Recall** — Candidate generation (collaborative filtering, content-based)
- **Ranking** — ML-based re-ranking of candidates
- **Real-time** — Online feature serving
- **Batch** — Offline model training and updates

## Quick Start

```bash
cd backends/python/recsys

python -m venv .venv
source .venv/bin/activate

pip install -r requirements.txt

uvicorn app.main:app --reload --port 8003
```

## API Endpoints

| Method | Endpoint            | Description          |
| ------ | ------------------- | -------------------- |
| `GET`  | `/health`           | Health check         |
| `POST` | `/api/v1/recommend` | Get recommendations  |
| `POST` | `/api/v1/similar`   | Find similar items   |
| `POST` | `/api/v1/feedback`  | Record user feedback |

## Environment Variables

```bash
DATABASE_URL=postgresql://...
REDIS_URL=redis://...
MODEL_PATH=/models
RECSYS_SERVICE_PORT=8003
```

## Architecture

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│   Recall    │ ──▶ │   Ranking   │ ──▶ │   Output    │
│  (1000s)    │     │   (100s)    │     │   (10s)     │
└─────────────┘     └─────────────┘     └─────────────┘
```

## Docker

```bash
docker build -t nebutra-recsys .
docker run -p 8003:8003 --env-file .env nebutra-recsys
```

## Integration with Inngest

Model refresh jobs are scheduled via Inngest:

```typescript
// workflows/inngest/recsys_refresh.ts
export const recsysRefresh = inngest.createFunction(
  { id: "recsys-refresh" },
  { cron: "0 3 * * *" }, // Daily at 3 AM
  async () => {
    /* ... */
  },
);
```
