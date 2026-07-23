# @nebutra/router-supply

Supply orchestration for **Nebutra Router**:

- Model alias table (`NEBUTRA_MODEL_ALIASES` JSON or defaults)
- Engine discovery from env (New-API, Sub2API, official OpenAI)
- Upstream chain resolution + chat completions proxy with fallback

## Env

| Variable | Purpose |
|----------|---------|
| `NEW_API_BASE_URL` / `NEW_API_ACCESS_TOKEN` | New-API sidecar |
| `SUB2API_BASE_URL` / `SUB2API_ACCESS_TOKEN` | Sub2API pool |
| `OPENAI_API_KEY` | Optional direct official |
| `NEBUTRA_MODEL_ALIASES` | JSON array of `{ publicModel, engineId, upstreamModel, priority }` |

## Compose

See `infra/nebutra-router/`.

Gateway mounts sidecars via the same env vars in `defaultEnvUpstreams()` and exposes `GET /api/v1/ai/gateway/models`.
