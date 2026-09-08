# Seko — UX patterns (2026-09-08)

| Pattern | Tier | Evidence |
|---|---|---|
| **Zero-step creation**: hitting `/infinite-canvas` creates and persists a canvas; no dialog, no name. Same for a blank node (`+ → 新建空白节点`). | O | canvas.blank, myspace.canvas-tab-populated |
| **Node-anchored generator inspector**: config panel (mode tabs · model · params · @subject · count · ✦cost · send) is rendered directly under the selected node, not in a side panel. | O | canvas.blank-node |
| **In-place typing of nodes**: a blank node becomes an image node on first submit (label + id change, same position). Generated result lives in the node. | O | canvas.node.image-submitted / -completed |
| **Derivation = new node + edge**: every "pro" operation (多角度, 故事推演, 图片超清, 画面切分, 合成视频) spawns a linked child to the right; source untouched. | O | canvas.node.multiangle-submitted |
| **Floating context toolbar** above the selected image node with 9 named ops + ··· overflow (剪裁/标注/水平翻转/局部重绘/元素添加) + 合成视频 + download. | O | canvas.node.image-completed |
| **Silent spend with live price chip**: no confirmation; ✦N recomputed when model/res change; balance in header updates immediately. | O | image-ratio-picker (7→4), Seko Image (→1), header 110→109→108 |
| **Queue upsell in the placeholder**: 排队中 shows 会员加速. | O | canvas.node.image-submitted |
| **Agent as a docked co-pilot**: right aside, open by default, closable, with suggestion cards, `/` skills, attachments, LLM picker, per-canvas history; selected node auto-attached as context. | O | canvas.blank, canvas.node.action-multiangle, canvas.agent-reply |
| **Transparent tool log**: agent turns render `已调用工具: 读取画布内容 / 多模态分析` rows before the answer. | O | canvas.agent-reply |
| **Library-as-modal**: 资产库, 主体库, 特效模版 open as large centred modals over the canvas (960/860/880 px), never as side panels. | O | canvas.rail-panel-47/-52, canvas.subject-library-modal |
| **Cross-modal continuity**: switching the same node's tab to 视频生成 carries the prompt and offers 首帧/尾帧. | O | canvas.node.video-tab |
| **Quick-start chips** on an empty canvas (Seedance2.5视频生成 / 九宫格图 / 提示词反推 / 720°全景图). | O | canvas.blank |
| **Deep-linkable selection** (`&nodeId=`). | O | URL during multi-angle |
| **Story shell reused for canvas** (title 未命名故事 + 编辑器 tab present but inert). | O | canvas.blank, editor.initial |
| **Onboarding via driver.js coach marks** (生成历史, 上传图片). | O | canvas.node.image-overflow-menu |
| Escape does not dismiss Radix popovers; outside click does; rail modals can stack. | O | observed during exploration |
