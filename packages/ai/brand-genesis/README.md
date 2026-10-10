# @nebutra/brand-genesis

Status: **WIP**

`brand-genesis` is a Play package. Its `brand_kit` Play distills a one-sentence
company idea into a `BrandContext`, writes `company/BRAND.md`, then delegates
visual asset generation (logo, hero, icon, mesh) to existing media capabilities
and writes a landing handoff.

It intentionally does not own image, mesh, or landing generation primitives.

```ts
import { BrandGenesis } from "@nebutra/brand-genesis";

const genesis = await BrandGenesis.open(".nebutra/brand-genesis", {
  tenantId: "tenant_demo",
});

const result = await genesis.run({
  idea: "AI debugging for indie devs called Loop",
});

console.log(result.brand.name, result.brandMdPath);
await genesis.close();
```

Commands:

```bash
pnpm brand-genesis:doctor
pnpm brand-genesis:quickstart "AI debugging for indie devs called Loop"
pnpm brand-genesis:debug
```
