# Seko (SenseTime) — competitor synthesis · explored 2026-09-08 (authenticated, owner session, 110 → 108 credits)

Tiers: **O** observed · **I2** strongly inferred · **I1** weak · **U** unknown. Evidence paths are relative to `research/competitors/seko/`.

## 1. Core unit of work — **Canvas of Nodes** (O)
- `/infinite-canvas` creates a persisted canvas on visit (URL → `?canvasId=…`, card in my-space 画布) — zero-step creation. `evidence/canvas.blank.webp`, `evidence/myspace.canvas-tab-populated.webp`
- A **node** is one generation slot with its own inspector (文本/图片/视频/音频 tabs). Blank node → typed node in place on first submit (id uuid→snowflake, label 空白节点→图片). `evidence/canvas.blank-node.webp`, `evidence/canvas.node.image-submitted.webp`
- Three top-level work objects live in my-space: **故事** (story/策划案, genre-tagged), **画布**, **数字人**. A canvas is *not* a story even though it wears the story shell (title 未命名故事 + 编辑器 tab). (O) `evidence/myspace.list.webp`
- Story pipeline (hero 短片工作室: prompt + script upload + Seedance2.5 全能模式 + 多剧集) — **U** internally; not submitted (video spend).

## 2. Persistence boundary (O)
- Everything is server-persisted continuously: nodes, edges, per-node config, images; a job started before leaving completed while away; reopening by URL restores all. `evidence/canvas.reloaded.webp`
- Assets outlive nodes (生成历史 coach mark) and are importable across projects via 资产库 (scopes 当前项目/故事/数字人/画布). `evidence/canvas.rail-panel-47.webp`
- Selection is in the URL (`&nodeId`); tab state in the URL (`?tab=`).

## 3. Reusable identity — **主体 Subject** (O)
- Account-level library `/characters` (个人添加 / 公共主体, 批量上传主体) = canvas rail modal = `@` picker in prompts. ~62 public presets. `evidence/characters.list.webp`, `evidence/canvas.node.at-reference-picker.webp`
- Subject = 名称 + 类别(角色|场景) + 音色 (voice) + 形象 (upload or AI-generate). Reference capacity is per model (3–14). `evidence/canvas.subject-create-form.webp`, `evidence/canvas.node.image-model-picker.webp`

## 4. Generation result object (O)
- Result renders **inside the node**; first generation replaces the blank node; every derived op (多角度 ✦1, 故事推演 ✦10, 图片超清 ✦6, 画面切分, 合成视频) makes a **new child node + edge** to the right — source never overwritten. Distinct asset URL. `evidence/canvas.node.multiangle-submitted.webp`, `evidence/canvas.node.action-multiangle.webp`
- Silent spend: no confirmation, ✦ chip live-priced (即梦 5.0 Pro 2K ✦7 → 1K ✦4 → Seko Image ✦1), header balance drops at submit. `evidence/canvas.node.image-ratio-picker.webp`
- Lifecycle in node: 排队中 (+会员加速) → 生成中 → done (~60 s). No job center anywhere (O-negative). Failure UI **U**.
- Catalogue: 20 image / 31 video / Mureka audio models, multi-vendor, with per-model res·duration·音效同出 metadata. `evidence/canvas.node.video-model-picker.webp`
- No compare / approve / version UI on the canvas (O-negative); undo/redo + grouping via shortcuts. `evidence/canvas.shortcuts-dialog.webp`

## 5. Agent role — **docked co-pilot with tool log** (O)
- Right aside (~33 % width) open by default on every canvas; composer has `/` skills, `@`, attachments (上传附件 / 从画布上选择), LLM picker (9 models + 智能选择), per-canvas 对话历史. `evidence/canvas.agent-skill.webp`, `evidence/canvas.agent-model.webp`
- Selecting a node auto-attaches it as context. Turn = 正在思考 → `已调用工具: 读取画布内容 / 多模态分析` → answer; non-blocking; free for text. `evidence/canvas.agent-reply.webp`
- Plan display / approval before spending: **U** (not exercised).
- Skills = packaged workflows (`/skill-community`, 8 categories, usage counters; top: 山音编剧大师2.0 26k uses). `evidence/skills.list.webp`

## 6. Canvas role (O)
- The canvas **is** the production surface (React Flow): quick-start chips on empty canvas, + rail, drag-drop upload, floating node toolbar, node-anchored inspector, minimap, 自动布局, 网格吸附, marquee, grouping. Libraries (资产库 / 主体库 / 特效模版) are large modals over the canvas. `evidence/canvas.subject-library-modal.webp`, `evidence/canvas.rail-panel-52.webp`

## 7. Professional tool entry (O)
- Selection-scoped floating toolbar on image nodes: 全景 · 多角度 · 九宫格 · 画面切分 · 打光 · 故事推演 · 对口型 · 消除笔 · 图片超清 · ··· (剪裁 / 标注 / 水平翻转 / 局部重绘 / 元素添加) · 合成视频 · download. Parametric tools open an inline panel that *replaces* the inspector (多角度 orbit widget). `evidence/canvas.node.image-completed.webp`, `evidence/canvas.node.image-overflow-menu.webp`
- 编辑器 tab exists in the shell but is inert on an image-only canvas (I2: timeline for compositions via 合成视频 → 添加到编辑器). `evidence/editor.initial.webp`
- 数字人视频 is a separate one-page form (portrait + TTS/voice → 可灵数字人 720P). `evidence/avatar.home.webp`

## 8. Review / versioning
- None observed: no versions, no compare, no approve. The graph + 生成历史 is the history model (O). Publishing (发布作品 with 公开画布 switch) is the only "release" step (O, not submitted). `evidence/canvas.share-popover.webp`

## Surfaces explored / not explored
Explored (states): explore (2), my-space (4), canvas (30 + agent reply), characters (1), skill-community (1), avatar-video (1). 6 surfaces · 39 states · 41 transitions · 2 image generations spent (✦2).
Not explored: story pipeline (短片工作室 submit, story project surfaces, 编辑器 timeline) — would trigger video spend; skill detail page (card had no handler/href); node ops 全景/九宫格/打光/对口型/消除笔 and ··· editors (may spend); publish; billing/profile (P4, enumerated only: 开通会员, 3 header popovers, help center); double-click / right-click / drag-drop on canvas (not exercised via CLI).
