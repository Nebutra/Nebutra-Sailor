# Nebutra Third-Party Data Service

Third-party data fetching with caching, rate limiting, and data transformation.

## Features

- **Product Hunt Integration**: Access trending products, topics, collections via GraphQL API v2
- **Redis Caching**: Configurable TTL for different data types
- **Rate Limiting**: Protection against API abuse
- **Graceful Degradation**: Stale cache fallback on errors
- **Automatic Retries**: Exponential backoff for transient failures

## Integrations

### Product Hunt

Access Product Hunt data through a simplified REST API:

```
GET  /api/v1/producthunt/posts           # List posts
GET  /api/v1/producthunt/posts/trending  # Trending posts
GET  /api/v1/producthunt/posts/{slug}    # Single post
GET  /api/v1/producthunt/topics          # All topics
GET  /api/v1/producthunt/collections     # Collections
POST /api/v1/producthunt/cache/warm      # Warm cache
DELETE /api/v1/producthunt/cache         # Invalidate cache
```

## Setup

### 1. Get Product Hunt API Credentials

1. Go to [Product Hunt API Dashboard](https://www.producthunt.com/v2/oauth/applications)
2. Create a new application
3. Copy your Developer Token

### 2. Configure Environment

```bash
cp .env.example .env
# Edit .env with your credentials
```

Required variables:

- `PRODUCT_HUNT_DEV_TOKEN`: Your PH developer token
- `UPSTASH_REDIS_URL`: Redis connection URL

### 3. Run Locally

```bash
# Install dependencies
pip install -r requirements.txt

# Run the service
uvicorn app.main:app --reload --port 8007
```

### 4. Run with Docker

```bash
docker build -t nebutra-integrations .
docker run -p 8007:8007 --env-file .env nebutra-integrations
```

## API Documentation

Once running, visit:

- Swagger UI: http://localhost:8007/docs
- ReDoc: http://localhost:8007/redoc

## Architecture

```
backends/python/third-party/
├── app/
│   ├── main.py              # FastAPI entry
│   └── api/v1/
│       └── routes_producthunt.py
├── clients/
│   └── producthunt.py       # GraphQL client
├── services/
│   └── producthunt.py       # Business logic + caching
├── models/
│   └── producthunt.py       # Pydantic models
└── utils/
    ├── config.py            # Environment config
    └── redis_client.py      # Cache manager
```

## Cache TTLs

| Data Type   | Default TTL | Config Key                 |
| ----------- | ----------- | -------------------------- |
| Posts       | 1 hour      | `PH_CACHE_TTL_POSTS`       |
| Trending    | 30 minutes  | `PH_CACHE_TTL_TRENDING`    |
| Topics      | 24 hours    | `PH_CACHE_TTL_TOPICS`      |
| Collections | 24 hours    | `PH_CACHE_TTL_COLLECTIONS` |

## Rate Limits

Product Hunt API has fair-use rate limits (~100 requests/hour).
This service implements:

1. **Caching**: Reduces upstream API calls
2. **Graceful Degradation**: Returns stale cache on rate limit
3. **Exponential Backoff**: Retries failed requests

## Usage Notes

⚠️ **Commercial Use**: Product Hunt API is non-commercial by default.
Contact PH for commercial licensing if using in a commercial product.

## Future Integrations

- [ ] Twitter/X API
- [ ] GitHub API
- [ ] Hacker News API
- [ ] Reddit API
