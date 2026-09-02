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

## 302.ai image2 channel (ops only)

The 302.ai key never leaves New-API. Public consume is `https://router.nebutra.com/v1`.

1. New-API admin (localhost / mesh only): add a channel  
   - Type: OpenAI  
   - Base: `https://api.302.ai`  
   - Key: the 302.ai secret  
   - Models: `gpt-image-2` (and any other sellable ids)
2. Create a **user token** for 观澜 / product consume. That token is the router API key.
3. Router PM2 env: `NEW_API_BASE_URL=http://127.0.0.1:3001/v1`  
   On the ECS box, landing already owns `:3001`. Bind New-API to a free
   localhost port (for example `127.0.0.1:3301:3000`) and point Router at
   that port. Do not publish New-API on a public hostname.
4. 观澜 backend env: `ROUTER_API_KEY=<that user token>`  
   `IMAGE2_BASE_URL=https://router.nebutra.com/v1`  
   `IMAGE2_MODEL=gpt-image-2`

Request shape is the 302.ai / OpenAI contract:

```text
POST /v1/images/edits
Authorization: Bearer <router key>
Content-Type: multipart/form-data
image + prompt + model=gpt-image-2 + size
```

## Related

- Design: `docs/plans/2026-07-23-nebutra-router-forge-design.md`  
- Impl plan: `docs/plans/2026-07-23-nebutra-router-forge-implementation-plan.md`
