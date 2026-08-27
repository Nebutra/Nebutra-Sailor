# backends/gateway

TypeScript / Hono BFF. The **default** backend for `{PRODUCT_NAME}`.

Handles auth, tenancy, rate-limiting, and routing in front of all other services.

CRUD, webhooks, billing, third-party API proxies, and any new backend work goes here unless one of the Python exceptions applies (see `backends/python/README.md`).

## Develop

```bash
pnpm --filter @{PRODUCT_NAME}/gateway dev
```
