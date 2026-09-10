# Progressive disclosure — always / hover / select / on-demand / advanced-only, and where model params live

Sources: `research/competitors/<slug>/ux/disclosure-matrix.md`, `ux/patterns.md`, `ux/density.yaml`. Tiers per line;
all cells O unless marked.

## Evidence

### Disclosure matrix on the production surface

| Level | Seko canvas | TapNow canvas | Flowith flow | Lovart canvas | LibTV canvas | fal playground |
|---|---|---|---|---|---|---|
| **Always** | header (credits, share, Agent toggle) · left rail (4) · bottom bar (8: 自动布局, minimap, 抓手, 网格吸附, zoom…) · minimap · **agent aside open** · 画布/编辑器 tabs | header (title, switcher, Tapies, Community, Share) · dock rail (⊕ search library comment history) · bottom controls · **agent panel open** (collapsible) | title bar (switcher, Share, Comment, Minimize, Organize, zoom, Composer menu) · left dock pill (Free Node, Search, Media History, Knowledge) · **collapsed one-line composer** · credit badge | promo banner · top bar · bottom dock (10 tools) · bottom-left cluster (背景/图层/生成文件/minimap/zoom) · **agent panel open** | top bar (sync indicator, 积分, 会员) · floating dock · **node forms always rendered** · agent drawer optional | announcement bar · nav · model header · 5 tabs · input card (Prompt only) · result card (never empty: sample) · cost line |
| **Hover** | tooltips · node corner download icon | tooltips (dock, controls, toolbar) · project card ⋯ / rename (workspace) | tooltips | tooltips · TV-style card hover N/A | chip tooltips (新功能：支持真人) · TV Show card hover 查看创作过程 | (i) popovers per param |
| **Select** | floating toolbar (9 + ··· + 合成视频 + ⬇) · inspector under node (mode tabs · model · ratio/res · @ · count · ✦ · send) · `+` handles · agent chip | floating toolbar · title input · generation bar · Reference handle · composer chip | node toolbar (type-specific) · Follow Up · Add handle · composer expands (mode strip, tokens, footer) | floating toolbar (10) · name+size label · composer chip; text → typography bar; multi → arrange bar | **nothing** (implicit selection) | – |
| **On demand (click)** | model picker · ratio picker · `@` picker · 上传/选择 popover · 资产库/主体库/特效模版 modals · agent skills / model / attachments / history popovers · 发布作品 modal · nav drawer | model list · params popover · variations · Add Nodes palette (⊕ / right-click) · Library / History drawers · AI Character library · Settings modal · Image Editor overlay · confirm-mode menu · LLM menu · chat history · action-log expand · approval card | mode chip → mode controls · Vary mini form · Upscale menu · Search modal · Media History drawer · Knowledge modal · Share dialog · title menu · pane right-click · zoom menu | ··· overflow (8) · right-click (19) · 裁剪 panel · 快捷编辑 (Tab) sub-mode · 图层 / 生成文件 drawers · 画布背景 · logo menu (12) · title chevron 品牌套件 · 画布历史 full-screen · generator node composer popovers · Skill book · 模型偏好 | compact config chip `16:9 · 720P · 5s · 1个` → popover · model picker · mode picker · 特效广场 modal · 角色库 · 运镜 · 添加节点 popover (dbl-click) · dock panels (生成历史, 素材库, 工具箱, 资产管理) · agent drawer · Agent 设置 · 画布 switcher · 发布与分享 | "Additional Settings · More" (+8 inline) · Form/JSON toggle · Preview/JSON · chain ▾ menus · Sandbox Advanced input panel · credits popover |
| **Advanced-only** | ··· overflow (剪裁 · 标注 · 水平翻转 · 局部重绘 · 元素添加) · multi-angle orbit widget (replaces inspector) · 快捷键 panel · keyboard-only grouping/marquee | in-node tool panels (cube / lights / mask) · hotkeys list · Timeline Editor / 3D Studio (open elsewhere) | plan-gated: Edit, batch 2X/4X, t1 models, Unlimited (locks) · keyboard ⌘0 ⌘1 ↑↑ ↓↓ E F | 调整 (paywall) · 自定义工具栏 · 导出 PSD · 字体生成器 Beta | `高级设置` group (联网搜索 · 自动校验素材 · 智能引用 AutoLink) · 快捷键 · CLI & Skill panel · /sd WebUI exposes everything | API-only param shown locked ("cannot be disabled on the playground") · seed / CFG / steps behind More |

Evidence: `seko/evidence/canvas.blank.webp`, `canvas.node.image-completed.webp`, `canvas.node.image-overflow-menu.webp`;
`tapnow/evidence/canvas.default.webp`, `canvas.node.text-selected.webp`, `canvas.node.image.tool-change-angle.webp`;
`flowith/evidence/canvas.welcome.default.webp`, `canvas.welcome.image-node-selected.webp`, `canvas.welcome.minimized.webp`;
`lovart/evidence/canvas.reset.webp`, `canvas.image-selected.webp`, `canvas.image-selected.quick-edit.webp`;
`libtv/evidence/libtv.canvas.node-video-ref.webp`, `libtv.canvas.node-config-popover.webp`, `libtv.canvas.node-selected.webp`;
`fal/evidence/model.schnell.webp`, `model.schnell.advanced.webp`, `pg.promptinfo.webp`.

