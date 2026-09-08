# Lovart — synthesis (explored 2026-09-08, owner account, free tier, Chinese UI)

Scope: home, projects, brand-kit, canvas (onboarding project + a scratch project "PARA research scratch"); 2 image generations (agent path, generator-node path); ~200 browser actions; 21 canvas states + 8 shell states fingerprinted; 53 evidence captures.

## 1. Core unit of work — **Project = canvas document + threads + files**
- O: A project is one tldraw canvas (`role=application aria-label=tldraw`) with custom shape types `c-image`, `c-generator`, `c-video-generator`, `c-task`, `text`, `group`. `/canvas?newProject=true` creates it instantly and rewrites the URL to `?projectId=<12-char>`. Title is an editable input in the top bar. `evidence/scratch.new.webp`, `surfaces/canvas/states/canvas.new-project.json`.
- O: Projects list is a flat grid (cover mosaic, name, 更新于), no folders/search/sort; select-mode adds checkboxes. Cards open the canvas in a **new tab** via `window.open`. `evidence/projects.list.webp`, `projects.after-scratch.webp`.
- O: Home is a prompt-first launcher that reuses the same composer component as the canvas panel. `evidence/home.webp`.

## 2. Persistence boundary
- O: Server-side: shapes, threads (历史对话 per project), title, generated files (生成文件 drawer), brand kit (account-level). Reload restored both scratch images, the thread and the title. `evidence/scratch.reloaded.webp`; `business/persistence.md`.
- O: Client-side UI state also survives reload: camera, selection, quick-edit sub-mode, open popovers, collapsed agent panel. `evidence/canvas.image-selected.quick-edit.webp`, `canvas.agent-collapsed.webp`.
- I2: 画布历史 (whole-canvas snapshots tagged 保存/打开, with 恢复) is browser-local (`local-history-close-button`). `evidence/canvas.canvas-history.webp`.
- O: Any canvas mutation bumps 更新于; list order is not by update date.

## 3. Reusable identity / references
- O: **Brand kit (Beta)** is an account-level library with sections Logo / 字体 / 颜色 / 设计指南 / 图像 / 品牌指南; fill by uploading a brand book (PNG/JPG/PDF ≤50 MB) or build on canvas; attached per project from the title chevron (品牌套件: 无 / 未命名). `evidence/brandkit.list.webp`, `canvas.project-menu.webp`.
- O: Per-message references: `+` → 上传文件; generator node has a 参考图 slot; video node 参考图/视频 with `referenceMode: multiImage`. No character/subject library, no asset panel beyond layers + files.
- U: Whether the agent consumes the brand kit (kit was empty); 字体生成器 "My Fonts" reuse.

## 4. Generation result object
- O: Result = `c-image` shape placed **in place of a `c-task` placeholder** that appeared when the job started. Agent results carry `meta {source:'ai', threadId, actionId, groupId, agentName:'CreationPlanner', toolCallId, rootTaskId}` + `props.agentMeta`; generator results carry `props {genType:1, generatorTaskId}`. No prompt/model/seed on the shape. `raw/canvas.populated.shapes.json`, `surfaces/canvas/states/canvas.agent-done.json`, `canvas.generator-running.json`.
- O: Result also appears as a card in the thread (model badge, agent-chosen title, image) — the same artefact is visible in two places without a visual link on canvas.
- O: Naming: agent title ("yellow banana icon") vs generator 图片 N vs upload Image N.
- O: Pricing shown inline (⚡15 generator, ⚡14 quick edit, ⚡9 矢量, ⚡90 video); observed charges 3 (agent, at completion) and 15 (generator, at submit); the generator label ignored quality/ratio changes. Full credit table in `raw/paywall.txt`; `business/generation.md`.

## 5. Agent role
- O: Persistent right panel (≈38% width at 1040 px), collapsible to a 对话 button + floating mic; canvas is **not blocked** during runs (stop button replaces send). Composer: mention chips from selection, +, Skill book (19 skills / 6 categories), mode Agent / 图像 / 视频, thinking bulb, 模型偏好 (22 image / 20 video / 1 3D, 自动 toggle), mic/send. `evidence/scratch.running.webp`, `home.book-popover.webp`, `home.settings-popover.webp`.
- O: Run shape: 思考中 → tool step card "GPT Image 2 / 生成中" with shimmer → status row "使用 GPT Image 2 生成图片… 00:31 / 2分钟" → result card → summary; 点赞/点踩. Thread auto-titled from the prompt. No plan preview or approval gate; failure/retry U. `business/agent.md`.
- O: **Selection → context**: selecting shapes inserts chips into the composer automatically (one per shape); right-click 发送至对话 does it explicitly. `evidence/canvas.image-selected.webp`, `canvas.multi-selected.webp`.

