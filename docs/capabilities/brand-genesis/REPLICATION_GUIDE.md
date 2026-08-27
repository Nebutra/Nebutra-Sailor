# Replicate brand-genesis

```ts
import { BrandGenesis } from "@nebutra/brand-genesis";

const genesis = await BrandGenesis.open(".nebutra/brand-genesis", {
  tenantId: "tenant_demo",
});

const result = await genesis.run({
  idea: "AI debugging for indie devs called Loop",
  visualDirectionHint: "cyberpunk",
});

console.log(result.brandMdPath);
console.log(result.film.path);

await genesis.close();
```

## Steps

1. Open `BrandGenesis` with a tenant id.
2. Run the `brand_film_60s` Play with one company idea.
3. Inspect `company/BRAND.md` as the single source of truth.
4. Inspect generated image, mesh, audio, voice, video, and landing outputs.
5. Run `pnpm brand-genesis:doctor` before wiring model-backed providers.

## Commands

```bash
pnpm brand-genesis:doctor
pnpm brand-genesis:quickstart "AI debugging for indie devs called Loop"
pnpm brand-genesis:debug
pnpm play:parse packages/ai/brand-genesis/plays/brand_film_60s/SKILL.md
```

## Notes

The zero-config path is real and non-mock, but uses deterministic local fallback
renderers from the lower media packages. Configure those packages for model-backed
generation when quality matters.
