# 3d-pipeline Replication Guide

```ts
import { createDemoBrandContext } from "@nebutra/generation-context";
import { MeshPipeline } from "@nebutra/3d-pipeline";

const mesh = new MeshPipeline();
const asset = await mesh.fromText("a sleek robot mascot", createDemoBrandContext());
console.log(asset.gltfPath, asset.previewImagePath);
```

## Steps

1. Load `BrandContext`.
2. Generate from text or an image asset.
3. Preview with `pnpm 3d:preview`.
4. Export a target format with `pnpm 3d:export`.
