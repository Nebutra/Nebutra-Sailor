# TapNow generation model (tier per line)

**Generation result object (O):** an image/video/audio/3D output bound to the node that requested it; rendered inside the node; URL `files.tapnow.media/api/conversation/storage/uploads/<uuid>`; also listed in the History drawer (per media, dated, searchable, bulk Apply to Canvas / Download). The node keeps prompt + model + params → regenerate in place; variations 1×–4×.

**Per-node generation spec (O):**
| Node | default model | params | count | cost (Tapies) |
|---|---|---|---|---|
| Text | Gemini 3.1 Flash Lite | — | 1× | "-" (free/unlisted) |
| Image | Seedream 5.0 Lite | Quality 2K/3K · Aspect 1:1,4:3,3:4,16:9,9:16,3:2,2:3,21:9 | 1× | 5 |
| Image / Redraw | Banana Pro | mask (brush/marquee/eraser), 2K, x1 | 1 | 15 |
| Video | Seedance 2.0 Mini | method Frames \| Omni Reference · aspect · 480p/720p · 4–15 s · Generate Audio on/off | 1× | 30 |
| Audio | Mureka V8 (scene Music) | prompt + lyrics | Auto | 10 |
| 3D | Marble 1.1 | — | — | U |

**Model catalogue (O):** image ≈22 (Nano Banana 2 Lite 1K, Seedream 5 Lite/Pro 2K, Seedream 4.0/4.5 4K, GPT Image2 4K HOT, Banana 2/Pro 4K, Banana 1080P, MJ V7/V8.1/V8.2/Niji7, Flux/Flux Max, Recraft V4/Vector, Grok2 Image, Reve 2.1, Grok Imagine/Quality); video ≈50 (Seedance 1.0/1.5/2.0/2.0 Fast/2.0 Mini/2.5, Wan 2.2/2.5/2.6/3.0, Hailuo 02/2.3, Vidu Q2/Q3, MiniMax H3/H3 Max, Kling 2.1/2.5/2.6/3.0/3.0 Omni/O1 + Edit/Motion Control, FLUX 3, Gemini Omni Flash/1.1, HappyHorse 1.0/1.1 + Edit, VEO 3.1/Fast/Lite, PixVerse 5.0/5.5, Sora 2/2 Pro, Grok Imagine/1.5, MJ Video, OmniHuman 1.5) each tagged with resolution, duration range, NEW/HOT/discount; LLM 13 with "Low cost/High quality/Complex tasks" + latency band; audio 6.

**Pro controls (O):** Change Angle (cube rotation/tilt/scale, wide-angle), Relight (key light, global brightness, colour temperature, main/rim light), Redraw (inpaint), Crop, Point to Edit, First/Last Frame, Omni Reference, Subject packs (Seedance), AI Character presets. Marketing "Lens Combo" (camera/lens/focal/aperture) was **not** found in the web canvas on this pass (U — may be video-node or model-specific).

**Cost transparency (O):** cost next to Generate; agent card shows `~N Tapies`; plans quote images/video-seconds per month and per-model promos; "Model Mart" / "Model Card Purchase" suggest per-model entitlements (I2).

**Failure/queue states:** U.
