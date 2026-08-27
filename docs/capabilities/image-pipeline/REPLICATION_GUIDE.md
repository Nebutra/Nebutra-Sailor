# image-pipeline Replication Guide

```ts
import { createDemoBrandContext } from "@nebutra/generation-context";
import { ImagePipeline } from "@nebutra/image-pipeline";

const image = new ImagePipeline();
const asset = await image.generate(
  { type: "logo", company: "Loop", oneLiner: "AI debugging for indie devs" },
  createDemoBrandContext(),
);
console.log(asset.path);
```

## Steps

1. Create or load a `BrandContext`.
2. Call `generate()` with a logo, poster, icon, hero, or style-transfer intent.
3. Inspect `.nebutra/generated/image-pipeline`.
4. Run `pnpm image:doctor` before selecting model-backed adapters.
