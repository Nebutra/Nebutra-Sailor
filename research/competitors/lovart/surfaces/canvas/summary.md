# lovart.canvas — the work surface

**Shell** (O): tldraw canvas left (≈62% width at 1040px), persistent agent panel right (≈38%, collapsible to a 对话 button), bottom dock of 10 tools, bottom-left 画布背景 / 图层 / 生成文件 / 小地图 / zoom, top-left logo app-menu + editable title + brand-kit chevron, top-right credits. Chrome ratio ≈0.45 with the panel open. Evidence: `canvas.populated`, `canvas.agent-collapsed`.

**Selection** (O): one image → floating toolbar above it (快捷编辑 Tab · 放大 · 去背景 · 橡皮工具 · 图层拆分 · 编辑文字 · 多角度 · 动态图片 · ··· · ⬇), a name/size label, and the shape auto-inserted as a chip in the agent composer. ··· holds 移动对象 / Mockup / 扩展 / 调整 (paywalled) / 裁剪 / 矢量 ⚡9 / 翻转与旋转 / 自定义工具栏. Right-click adds 发送至对话, 合并图层, 自动整理, z-order, lock/hide, 导出. Text → font/fill/stroke bar; group → 解除编组; multi → 自动整理 / 创建编组 / 合并图层 / align / arrange / 下载·导出 PSD. No right inspector anywhere. Evidence: `canvas.image-selected*`, `canvas.text-selected`, `canvas.multi-selected`.

**Quick edit** (O): Tab zooms the camera to the image and shows a one-image edit composer (Run ⚡14 + priced suggestion chips). Survives reload.

**Generation** (O): two paths. (1) Agent composer → thread auto-titled, `c-task` placeholder on canvas, step card "GPT Image 2 / 生成中", status row with elapsed/ETA, stop button; ~45 s later placeholder becomes `c-image` with `agentMeta` (threadId, actionId, agentName CreationPlanner, toolCallId, rootTaskId); credits charged at completion (−3). (2) 图像生成器 dock tool → `c-generator` node with its own composer (质量 / 尺寸+宽高比 / 数量 1-10 / 22 models / ⚡price) → `c-task` with prompt pill → `c-image '图片 N'` with `generatorTaskId`; credits pre-charged (−15) and not in the chat thread. Evidence: `scratch.running`, `scratch.done`, `scratch.gen-node.*`.

**Persistence** (O): shapes, thread, title, camera, selection, quick-edit mode, open popovers, collapsed panel all restore on reload; project list updates 更新于. **Versioning** (O): app-menu 画布历史 = whole-canvas snapshots (保存/打开, element count, KB, 恢复); layers drawer has a 历史记录 section; no per-image version stack or compare view.

**Gating** (O): 调整 and post-export open the paywall (plans + per-model credit table, `raw/paywall.txt`). Free tier ⚡70/day, 1 concurrent job.

**Not reached** (U): 自定义工具栏 submenu, 导出 formats, share dialog, 标记 tool, Mockup/扩展/多角度/图层拆分 panels, 试用 Lovart 新版本 shell.
