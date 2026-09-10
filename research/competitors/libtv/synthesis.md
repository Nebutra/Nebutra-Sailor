# LibLib / LibTV — synthesis

Explored 2026-09-08 through the owner's Chrome (opencli bridge, session `libtv`). ~140 browser actions.
Two origins: **www.liblib.art** (community + consumer generators + hosted WebUI/ComfyUI + LoRA training)
and **www.liblib.tv** (LibTV, "专业视频创作工具" — a node-canvas project workspace with an agent).
The account was authenticated on the canvas (user `N`, team `团队`) but had **0 积分**, so no generation
or agent run was submitted. Everything below is O unless marked.

Surfaces mapped: `libtv.art-community`, `libtv.art-generator`, `libtv.tv-home`, `libtv.tv-skill`, `libtv.canvas`
(39 fingerprinted states, 47 transitions, 62 evidence captures).

## 1. Core unit of work — **O**

A LibTV **项目/工作区** (`/canvas?spaceId=&projectId=`) containing one or more **画布**, each a React Flow
node graph. The node is simultaneously the generation form and the result container. liblib.art has no
project object at all — its unit is one generator form or a WebUI session, with outputs in `/asset`.
Evidence: `evidence/libtv.canvas.new-project.webp`, `evidence/libtv.canvas.canvas-switcher.webp`,
`evidence/libtv.canvas.node-video-ref.webp`.

## 2. Persistence boundary — **O**

Server autosave with an explicit `待同步 / 同步中 / 已同步` indicator; nodes survived reload. Project
identity is in the URL; template launches (`sourceSpaceId`+`sourceProjectUuid`) clone into a new project
(`- 副本` node titles). History (`生成历史`) is persisted per canvas and per project with member attribution.
Auth + credits are shared across both origins via a `cross-storage-hub.html` iframe.
Evidence: `evidence/libtv.canvas.template-virtual-studio.webp`, `evidence/libtv.canvas.dock-gen-history.webp`.

## 3. Reusable identity — **O**

- **角色库**: platform-preset archetypes (甜妹/清新少女, 霸总/精英大佬, 古风男主 …), each a 4-image sheet
  (全身图 / 面部特写 / 表情九宫格 / 人物呈现板) with `应用至画布`; also a chip inside the video node. No
  user-created character seen (U). `evidence/libtv.canvas.dock-character-lib.webp`
- **特效** (community effects with author, usage count, 商用 badge) applied inside the node; locks the model.
  `evidence/libtv.canvas.node-fx-chip.webp`
- **素材库 / 工具箱** are team- or personal-scoped; **Skills** are public / 收藏 / 团队.
- On liblib.art, the identity primitive is the **LoRA** (typed model pages with versions, trigger word,
  推荐参数; trainable at `/pretrain`; consumed via `去WebUI使用`). `evidence/libtv.art-modelinfo.cta.webp`,
  `evidence/libtv.art-pretrain.webp`

## 4. Generation result object — **O / I2**

Result = the node (thumbnail/video, size label, `AI生成` badge) + a `生成历史` record (type 图片/视频/音频,
member, rating). Rating exists as a filter (`所有评级`) in both 生成历史 and 资产管理 (I2: per-result rating).
Results re-enter the graph via `从生成历史选择`. Batch `生成数量 1/2/4`; variant selection semantics U.
`evidence/libtv.canvas.node-config-popover.webp`, `evidence/libtv.canvas.asset-mgmt.webp`

## 5. Agent role — **O**

"LibTV Agent" is a right-docked, resizable drawer bound to the project (also a composer on home and
`/skill`). Composer: attachments, model chips (`添加模型`), Skill chips, `生成模式`, `@` references to
工作流/节点/资源; adding a node auto-inserts a locatable chip. **Agent 设置 → 协作模式** holds the autonomy
switch: `自动生成图片/视频 — 开启后，Agent 可直接消耗积分，提交图片/视频生成，无需逐次确认`, plus
`积分预算管理` with a per-project alert threshold (1000). Free tier: 3 rounds/day. Skills are community
recipes with declared inputs/outputs ("从 Skill 出发，抵达成片"). Output of a run = nodes on the canvas
(I2, from published graphs 资产 → 分镜 → 视频). `evidence/libtv.canvas.agent-settings.webp`,
`evidence/libtv.canvas.agent-model-picker.webp`, `evidence/libtv.skill.detail.webp`

## 6. Canvas role — **O**

