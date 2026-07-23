# @nebutra/forge

Nebutra Forge — human tool station + Agent invoke API.

## Dev

```bash
pnpm --filter @nebutra/forge dev
# http://localhost:3105
```

## Surfaces

| Path | Role |
|------|------|
| `/` | Search + category grid |
| `/t/[slug]` | Human tool page + runner |
| `/docs` | API quick docs |
| `GET /api/v1/tools` | Catalog |
| `POST /api/v1/tools/invoke/{id}` | Invoke (id may include `/`) |

Runtime: `@nebutra/forge-runtime`  
Wallet demo: `@nebutra/prepaid-wallet` MemoryPrepaidWallet (swap to CreditBalance via `createCreditLedgerWallet`)
