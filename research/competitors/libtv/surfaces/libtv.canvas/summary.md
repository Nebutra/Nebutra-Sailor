# libtv.canvas — summary

States: 20 · Transitions: 23 · Explored 2026-09-08 (owner session via opencli bridge; credits 0, no generation submitted).

## States

- `libtv.canvas.default` — tab 工作流 · overlay none · selected none — ![](../../evidence/libtv.canvas.new-project.webp)
- `libtv.canvas.add-node-popover` — tab 工作流 · overlay add-node-popover · selected none — ![](../../evidence/libtv.canvas.dblclick.webp)
- `libtv.canvas.toolbox-panel` — tab 工作流 · overlay toolbox-panel · selected none — ![](../../evidence/libtv.canvas.dock-toolbox.webp)
- `libtv.canvas.character-library` — tab 工作流 · overlay character-library-modal · selected character:甜妹/清新少女 — ![](../../evidence/libtv.canvas.dock-character-lib.webp)
- `libtv.canvas.generation-history` — tab 工作流 · overlay generation-history-panel · selected none — ![](../../evidence/libtv.canvas.dock-gen-history.webp)
- `libtv.canvas.asset-mgmt-panel` — tab 工作流 · overlay asset-mgmt-side-panel · selected none — ![](../../evidence/libtv.canvas.asset-mgmt.webp)
- `libtv.canvas.storyboard-mode` — tab 故事板 · overlay none · selected none — ![](../../evidence/libtv.canvas.storyboard-mode.webp)
- `libtv.canvas.canvas-switcher` — tab 工作流 · overlay canvas-switcher · selected none — ![](../../evidence/libtv.canvas.canvas-switcher.webp)
- `libtv.canvas.publish-share` — tab 工作流 · overlay publish-share-popover · selected none — ![](../../evidence/libtv.canvas.publish-share.webp)
- `libtv.canvas.collab-presence` — tab 工作流 · overlay collab-presence · selected none — ![](../../evidence/libtv.canvas.collab.webp)
- `libtv.canvas.agent-drawer` — tab 工作流 · overlay agent-drawer · selected conversation:新对话 — ![](../../evidence/libtv.canvas.agent-drawer.webp)
- `libtv.canvas.agent-settings` — tab 工作流 · overlay agent-settings-modal · selected none — ![](../../evidence/libtv.canvas.agent-settings.webp)
- `libtv.canvas.agent-model-picker` — tab 工作流 · overlay agent-model-picker · selected none — ![](../../evidence/libtv.canvas.agent-model-picker.webp)
- `libtv.canvas.video-node-default` — tab 工作流 · overlay none · selected node:视频 (v) — ![](../../evidence/libtv.canvas.node-video-ref.webp)
- `libtv.canvas.video-node-config` — tab 工作流 · overlay node-config-popover · selected node:视频 (v) — ![](../../evidence/libtv.canvas.node-config-popover.webp)
- `libtv.canvas.video-node-fx-picker` — tab 工作流 · overlay node-fx-picker · selected node:视频 (v) — ![](../../evidence/libtv.canvas.node-fx-chip.webp)
- `libtv.canvas.node-context-menu` — tab 工作流 · overlay node-context-menu · selected node:视频 (v) — ![](../../evidence/libtv.canvas.node-context-menu.webp)
- `libtv.canvas.smart-edit-node` — tab 工作流 · overlay none · selected node:智能剪辑 1 — ![](../../evidence/libtv.canvas.node-smart-edit.webp)
- `libtv.canvas.template-virtual-studio` — tab 工作流 · overlay none · selected none — ![](../../evidence/libtv.canvas.template-virtual-studio.webp)
- `libtv.canvas.template-shot-breakdown` — tab 工作流 · overlay none · selected none — ![](../../evidence/libtv.canvas.template-shot-breakdown.webp)

## Key observations

