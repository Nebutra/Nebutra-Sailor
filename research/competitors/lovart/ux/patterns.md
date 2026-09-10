# Lovart UX patterns (each tiered)

1. **Selection-as-context** (O) — selecting canvas shapes inserts them as mention chips into the agent composer; multi-select gives one chip per shape; right-click 发送至对话 is the explicit version. `evidence/canvas.image-selected.webp`, `canvas.multi-selected.webp`.
2. **Floating context toolbar, no inspector** (O) — every selection type gets a horizontal bar above it (image: 7 AI ops + GIF + ··· + ⬇; text: typography; group: ungroup; multi: arrange/group/merge/align). Labels collapse to icons under pressure (I2). Users can reorder via 自定义工具栏 (O, contents U).
3. **Price at the point of action** (O) — ⚡ badges on 矢量 9, quick-edit Run 14, generator 15 / 90; balance ⚡N in the top bar. Not parameter-sensitive on the generator button (O).
4. **Placeholder-first generation** (O) — a `c-task` shape reserves the result position on the canvas the moment a job starts, then is swapped in place; agent runs also show a shimmer card in chat with elapsed/ETA.
5. **Generator as node** (O) — 图像生成器 / 视频生成器 create configurable canvas nodes (model, size, count) rather than opening a dialog; the node is the job's home.
6. **Persistent side agent, collapsible** (O) — right panel with thread + composer; collapse leaves a 对话 button and floating mic; canvas stays interactive during runs.
7. **Focused sub-mode for one image** (O) — 快捷编辑 (Tab) zooms to the image and shows a dedicated priced prompt with suggested edits.
8. **Everything persists** (O) — camera, selection, sub-mode, open popovers, panel collapse, plus document/thread/title server-side.
9. **Whole-canvas history, not per-object versions** (O) — 画布历史 snapshots with 恢复; layers drawer has a 历史记录 stub.
10. **Skills as prompt recipes** (O) — 19 named workflows selectable from the composer; the canvas empty state advertises them.
11. **Empty-viewport rescue** (O) — 视口内无内容 · 回到内容 toast when the camera drifts off content.
12. **Paywall as gate + upsell** (O) — 调整 opens plans; export completion opens plans; promo banner countdown persistent.
