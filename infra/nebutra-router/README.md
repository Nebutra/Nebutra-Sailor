# Nebutra Router — supply engines

Version-pinned **sidecar** processes for model supply. They are **generators**, not the product.

| Service | Role | Local port |
|---------|------|------------|
| `new-api` | Channel hub (A/C supply) | `127.0.0.1:3001` |
| `sub2api` | Subscription pool (B) — optional profile | `127.0.0.1:3002` |
| `postgres` / `redis` | Engine deps | internal + optional host maps |

## Rules

1. **Do not** expose New-API / Sub2API admin UI to C-end customers.  
2. Customer keys and billing live on **Nebutra Router** control plane.  
3. Pin images in `versions.lock`; do not vendor engine source into the monorepo.  
4. Production: private network / mesh only; no public DNS for these ports.

## Quick start (dev)

```bash
cd infra/nebutra-router
docker compose up -d
# optional B-class:
# docker compose --profile sub2api up -d

# open New-API admin (ops only): http://127.0.0.1:3001
```

## Smoke

After root admin setup in New-API:

1. Add an official upstream API key channel.  
2. Create an internal token for the Nebutra adapter.  
3. Point Router adapter `baseUrl` at `http://127.0.0.1:3001` (or in-cluster DNS).

## Related

- Design: `docs/plans/2026-07-23-nebutra-router-forge-design.md`  
- Impl plan: `docs/plans/2026-07-23-nebutra-router-forge-implementation-plan.md`
