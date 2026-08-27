# backends/python

FastAPI-based Python backends. **Use only when justified.**

Per the TS-by-Default ADR (`docs/architecture/2026-05-10-ts-by-default-python-only-when-justified.md`), a new Python service is acceptable only when it cites at least one of:

1. **Batch / queued work** too long for edge runtimes (>5s typical)
2. **ML / scientific compute** that depends on the Python ecosystem (transformers, vLLM, etc.)
3. **Specialized libraries** with no comparable TS port

For CRUD, webhooks, billing, content management — use `backends/gateway/` (TS) instead.

## Layout

- `_shared/` — shared primitives (queue client, db, logger) consumed by services
- `<service>/` — one folder per active service (must have a real caller)
