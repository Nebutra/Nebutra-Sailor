# Content Service

FastAPI-based content management service for posts, feeds, and comments.

## Features

- **Posts** — Create, read, update, delete posts
- **Feeds** — Personalized content feeds
- **Comments** — Nested comment threads
- **Reactions** — Likes, bookmarks, shares

## Quick Start

```bash
cd backends/python/content

# Create virtual environment
python -m venv .venv
source .venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Run development server
uvicorn app.main:app --reload --port 8002
```

## API Endpoints

| Method | Endpoint            | Description           |
| ------ | ------------------- | --------------------- |
| `GET`  | `/health`           | Health check          |
| `GET`  | `/api/v1/posts`     | List posts            |
| `POST` | `/api/v1/posts`     | Create post           |
| `GET`  | `/api/v1/posts/:id` | Get post              |
| `GET`  | `/api/v1/feed`      | Get personalized feed |
| `POST` | `/api/v1/comments`  | Add comment           |

## Environment Variables

```bash
DATABASE_URL=postgresql://...
REDIS_URL=redis://...
CONTENT_SERVICE_PORT=8002
```

## Docker

```bash
docker build -t nebutra-content .
docker run -p 8002:8002 --env-file .env nebutra-content
```

## Project Structure

```
backends/python/content/
├── app/
│   ├── main.py
│   └── api/v1/
├── services/
├── utils/
├── Dockerfile
└── requirements.txt
```
