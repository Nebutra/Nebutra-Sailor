# Docker Configuration

Docker setup for local development and production deployments.

## Local Development

### Start all services

```bash
docker-compose up -d
```

### Start specific services

```bash
docker-compose up -d postgres redis
```

### View logs

```bash
docker-compose logs -f
```

### Stop services

```bash
docker-compose down
```

## Services

| Service     | Port | Description              |
| ----------- | ---- | ------------------------ |
| `postgres`  | 5432 | PostgreSQL with pgvector |
| `redis`     | 6379 | Redis for caching        |
| `ai`        | 8001 | AI microservice          |
| `content`   | 8002 | Content microservice     |
| `recsys`    | 8003 | Recommendation service   |
| `ecommerce` | 8004 | E-commerce service       |
| `web3`      | 8005 | Web3 service             |

## Building Images

### Build all microservices

```bash
# From repo root
docker-compose build
```

### Build specific service

```bash
docker-compose build ai
```

## Environment Variables

Copy `.env.example` to `.env` and configure:

```bash
cp .env.example .env
```

Required variables:

- `DATABASE_URL` — PostgreSQL connection string
- `REDIS_URL` — Redis connection string
- `OPENAI_API_KEY` — For AI service

## Production

For production deployments, use multi-stage builds:

```dockerfile
# Example multi-stage build
FROM python:3.11-slim as builder
WORKDIR /app
COPY requirements.txt .
RUN pip install --user -r requirements.txt

FROM python:3.11-slim
WORKDIR /app
COPY --from=builder /root/.local /root/.local
COPY . .
ENV PATH=/root/.local/bin:$PATH
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
```

## Healthchecks

All services expose `/health` endpoint:

```yaml
healthcheck:
  test: ["CMD", "curl", "-f", "http://localhost:8001/health"]
  interval: 30s
  timeout: 10s
  retries: 3
```
