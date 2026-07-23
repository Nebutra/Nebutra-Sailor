# @nebutra/router

Nebutra Router console — 302-style journey for model aggregation.

```bash
pnpm --filter @nebutra/router dev   # http://localhost:3106
```

## Journey

1. `/wallet` mock top-up  
2. `/keys` create `sk-sailor-*`  
3. `/docs` baseURL snippet  
4. `/playground` demo chat (or `ROUTER_GATEWAY_URL` forward)

Supply engines stay in `infra/nebutra-router`; this app is the product shell.
