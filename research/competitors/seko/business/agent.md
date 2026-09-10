# Seko — agent UX

- **Entry (O)**: right aside on every canvas, open by default (新对话 · Beta), toggled by an `Agent` header button; also the `创作 Agent` mode of the home hero (skill chips + 更多 Skill).
- **Composer (O)**: prompt; `/` skill picker (8 categories); `@`; attachment popover (上传附件 / 从画布上选择); LLM picker (智能选择, Sensenova 6.8 Flash Lite, GMLM 3/3.7 Flash, Qwen 3.7 Plus/Max, Doubao Seed 2.1 Pro/Turbo, 5.6 L / High); suggestion cards with 换一批.
- **Context (O)**: selecting a canvas node auto-adds it as a 图片 chip in the composer.
- **Execution display (O)**: `正在思考 1.2s…` → rows `已调用工具: 读取画布内容`, `已调用工具: 多模态分析` → markdown answer. Non-blocking: canvas stayed interactive; no credits charged for the text turn.
- **Plan / approval**: none for a text-only request. Whether generation-producing turns show a plan or ask approval before spending — **U** (not exercised to protect the credit budget).
- **History (O)**: per-canvas 对话历史 popover; 新建对话 resets.
- **Skills (O)**: packaged workflows with usage counts; the same catalogue at `/skill-community`; invoked via `/`.