The canvas is the entire professional tool: chrome ≈ 8 % (top bar + floating dock), two views of the same
graph (`工作流` node view ↔ `故事板` type-grouped columns with DnD), left `资产管理` outliner (画布/资产 tabs,
search, rating filter), minimap, edge hiding, grid snap. Node types: 文本, 图片, 视频, 智能剪辑 (Beta; needs
upstream video; presets 讲解视频/批量广告/口播视频/素材混剪), 导演台 (NEW), 逐帧拉片, 音频, 脚本, 素材库,
group. Parameter disclosure on the video node: tier 1 chips + prompt + compact config string; tier 2 popover
(ratio, 480P–4K, 4–15 s, audio, count); tier 3 `高级设置` (联网搜索, 自动校验素材, 智能引用 AutoLink).
Selection is implicit — no inspector appears on click; right-click gives clipboard/layout/delete (I2).
`evidence/libtv.canvas.storyboard-mode.webp`, `evidence/libtv.canvas.dock-toolbox.webp`,
`evidence/libtv.canvas.node-context-menu.webp`, `evidence/libtv.canvas.node-smart-edit.webp`

## 7. Professional tool entry — **O**

**Not a page, modal, tab or mode.** LibTV home is a grid of launchers; each resolves to `/canvas`:
`新建画布创作` → `?newProject=true&createWorkspace=true`; 导演台 / 逐帧拉片 / 片段重拍 / Seedance 2.5 /
Wan 3.0 / Minimax H3 Max → `?sourceSpaceId=…&sourceProjectUuid=…[&model=star-video2.5]` (template clone).
Inside the canvas the tools are **node types**: 导演台 is an n-node ("在3D空间中搭建场景并进行多视角截图",
`打开导演台`) feeding a `动画导出` video node; 逐帧拉片 is a pre-built graph (分镜组 groups → shot image
nodes S07…S12 with camera/angle titles → motion video nodes M01…M03 1920×1080 → BGM audio node). The 3D
导演台 editor itself could not be opened in the bridge (U). No timeline/NLE surface observed (U).
`evidence/libtv.tv-home.default.webp`, `evidence/libtv.canvas.template-shot-breakdown.webp`,
`evidence/libtv.canvas.template-virtual-studio.webp`

## 8. Review / versioning / community loop — **O**

No compare or version-history verbs on nodes or projects. Sharing has two verbs: `在LibTV上发布` ("发布你的作品
**和创作过程**") and `分享链接` ("可以查看并复制你的画布"). Community cards expose `查看创作过程` → a full-screen
**read-only canvas** of the author's graph (只读模式) with `复制项目`. This is the community→model→generation
link on LibTV: process graphs are the shared artifact. On liblib.art the link is `做同款` (image post →
`/ai-tool/image-generator?fillimgid=…`) and `去WebUI使用` (LoRA → `/sd`).
`evidence/libtv.tvshow.detail.webp`, `evidence/libtv.canvas.publish-share.webp`,
`evidence/libtv.art-imageinfo.default.webp`

## 9. Community → model → generation (liblib.art) — **O**

Feed tabs 图片模型 / 视频特效 / 发现灵感 / 工作流; cards typed Checkpoint / LORA / 模板. Model page: versions,
基础算法, 触发词, 推荐参数 (checkpoint, weight 0.7, CFG, VAE, upscaler), 许可范围, `会员下载`. Consumer
generators (`/ai-tool/*`) use closed API models with capability badges (多参考图, 超清4K, 组图模式,
指令编辑强) plus a `风格模型` picker of community LoRA cards; `/sd` exposes the full A1111 surface; `/comfy`
and `/lib3` host workflows/apps. Credits and membership are the same across both origins (VIP models,
限时 4x 折 upsell in every header including the canvas).

## Coverage

| Area | Status |
|---|---|
| tv-home launchers, feed, viewer (工作流 + 故事板) | done |
| canvas: dock panels, top bar, Agent drawer + settings + model picker, node config/fx/context, storyboard, templates 导演台 & 逐帧拉片, 智能剪辑 node | done |
| skill marketplace + detail | done |
| liblib.art: feed, model page, image page, image/video generator + config + model picker, asset, pretrain, sd, comfy, lib3 | enumerated |
| generation job lifecycle, variant selection, agent run/approval UI | **not exercised (0 credits, CAPTCHA on liblib.art)** |
| 导演台 3D editor, 片段重拍 template, 脚本/素材库 submenus, 快捷键/教程, CLI & Skill, 生成模式 menu, 创作者挑战赛, Blender 插件 | U / not opened |
| billing, profile, settings | enumerated from chrome only (积分超市, 会员中心, 团队) |

Blockers: zero credits on the account; `window.open` launches land on `about:blank` in the bridge (worked
around by trapping the URL); some div-based cards need hover before click; ugrep alias breaks wide regexes.
