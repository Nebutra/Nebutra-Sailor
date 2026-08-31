# AGENTS.md — apps/kuanlan

KUANLAN 观澜. AI personal presence platform at `kuanlan.nebutra.com`.

## Scope

This app owns the KUANLAN product surface.

It owns:

- product and create routes under `src/app`
- operator SKU catalog under `src/catalog/skus.ts`
- deterministic 领证照 compose under `src/lib/id-photo.ts`
- resource key layout under `src/lib/resources.ts`
- brand voice and editorial chrome under `src/components`

It does not own shared Nebutra UI chrome or a new `packages/ai/*` package. Exact millimetre compose stays in this app (`sharp`). Remote 开拍 consume goes through this app's backend (`src/lib/image2.ts`) to `https://router.nebutra.com/v1` with a router product key and model `gpt-image-2`. SKU system prompts stay in `idPhotoShootBrief` and never reach the browser. The 302.ai channel key lives only in New-API. Object bytes go through `@nebutra/storage` (Cloudflare R2).

## Source Of Truth

- `PRODUCT.md` — product + brand contract for this surface
- `src/catalog/skus.ts` — operator SKU control plane (`enabled` is the switch)
- Cloudflare R2 — resource store (`nebutra-assets` public catalog, `nebutra-uploads` Moments)
- `design/` — Linear-derived tokens applied as an editorial dark system
- `src/app/` — routes and API

Do not treat `.next/` or `public/orbit` as implementation truth. Public stills live at `kuanlan/orbit/{name}` on the assets bucket. Moments live at `kuanlan/moments/id-photo/{id}.png` on the uploads bucket.

## Contract Boundaries

- Users are shooting Moments, not calling a generator.
- Do not add Prompt / Generate / CFG / 模型 copy.
- Do not invent wardrobe, travel, or photoshoot catalogs until an SKU is enabled here.
- Disabled SKUs fail closed. Public list and compose both require `enabled: true`.
- Resource writes fail closed without `CLOUDFLARE_ACCOUNT_ID` + `R2_ACCESS_KEY_ID` + `R2_SECRET_ACCESS_KEY`. Do not fall back to disk or response blobs.
- 开拍 consume fails closed without `ROUTER_API_KEY` (router.nebutra.com product key). Default model is `gpt-image-2` at `https://router.nebutra.com/v1`. Do not put a 302.ai key in this app.
- File inputs use `data-allow-native`. No native `<select>`.
- No lucide. No `max-w-5xl` / `max-w-7xl`.

## Validation

- `pnpm --filter @nebutra/kuanlan test`
- `pnpm --filter @nebutra/kuanlan typecheck`
- `pnpm --filter @nebutra/kuanlan build`

Writes need an R2 S3 token in `.env.local` (`R2_ACCESS_KEY_ID` / `R2_SECRET_ACCESS_KEY`). Public stills are seeded with:

```bash
wrangler r2 object put nebutra-assets/kuanlan/orbit/01.jpg --file=apps/kuanlan/public/orbit/01.jpg --content-type=image/jpeg --remote
```
