# libtv.art-generator — summary

States: 5 · Transitions: 4 · Explored 2026-09-08 (owner session via opencli bridge; credits 0, no generation submitted).

## States

- `libtv.art-generator.image-default` — tab 图片生成 · overlay none · selected none — ![](../../evidence/libtv.art-image-gen.webp)
- `libtv.art-generator.image-model-picker` — tab 图片生成 · overlay model-picker-modal · selected none — ![](../../evidence/libtv.art-image-gen.base-model-picker.webp)
- `libtv.art-generator.image-config` — tab 图片生成 · overlay config-popover · selected none — ![](../../evidence/libtv.art-image-gen.settings-popover.webp)
- `libtv.art-generator.video-default` — tab 视频生成 · overlay none · selected none — ![](../../evidence/libtv.art-video-gen.webp)
- `libtv.art-generator.video-config` — tab 视频生成 · overlay config-popover · selected none — ![](../../evidence/libtv.art-video-gen.settings-popover.webp)

## Key observations

- **O** (libtv.art-generator.image-default) Single-form generator; credits 0 so ▶ not exercised.
- **O** (libtv.art-generator.image-model-picker) Capability badges per model.
- **O** (libtv.art-generator.image-config) Batch count up to 4 with VIP gating.
- **O** (libtv.art-generator.video-default) Video generator mirrors the LibTV video node vocabulary (全能参考, @引用).
- **O** (libtv.art-generator.video-config) Identical parameter set to the LibTV node config popover (minus 4K and count).

## Transitions

- libtv.art-generator.image-default —[click: 智能图片V2]→ libtv.art-generator.image-model-picker · overlay.opened (O)
- libtv.art-generator.image-default —[click: 1:1 | 1 张]→ libtv.art-generator.image-config (O)
- libtv.art-generator.image-default —[click: 视频生成 radio]→ libtv.art-generator.video-default · url.changed (O)
- libtv.art-generator.video-default —[click: 智能比例 | 720p | 5s | 有配音]→ libtv.art-generator.video-config (O)
