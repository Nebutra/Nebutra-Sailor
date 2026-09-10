# Generation — Lovart

**Result object** (O): a `c-image` tldraw shape. Agent results carry `meta {source:'ai', threadId, actionId, groupId, agentName:'CreationPlanner', toolCallId, rootTaskId}` and `props.agentMeta`; generator results carry `props {genType:1, generatorTaskId}` and `meta {source:'ai'}`. Neither stores prompt, model or seed on the shape (O). Files live at a.lovart.ai/artifacts/agent|generator/… (O). Legacy shapes in the onboarding project have no meta at all (O).

**Naming** (O): agent picks a title ("yellow banana icon"); generator uses 图片 N; uploads/legacy use Image N.

**Placement** (O): result replaces its placeholder at the placeholder position; new top-level shape, not grouped, not framed, no visual link to the prompt.

**Parameters** (O): agent path — model via 模型偏好 (22 image / 20 video / 1 3D; 自动 toggle), thinking mode, web search, attachments, Skill. Generator path — 质量 自动/高/中/低, ratio list incl. 2k/4k, W/H, 生成数量 1–10, model (22 incl. Recraft V3), 参考图 slot; video — 参考图/视频, Auto·5s·720p, audio.

**Pricing** (O): paywall table (raw/paywall.txt) — GPT Image 2 1K low 1 credit, medium 8; Nano Banana Pro 14; Seedance 2.0 720p 90/5 s. Observed charges: agent GPT Image 2 Low = 3 credits; generator button showed ⚡15 regardless of quality/ratio and charged 15 (discrepancy, O).

**Edits on results** (O): toolbar AI ops (upscale, remove bg, eraser, layer split, edit text, multi-angle, GIF, vector ⚡9, mockup, extend, adjust*) — *gated on free tier. Quick edit Run ⚡14 with suggestion chips (展示方式, 2×2 细节图).
