# @nebutra/brand-genesis

Status: **WIP**

`brand-genesis` is the flagship Play package. It distills a one-sentence
company idea into a `BrandContext`, writes `company/BRAND.md`, then delegates
asset generation to existing media capabilities.

It intentionally does not own image, video, audio, voice, mesh, or landing-page
generation primitives.

```ts
import { BrandGenesis } from "@nebutra/brand-genesis";

const genesis = await BrandGenesis.open(".nebutra/brand-genesis", {
  tenantId: "tenant_demo",
});

const result = await genesis.run({
  idea: "AI debugging for indie devs called Loop",
});

console.log(result.brand.name, result.film.path);
await genesis.close();
```

Commands:

```bash
pnpm brand-genesis:doctor
pnpm brand-genesis:quickstart "AI debugging for indie devs called Loop"
pnpm brand-genesis:debug
```