## 6. Canvas role
- O: The canvas is the only workspace: prompts, results, edits and exports all happen there; generators are **nodes on the canvas** (`c-generator` with its own composer: 质量/尺寸/宽高比 incl 2k·4k/数量 1–10/22 models). `evidence/canvas.dock.generate-menu-image.webp`, `canvas.generator-image.size-popover.webp`.
- O: Layout: bottom dock (select V/H, 标记 C, upload, 智能画板 F, shapes R/L/⇧L/O/polygon/star, 铅笔 P, 文字 T, 图像生成器 A, 视频生成器 S, 字体生成器), bottom-left 画布背景 / 图层 / 生成文件 / 小地图 / zoom, top-left logo app-menu (主页 / 项目库 / 新建项目 / 删除当前项目 / 画布历史 / 导入图片 / undo-redo / zoom). Chrome ratio ≈0.45 with panel open. `ux/density.yaml`.
- O: Empty-viewport rescue toast (视口内无内容 · 回到内容).

## 7. Selection UX (key PARA comparison)
- O: One image → **floating toolbar above the selection**, no right inspector: 快捷编辑 Tab · 放大 · 去背景 · 橡皮工具 · 图层拆分 · 编辑文字 · 多角度 · 动态图片 · ··· · ⬇ (10 controls, 7 AI). ··· = 移动对象 · Mockup · 扩展 · 调整 (paywalled) · 裁剪 · 矢量 ⚡9 · 翻转与旋转 · 自定义工具栏 (user-customisable bar). Label "Image 221 · 1024 × 1024" above the box. `evidence/canvas.image-selected.webp`, `canvas.image-selected.more-menu.webp`; `ux/selection-matrix.md`.
- O: Quick edit (Tab) = focused sub-mode: camera zooms to the image, inline prompt "Describe your edit here", Run ⚡14, suggestion chips (展示方式, 2×2 细节图 ⚡14). `evidence/canvas.image-selected.quick-edit.webp`.
- O: Text → font family/style/fill/stroke bar; group → 解除编组; multi → 自动整理 · 创建编组 · 合并图层 · align · arrange · 下载/导出 PSD (no AI ops on multi). Right-click: 19 items incl. 发送至对话, 合并图层, 自动整理 ⇧A, 导出 ›. `evidence/canvas.text-selected.webp`, `canvas.multi-selected.webp`, `canvas.image-selected.context-menu.webp`.
- I2: Toolbar labels collapse to icon-only when the bar would overflow.

## 8. Professional tool entry
- O: Tools are modal tools in the dock (tldraw style) plus a 280 px left **layers drawer** (with a 历史记录 section) and a **crop panel** (W/H, lock ratio, 7 social presets). 字体生成器 opens a Beta onboarding card (Generation / My Fonts). No separate "pro editor" mode; AI ops and local ops share the same floating bar. `evidence/canvas.float-layer-button.webp`, `canvas.image-selected.crop.webp`, `canvas.dock.font-generator-modal.webp`.
- O: 调整 (adjust) and post-export are paywall triggers on the free tier. `evidence/paywall.webp`.

## 9. Review / versioning / compare
- O: No compare view, no per-object version stack, no approval step. Whole-canvas 画布历史 snapshots (time · 保存/打开 · N 个元素 · KB · 恢复). Feedback = 点赞/点踩 on messages. Iteration = re-prompt with chips or quick edit. `evidence/canvas.canvas-history.webp`.

## 10. Business model (O, from in-app paywall)
- Free ⚡70/day, 1 concurrent job; Starter $16/mo-annual 2,000 credits, 2 jobs, 5 brand kits; Basic $27 3,500/4/10; Pro $45 11,000/8/30; Ultimate $109 27,000/10/100; 无限低速生成 slow queue for Basic+; top-up credits last 366 days; per-model prices (GPT Image 2 1K low 1, Nano Banana Pro 14, Seedance 2.0 720p 90/5 s). `raw/paywall.txt`.

## Coverage
- Surfaces: home ✔, projects ✔, brand-kit ✔ (empty kit), canvas ✔ (idle, image/text/group/multi selected, more-menu, quick-edit, context-menu, crop, generator image/video, layers, files, history, collapsed, paywall, new-project, agent-running/done, generator-running, reloaded).
- Generations executed: 2 images (agent GPT Image 2 Low; generator node GPT Image 2). Video: none.
- Not covered (U): 试用 Lovart 新版本 shell; share dialog; 自定义工具栏 submenu; 导出 formats; 标记 tool; Mockup/扩展/多角度/图层拆分/放大/去背景/橡皮 panels (credit-priced); agent failure/cancel/retry; skill invocation flow; profile/help popovers (did not render in captures); filled brand kit; bulk project actions; delete flows (by policy).
- Method caveats: viewport 1040×797 (2× captures), popover text sometimes not in DOM dumps; selection driven via synthetic pointer events / tldraw editor API when CDP clicks were swallowed by overlays; two empty generator nodes inserted into the onboarding project were removed with `editor.deleteShapes` (its 更新于 changed).
