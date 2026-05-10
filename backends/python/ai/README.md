# AI Service

FastAPI-based AI service providing LLM generation, embeddings, and translation.

## Features

- **Text Generation** — LLM-powered content generation
- **Embeddings** — Vector embeddings for semantic search
- **Translation** — AI-powered i18n translation

## Quick Start

```bash
# Navigate to service directory
cd backends/python/ai

# Create virtual environment
python -m venv .venv
source .venv/bin/activate  # On Windows: .venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Copy environment variables
cp .env.example .env

# Run development server
uvicorn app.main:app --reload --port 8001
```

## API Endpoints

| Method | Endpoint            | Description       |
| ------ | ------------------- | ----------------- |
| `GET`  | `/`                 | Service info      |
| `GET`  | `/health`           | Health check      |
| `POST` | `/api/v1/generate`  | Text generation   |
| `POST` | `/api/v1/embed`     | Create embeddings |
| `POST` | `/api/v1/translate` | Translate text    |

## Environment Variables

```bash
# AI Providers
OPENAI_API_KEY=sk-...
ANTHROPIC_API_KEY=sk-ant-...
SILICONFLOW_API_KEY=sf-...

# Default provider
DEFAULT_LLM_PROVIDER=openai
DEFAULT_EMBED_PROVIDER=openai

# Service config
AI_SERVICE_PORT=8001
```

## Docker

```bash
# Build image
docker build -t nebutra-ai .

# Run container
docker run -p 8001:8001 --env-file .env nebutra-ai
```

## Project Structure

```
backends/python/ai/
├── app/
│   ├── main.py              # FastAPI entry point
│   └── api/v1/
│       ├── routes_generate.py
│       ├── routes_embed.py
│       └── routes_translate.py
├── providers/               # AI provider implementations
├── services/                # Business logic
├── utils/                   # Helpers
├── Dockerfile
├── requirements.txt
└── .env.example
```

## Integration

Called by the BFF layer (`backends/gateway`) via internal HTTP:

```typescript
// In api-gateway
const response = await fetch("http://ai-service:8001/api/v1/generate", {
  method: "POST",
  body: JSON.stringify({ prompt, model: "gpt-5.2" }),
});
```
