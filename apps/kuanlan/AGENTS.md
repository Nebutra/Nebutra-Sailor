# AGENTS.md — apps/kuanlan

KUANLAN 观澜. AI personal presence platform at `kuanlan.nebutra.com`.
Active origin is Fly (`nebutra-kuanlan` in `sin`) via `deploy-fly.yml`.
Shanghai ECS is rollback only (`reason=rollback-kuanlan-ecs`).

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
- Cloudflare R2 — resource store (`nebutra-assets` public catalog, `nebutra-uploads` Moments). The Fly S3 token must List/Get/Put `nebutra-uploads`; the shared GitHub `R2_*` seeder is assets-only. Mint via `ops-kuanlan-r2-uploads.yml`.
- Cosmos Brand Package — `packages/design/tokens/brands/cosmos/` (`brand.json` is the
  SSOT, `DESIGN.md` is the human reference it was written from). Applied here by
  `html[data-brand="cosmos"]` in `src/app/layout.tsx`; the emitted skin arrives via
  `@nebutra/tokens/skins/cosmos.css`
- `src/app/` — routes and API

Do not treat `.next/` or `public/` as consumption truth. Browser stills come from `https://cdn.nebutra.com/kuanlan/{orbit|skus|wardrobe}/…` on `nebutra-assets`. `public/` is only the seed tree. Compose 领证照 samples from `src/catalog/samples/` into `public/skus/`, then `pnpm --filter @nebutra/kuanlan assets:seed`. Moments write to `kuanlan/moments/id-photo/{userId}/{id}.png` on `nebutra-uploads`. Identity is the Nebutra auth center (`auth.nebutra.com`); this app is an RP. Do not bounce into `app.nebutra.com`.

## Contract Boundaries

- Users are shooting Moments, not calling a generator.
- Do not add Prompt / Generate / CFG / 模型 copy.
- Wardrobe lists live `kind: "garment"` SKUs as ghost-mannequin stills shot in-camera on smoke, not portraits, not hangers, and not a CV cutout. The tile chrome may keep `--garment-ground` (`paper` / `white` / `smoke` / `ink`); the photograph already holds the wall. Shoot SKUs may set `garmentId`. Do not derive the wardrobe from one shoot path. Do not invent garments or shoots that are not real. Do not pretend the user has a personal closet.
- Garment SKUs carry a cut spec: size, color, material, and centimetre measures (衣长 / 裤长 / 胸围 / 袖长 / 肩宽 / 腰围 / 臀围). Omit a measure when it does not apply. Do not invent bottoms just to fill 裤长.
- Every SKU carries `origin` + `brand`. Platform-listed rows seal to `KUANLAN©️`. User-uploaded rows (not open) keep their own brand. Do not invent upload or VLM. Do not put the brand mark into shoot briefs.
- Disabled SKUs fail closed. Public list and compose both require `enabled: true`.
- Resource writes fail closed without `CLOUDFLARE_ACCOUNT_ID` + `R2_ACCESS_KEY_ID` + `R2_SECRET_ACCESS_KEY`. Do not fall back to disk or response blobs.
- 开拍 consume fails closed without `ROUTER_API_KEY` (router.nebutra.com product key). Default model is `gpt-image-2` at `https://router.nebutra.com/v1`. Do not put a 302.ai key in this app.
- File inputs use `data-allow-native`. No native `<select>`.
- No lucide. No `max-w-5xl` / `max-w-7xl`.

## Validation

- `pnpm --filter @nebutra/kuanlan test`
- `pnpm --filter @nebutra/kuanlan typecheck`
- `pnpm --filter @nebutra/kuanlan build`

Writes need `CLOUDFLARE_ACCOUNT_ID`. Prefer an R2 S3 token (`R2_ACCESS_KEY_ID` / `R2_SECRET_ACCESS_KEY`); otherwise `assets:seed` uses wrangler OAuth against `nebutra-assets`. After composing samples:

```bash
pnpm --filter @nebutra/kuanlan samples:compose
pnpm --filter @nebutra/kuanlan assets:seed
```
