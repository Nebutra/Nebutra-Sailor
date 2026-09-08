# Seko — generation model

- **Where**: only inside a node inspector (canvas) or the avatar form. No standalone "generate" page for images/video outside the canvas (O; the home hero is the story pipeline).
- **Inputs (O)**: prompt; 上传 (png/jpg) / 选择 (from canvas or library) reference images; `@` subject references; model; ratio (9:16, 16:9, 3:4, 4:3, 21:9, 1:1); resolution (1K/2K images; 720P/1080P video); duration (model-dependent 2–30 s); count (1张…); first/last frame for video.
- **Catalogue (O)**: 20 image models, 31 video models (grouped 图生视频 / 全能参考, with 音效同出 flags), 1 audio model surfaced (Mureka V9), 9 agent LLMs + 智能选择. Multi-vendor (ByteDance 即梦/Seedance, Alibaba Qwen/Wan, Kuaishou 可灵, MiniMax 海螺/H3, Vidu, Pixverse, SenseTime Seko/Sensenova).
- **Result object (O)**: the node itself. A first generation *replaces* the blank node's content (in-place, id changes). A derived generation creates a *new* node linked by an edge — never overwrites the source. Asset URL is a content-hash PNG on seko-resource.sensetime.com.
- **Provenance (O)**: edge source→derived; node label = operation (多角度). Prompt/config retained in the node.
- **Compare / approve / variants**: no side-by-side compare or approval UI; "1张" count suggests multi-output per node (U how displayed). (O-negative / U)
- **Re-run**: the inspector under a completed node still has send — I2 that it creates a new generation (not exercised).
