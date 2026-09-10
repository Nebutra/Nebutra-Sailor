# Generation — Flowith

**Inputs (O):** text prompt; attachments (text/code files in Chat; images in Image); style image (Image mode "Style +"); start/end keyframes + loop (Video); node tokens (any selected nodes) and lineage tokens (Follow Up); Knowledge Garden as knowledge base (tutorial answers cite it — I2 on mechanism).

**Config surface per mode (O):** model picker (mode-filtered), batch count `1 x` (2X/4X locked on Free), aspect ratio (Original/16:9/9:16/1:1/3:4/4:3/3:2/2:3), image size (1K), "Agent off" toggle inside Image mode, Unlimited Mode toggle (locked), MAX toggle (Neo Agent), output format Auto/Text/Image/Video/Slides/Website (Neo Agent).

**Result object (O):** a child node linked by an edge to the prompt (or to the source image for Vary/Follow Up — I2). Batch > 1 → sibling nodes (I2; tutorial shows 8 siblings). Image nodes carry model id + date and get Crop/Upscale/Background Removal/Vary/Download.

**Model catalog (O, from client cache — `raw/global-models.txt`):** 70 models; text (Claude Fable 5, Claude Opus 4.8, GPT 5.5/5.6/6, Gemini 3.x, Grok 4.x, DeepSeek V4, Kimi K3, MiniMax M3, …), image (Seedream 5.0 Pro default, Nano Banana 2/Pro, GPT Image 2, Grok Image 2.0, Flux 2, Recraft v3/v4, Z Image Turbo, …), video (Kling 3.0 4K/Pro/Turbo/Standard, Veo 3.1, Wan 2.6/3.0, Seedance 2.0/2.5, MiniMax H3). Tiers t1/t2 gate availability (t1 mostly locked on Free — I2 from lock icons).

**Professional tools (O):** on the image node itself: Crop, Upscale (menu), Background Removal, Vary. Home "Apps" rail packages the same capabilities as tasks (Background Remover, Image Upscaler, Crop & Resize, Photo Relighting, Virtual Try-on…).
