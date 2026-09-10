# tapnow.canvas — /canvas/<project-uuid>

Title "Untitled | TapNow | Your Agentic Creative Canvas". 16 states, all O unless marked.

## Layout (chrome ≈ 42 %)
Header-left: back-to-workspace logo, rename canvas, **canvas switcher** (a project holds many canvases; "New Canvas"). Header-centre: Tapies balance (opens Settings), Community, Share. **Left dock**: ⊕ Add node, Node search, Library, Comment mode, History, avatar. **Bottom-left**: minimap, hide connections, snap to grid, fit view, zoom slider, help (Changelog / User Guide / Report an issue / Hotkeys). **Right**: agent panel ≈ 33 % width (see `tapnow.agent`). Node context menu: Copy/Paste/Duplicate/Delete/Report an issue. Pane right-click: Upload / Add Assets / Add Nodes / Add Utilities / Undo ⌘Z / Redo ⇧⌘Z / Paste.

## Nodes
Add Nodes palette: **Text, Image, Video, Audio, 3D**; Utilities **Timeline Editor (Beta), 3D Studio, Image Editor**; Add Source **Upload**. Search filters expose kinds All/Image/Video/Text/Audio/**World/Group**.
Every generative node = prompt (TipTap) + model select + params + variations (1×–4×) + Generate + **cost in Tapies shown inline**; the result renders **inside the same node** and the bar stays for regeneration.
- Text: rich-text toolbar (H1–H3, bold, lists, divider, Background Color, Pin, Copy All, Save to Library, Fullscreen) + LLM generator (default Gemini 3.1 Flash Lite; list tags "Low cost / 5~10s", Claude Opus 5, Fable 5, DeepSeek V4 Pro, Grok 4.6, GPT-5.6/6…).
- Image: default Seedream 5.0 Lite · 1:1 · 2K · cost 5; params Quality 2K/3K, Aspect 1:1…21:9; ~22 models (Nano Banana 2 Lite, Seedream 5 Lite/Pro, 4.0/4.5, GPT Image2, Banana 2/Pro, MJ V7/V8.x/Niji7, Flux, Recraft V4, Grok Imagine, Reve 2.1). After generation toolbar → **Crop, Change Angle, Redraw, Relight, View All, Pin, Save to Library, Download, Full Screen**. Change Angle (cube, Rotation/Tilt/Scale, Wide-Angle), Relight (KEY LIGHT Global/Brightness/Colour Temperature/Main/Rim) and Redraw (mask brush/marquee/eraser, prompt, model Banana Pro, cost 15) all render **inline in the node**.
- Video: default Seedance 2.0 Mini · Frames · 16:9 · 480p · 5s · cost 30; params: Generate method Frames | Omni Reference, resolution 480p/720p, duration 4–15 s, Generate Audio on/off; toolbar Upload / Point to Edit / First Frame / Last Frame; ~50 models (Seedance 2.x/2.5, Wan 2.x/3.0, Kling 3.0/Omni/O1, Veo 3.1, Sora 2, MiniMax H3, Vidu, Hailuo, PixVerse, HappyHorse, OmniHuman…).
- Audio: prompt + lyrics; Mureka V8/O2, Seed audio, MiniMax Music 2.6, ElevenLabs V3, Sonilo; cost 10.
- 3D ("3D World"): model Marble 1.1.
- Image Editor node → "Open editor" → **fullscreen overlay** (600×600 canvas, layers, shapes, text, upload, its own generation composer "Enter prompt for image generation" × N, Save / Save and Back To Canvas / Download / Close).
- Timeline Editor / 3D Studio: no in-tab change on click (U — probably separate window).

## Selection & disclosure
Single-click selects one node; pane click deselects. On select: floating toolbar above, title input, generation bar below, round **Reference** handle, and the node is pushed into the agent composer as a context chip.

## Library (dock)
Header AI Character | +; tabs Private | Team; Favorite; **Elements** ("Pack images, text, audio, and video into a unified *Subject* for one-click use in video nodes… Exclusive to Seedance 2 / 2.5"); categories Folder, Character, Scene, Item, Style, Sound Effect, Others. **AI Character Library** = preset catalogue with era tabs and facets (Gender, Age Group, Species, Build, Height, Skin Color, Hair, Temperament).

## History (dock)
Generation-output history by media (Image/Video/Audio/3D), search, multi-select → Apply to Canvas / Download. Not document versioning; only Undo/Redo observed (U: no version/branch UI found).

## Share
Publish to TapTV / Share by link ("Anyone with the link can view and copy your template") / Move to team projects.

## Generation lifecycle (manual, observed once)
Generate disabled until prompt → click → ≈39 s (no DOM status text; U spinner) → image `files.tapnow.media/api/conversation/storage/uploads/<uuid>` in node → History entry. No cost confirmation dialog. Balance 200 → 170 after two generations (U exact split).

Evidence: `canvas.*.webp` (28 files).