- **O** (libtv.canvas.default) Created by 新建项目 with zero dialogs; Agent drawer opened automatically in 新对话.
- **O** (libtv.canvas.default) Chrome is ~8% of the viewport; the rest is the pane.
- **O** (libtv.canvas.add-node-popover) Same popover from + button and from double-clicking the pane.
- **O** (libtv.canvas.toolbox-panel) Team-scoped saved tool templates; empty for this account.
- **O** (libtv.canvas.character-library) Selected archetype shows tags 女主 女 现代 青年 温柔 and a 4-panel identity sheet.
- **I2** (libtv.canvas.character-library) Character identity = a bundle of reference images, not a trained model; scope is platform preset (no create/own tab seen).
- **O** (libtv.canvas.generation-history) History is scoped to canvas or workspace and filterable by member and rating.
- **O** (libtv.canvas.asset-mgmt-panel) Node list doubles as the layer/outliner panel; rating filter present here too.
- **O** (libtv.canvas.storyboard-mode) Mode toggle does not change URL.
- **O** (libtv.canvas.canvas-switcher) One project can hold multiple canvases.
- **O** (libtv.canvas.publish-share) Publishing explicitly includes the creation process (the graph).
- **O** (libtv.canvas.collab-presence) Real-time presence with invite; suggests multi-user canvas (not tested).
- **O** (libtv.canvas.agent-drawer) Conversation is per project; 新对话无法分享 implies conversations become shareable once started.
- **O** (libtv.canvas.agent-settings) Autonomy switch: 开启后，Agent 可直接消耗积分，提交图片/视频生成，无需逐次确认.
- **O** (libtv.canvas.agent-model-picker) 添加模型 inserts a model chip into the composer text (mention-style).
- **O** (libtv.canvas.video-node-default) Template = image node wired to a video node; all controls live on the node card.
- **O** (libtv.canvas.video-node-default) Sync status flipped 待同步/同步中 → 已同步 after creation.
- **O** (libtv.canvas.video-node-config) Second-tier parameters; batch count max 4.
- **O** (libtv.canvas.video-node-fx-picker) Community-authored effects with usage counts and commercial badge; applying one locks the node's model.
- **O** (libtv.canvas.node-context-menu) No 'compare' or 'version' verbs in the node menu.
- **O** (libtv.canvas.smart-edit-node) Edit node requires upstream video nodes (graph dependency).
- **O** (libtv.canvas.template-virtual-studio) Clone of the 导演台 template; node titles suffixed - 副本.
- **U** (libtv.canvas.template-virtual-studio) 打开导演台 did not open anything observable.
- **O** (libtv.canvas.template-shot-breakdown) 逐帧拉片 = pre-built shot-breakdown graph (groups → shots → motion clips → BGM) rather than a dedicated timeline tool.

## Transitions

- libtv.canvas.default —[click: 添加节点 (+)]→ libtv.canvas.add-node-popover (O)
- libtv.canvas.default —[double_click: canvas pane]→ libtv.canvas.add-node-popover (O)
- libtv.canvas.default —[click: 打开工具箱]→ libtv.canvas.toolbox-panel (O)
- libtv.canvas.default —[click: 角色库]→ libtv.canvas.character-library · overlay.opened (O)
- libtv.canvas.default —[click: 生成历史]→ libtv.canvas.generation-history (O)
- libtv.canvas.default —[click: 资产管理]→ libtv.canvas.asset-mgmt-panel (O)
- libtv.canvas.default —[click: 故事板]→ libtv.canvas.storyboard-mode (O)
- libtv.canvas.storyboard-mode —[click: 工作流]→ libtv.canvas.default (O)
- libtv.canvas.default —[click: 画布 1 ▾]→ libtv.canvas.canvas-switcher (O)
- libtv.canvas.default —[click: 发布与分享]→ libtv.canvas.publish-share (O)
- libtv.canvas.default —[click: 协作者：1 人]→ libtv.canvas.collab-presence (O)
- libtv.canvas.default —[click: 打开 Agent]→ libtv.canvas.agent-drawer · drawer.opened (O)
- libtv.canvas.agent-drawer —[click: Agent 设置]→ libtv.canvas.agent-settings · overlay.opened (O)
- libtv.canvas.agent-drawer —[click: 选择模型]→ libtv.canvas.agent-model-picker (O)
- libtv.canvas.agent-model-picker —[click: 添加模型 Seedance 2.0 Fast VIP]→ libtv.canvas.agent-drawer · composer.chip.inserted (O)
- libtv.canvas.default —[click: 全能参考生视频 (empty state)]→ libtv.canvas.video-node-default · node.created ×2, edge.created, sync 同步中→已同步, composer.chip.inserted (O)
- libtv.canvas.video-node-default —[refresh: browser reload]→ libtv.canvas.video-node-default · nodes persisted (2) (O)
- libtv.canvas.video-node-default —[click: 16:9 · 720P · 5s · 1个]→ libtv.canvas.video-node-config (O)
- libtv.canvas.video-node-default —[click: 特效]→ libtv.canvas.video-node-fx-picker · overlay.opened (O)
- libtv.canvas.video-node-default —[right_click: video node]→ libtv.canvas.node-context-menu (O)
- libtv.canvas.video-node-default —[click: video node body]→ libtv.canvas.video-node-default · no DOM change (selection not reflected) (O)
- libtv.canvas.add-node-popover —[click: 智能剪辑]→ libtv.canvas.smart-edit-node · node.created, composer.chip.inserted (O)
- libtv.canvas.template-virtual-studio —[click: 打开导演台]→ libtv.canvas.template-virtual-studio · nothing observable (U)
