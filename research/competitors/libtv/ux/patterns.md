# UX patterns — LibLib / LibTV (tiered)

- **O · Canvas-as-tool.** Every "professional tool" (导演台, 逐帧拉片, 片段重拍, model launchers) is a template that clones into the one node-canvas surface (`/canvas`). There is no tool page, modal or workspace mode; templates parametrize the canvas. Evidence: `evidence/libtv.tv-home.default.webp`, `evidence/libtv.canvas.template-shot-breakdown.webp`.
- **O · Node = form + result.** Prompt, model chip, mode chip, compact config string and chips (参考/标记/特效/角色库/运镜) are rendered on the node; the output fills the same card (AI生成 badge). No selection-driven right inspector. `evidence/libtv.canvas.node-video-ref.webp`.
- **O · Compact config chip → popover.** `16:9 · 720P · 5s · 1个` summarises tier-2 parameters; clicking opens the popover. Same idiom on liblib.art (`1:1 | 1 张`, `智能比例 | 720p | 5s | 有配音`). `evidence/libtv.canvas.node-config-popover.webp`, `evidence/libtv.art-video-gen.settings-popover.webp`.
- **O · @-mention references.** Prompts reference nodes/assets with `@` (canvas node: "@引用素材"; Agent: "@ 引用工作流/节点/资源"; liblib.art video: "让@图片1动起来像@视频1"). Adding a node auto-inserts a chip into the Agent composer.
- **O · Two views of one graph.** 工作流 (React Flow) ↔ 故事板 (type-grouped columns with DnD); toggle does not change URL. `evidence/libtv.canvas.storyboard-mode.webp`, `evidence/libtv.tvshow.detail-storyboard.webp`.
- **O · Publish process, not just output.** 在LibTV上发布 publishes "作品和创作过程"; consumers open a full-screen read-only canvas (只读模式) and 复制项目. `evidence/libtv.tvshow.detail.webp`.
- **O · Agent as docked drawer with autonomy switch.** Right drawer bound to the project; Agent 设置 exposes 自动生成图片/视频 (spend credits without per-step confirm) and a per-project credit alert threshold. `evidence/libtv.canvas.agent-settings.webp`.
- **O · Skills as recipes.** Marketplace cards document inputs/outputs; a skill is applied by inserting a chip into the composer. `evidence/libtv.skill.detail.webp`.
- **O · Community assets consumed in-node.** 特效广场 (authored effects with 商用 badge, usage counts) opens from a node chip; applying one locks the model. `evidence/libtv.canvas.node-fx-chip.webp`.
- **O · Preset identity library.** 角色库 ships archetypes as 4-image sheets (全身/面部/表情九宫格/呈现板) with 应用至画布. `evidence/libtv.canvas.dock-character-lib.webp`.
- **O · Rating as a first-class filter.** 所有评级 appears in 生成历史 and 资产管理, implying per-result ratings without a dedicated compare view.
- **O · Persistent commerce chrome.** 开通会员 限时 4x 折, 积分 counter, promo countdown banner are visible on every surface including the canvas top bar.
- **O · Empty-state quick starts.** Fresh canvas shows 4 template buttons + "双击画布 自由生成节点".
- **I2 · Selection is implicit.** Clicking a node produced no DOM change; node toolbars are always visible; multi-select semantics unknown (U).
