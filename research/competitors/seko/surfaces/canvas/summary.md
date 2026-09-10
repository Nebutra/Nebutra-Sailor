# seko.canvas — 无限画布 (inside the Story shell)

Route `/infinite-canvas?canvasId=<snowflake>[&nodeId=<snowflake>]`. React Flow graph canvas + right-hand Agent aside (~33 % width, closable) + left floating rail (+ / 资产库 / 主体库 / 特效模版) + bottom toolbar (自动布局 · 小地图 · 抓手 · 网格吸附 · zoom · 快捷键). 30 fingerprinted states, 33 transitions.

## Unit of work
- Visiting `/infinite-canvas` creates a persisted canvas instantly (URL rewrites with `canvasId`; card appears in my-space 画布) (O).
- Header reads 未命名故事 with 画布 / 编辑器 tabs, but the canvas is listed only under 画布, not 故事 (O) → canvas is its own object using the story shell.
- Node = the unit inside the canvas. A **blank node** carries a generator panel (文本/图片/视频/音频). Submitting converts it in place into a typed node (图片) with a server id (O).

## Generation lifecycle
- No confirm dialog; credits debited at submit (110→109→108) (O). Cost chip ✦N updates live with model/resolution (O).
- In-node status: 排队中 (+会员加速 upsell) → 生成中 → result rendered in the same node, ~60 s (O).
- Derived operations (多角度 ✦1) create a **new node to the right joined by an edge**; source unchanged; distinct asset URL (O). 故事推演 ✦10, 图片超清 ✦6, 画面切分 N×N, 合成视频 → composition node or 添加到编辑器 (O).
- Pro tools hidden under ···: 剪裁 / 标注 / 水平翻转 / 局部重绘 / 元素添加 (O).

## Persistence
- Navigate away + reopen by URL restores nodes, images, edge; the in-flight job finished server-side (O). 生成历史 keeps generated assets even if nodes are deleted (O, onboarding text). 资产库 modal imports assets from other stories/canvases/avatar videos (O).

## Agent
- Text request → visible tool calls (读取画布内容, 多模态分析) → text answer; no approval gate, no credit charge, canvas stays usable (O). Selecting a node auto-attaches it to the composer (O). Skills via `/`, LLM selectable (O).

## Identity
- `@` picker and 主体库 modal list ~62 public subjects; 添加新主体 = name + 角色/场景 + voice + image (O). Account-scoped (`/characters`) (O).

Evidence index: `states/*.json`. Key captures: `canvas.blank`, `canvas.blank-node`, `canvas.node.image-submitted`, `canvas.node.image-completed`, `canvas.node.action-multiangle`, `canvas.node.multiangle-submitted`, `canvas.reloaded`, `canvas.agent-reply`.
