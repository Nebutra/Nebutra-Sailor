# Seko — persistence boundaries

| Question | Answer | Tier | Evidence |
|---|---|---|---|
| When is a canvas persisted? | On first visit to `/infinite-canvas`; URL rewrites with `canvasId`; my-space card appears immediately | O | canvas.blank, myspace.canvas-tab-populated |
| Are nodes/edges persisted without explicit save? | Yes — leave to my-space, reopen by URL: nodes, images, edge restored | O | canvas.reloaded |
| Does a running job survive navigation? | Yes — 多角度 job completed while the page was on my-space | O | canvas.reloaded |
| Is generator config persisted per node? | Yes — reselecting the node shows its prompt/model/res | O | canvas.node.image-completed |
| Is selection persisted? | In URL (`&nodeId`) only | O | URL |
| Are generated assets independent of nodes? | Yes — 生成历史 keeps them if nodes are deleted; 资产库 imports across projects | O (text) | canvas.node.image-overflow-menu (coach mark), canvas.rail-panel-47 |
| Scope of subjects | Account (`/characters`), plus platform presets | O | characters.list |
| Agent conversation | Per canvas (对话历史), 新对话 resets | O | canvas.agent-history |
| Canvas vs Story | Separate lists in my-space; canvas uses story shell | O | myspace.canvas-tab-populated + story tab empty |
| Tab state | In URL (`?tab=`) | O | myspace.canvas-tab |