### Where model parameters live

| | Tier 1 (visible once the generator is in view) | Tier 2 (one click) | Tier 3 (labelled advanced) | Anchor |
|---|---|---|---|---|
| Seko | mode tab · prompt · model chip · ratio/res chip · `@` · count · ✦ price · send | model picker (20/31 with res·duration·音效 tags) · ratio picker · `@` picker | ··· ops · orbit widget | **under the selected node** (inspector) |
| TapNow | prompt · model · aspect · quality · count · cost · Generate | model menu (tags NEW/HOT/cost/latency) · params popover · variations | in-node tool panels | **inside the node** (generation bar) |
| Flowith | mode chip · model · attach · batch `1 x` · Send | mode controls (Style +, ratio, size, keyframes, Agent off, MAX) · Vary form (batch, ratio, shortlist, cost sentence) | locks | **bottom composer** (+ node-anchored Vary) |
| Lovart | generator node: 参考图 · prompt · size · model · ⚡ | 质量/尺寸/宽高比(2k·4k)/数量 1–10 popover · 22-model popover · 模型偏好 (agent) | 调整 paywall | **under the generator node** / agent composer |
| LibTV | prompt · model chip `2.0` · mode chip `全能参考` · **compact config chip** `16:9 · 720P · 5s · 1个` · chips 参考/标记/特效/角色库/运镜 · ▶ | config popover (ratio, 480P–4K, 4–15 s, audio, count 1/2/4) · model picker · mode picker | `高级设置` (联网搜索, 自动校验素材, AutoLink) | **on the node**, always |
| fal | required params only (Prompt) · cost line · Run | "More": steps, size, seed, CFG, sync, num_images, safety, format, acceleration — inline, each with (i) from schema | locked API-only param | **input card** of the model page |

Counts: params anchored to the node/composer, never a side panel — **6 of 6**. Compact summary chip → popover: LibTV
(O), Seko chips (O), TapNow bar items (O) — 3. Explicit "advanced" group: LibTV, fal (O) — 2; overflow menu as the
advanced tier: Seko, Lovart (O) — 2. Cost shown at tier 1: Seko, TapNow, Lovart, fal (O) — 4. Model catalogue with
capability/price tags in the picker: Seko, TapNow, Flowith (client cache), LibTV (badges), fal (O) — 5.

### Empty-state disclosure

- Quick-start chips/templates on an empty canvas: Seko 4 chips (O), LibTV 4 templates + 双击 hint (O), Lovart hint +
  skills (O), TapNow suggestion cards in the agent panel (O), fal sample prompt + sample result (O) — 5.
- Sidebar collapses on entering the document: Flowith (O). Agent collapses to a button: Lovart (O), TapNow (O).

## Pattern

1. **Selection is the disclosure gate** in four products: nothing about a node is visible until it is selected, then
   toolbar + generator appear next to it. LibTV inverts this (always-on forms) and fal has no selection.
2. **Params are tiered 1-2-3 at the node**: a prompt + model + one summary chip visible; a popover per group on click;
   a labelled advanced group or overflow for the rest. Nobody moves params to a side panel.
3. **Cost and model are tier 1** wherever there is a price.
4. **Advanced ≠ hidden**: fal shows a locked param with an explanation; LibTV names the group 高级设置.
5. **The always-visible layer is chrome, not content**: header, a rail/dock, zoom, and — in three products — the
   agent panel.

## PARA decision

| Element | Rule | Supporters | Decision |
|---|---|---|---|
| Node-specific UI appears only on selection | A | Seko, TapNow, Flowith, Lovart (O) | **A — adopt** (AC-02, AC-06). |
| Generator params tiered at the node: prompt + model + summary chip → popover → advanced group | A | Seko, TapNow, LibTV, Lovart (O); fal inline "More" (O) | **A — adopt** for the M2 generator; M1 renders the tier-1 row as a skeleton. |
| Summary chip that opens the param popover (`16:9 · 720P · 5s · 1个`) | B | LibTV (O), Seko chips (O) | **B — adopt** (PARA's ≤25 % chrome logic supports compressing params to one chip). |
| Labelled advanced group rather than hidden params | B | LibTV, fal (O) | **B — adopt** ("Advanced" disclosure inside the node popover). |
| Cost at tier 1 next to the trigger | A | Seko, TapNow, Lovart, fal (O) | **A — adopt.** |
| Model picker with capability/price tags | A | Seko, TapNow, LibTV, fal, Flowith (O) | **A — adopt** shape; catalogue is backend work. |
| Empty-canvas quick starts | A | Seko, LibTV, Lovart, TapNow, fal (O) | **A — adopt** for "Workspace idle" (chips in the composer/drop zone, not a permanent panel). |
| Agent panel in the always-visible layer | A | Seko, TapNow, Lovart (O) | A holds; PARA departs on business logic — see `agent-patterns.md` (**B** via Flowith + LibTV). |
| Locked param shown with explanation instead of hidden | B | fal (O) | **B — adopt** for plan-gated params (PARA billing logic). |
| Always-on node forms (LibTV) | — | LibTV only | **Not adopted** (contradicts A above). |
