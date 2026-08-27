# video-pipeline Replication Guide

```ts
import { createDemoBrandContext } from "@nebutra/generation-context";
import { VideoPipeline } from "@nebutra/video-pipeline";

const video = new VideoPipeline();
const brand = createDemoBrandContext();
const storyboard = await video.plan(
  { type: "brand-film", durationS: 24, theme: "indie developer journey" },
  brand,
);
const asset = await video.render(storyboard, brand);
console.log(asset.path);
```

## Steps

1. Load `BrandContext`.
2. Plan a storyboard.
3. Estimate with `pnpm video:cost`.
4. Generate a preview manifest with `pnpm video:preview`.
5. Render when a sidecar-backed renderer is configured.
