# audio-pipeline Replication Guide

```ts
import { createDemoBrandContext } from "@nebutra/generation-context";
import { AudioPipeline } from "@nebutra/audio-pipeline";

const audio = new AudioPipeline();
const asset = await audio.generate(
  { type: "bgm", durationS: 5, mood: "uplifting tech", bpm: 110 },
  createDemoBrandContext(),
  true,
);
console.log(asset.path, asset.license.status);
```

## Steps

1. Load `BrandContext`.
2. Choose BGM, SFX, or song intent.
3. Set `requireCommercial` when the output may ship.
4. Run `pnpm audio:license` and `pnpm audio:loudness`.
