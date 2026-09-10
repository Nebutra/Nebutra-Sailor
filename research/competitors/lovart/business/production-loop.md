# Production loop — Lovart

**Core unit of work** (O): a *project* = one infinite canvas document + its conversation threads + generated files. Everything the agent or generators produce lands on this canvas as `c-image` shapes; there is no separate asset library or gallery inside the product (generated files are a per-project list, O).

**Loop observed** (O):
1. Prompt (home hero or canvas composer; optional attachments, web search, Skill, model preference, thinking mode) → project created if needed.
2. Agent runs: placeholder shape on canvas + step cards in chat with model badge, elapsed/ETA, stop.
3. Result replaces placeholder; chat shows result card + summary + 点赞/点踩.
4. Iterate by selecting the result (chip into composer, or 快捷编辑 Tab with priced Run) or by the local toolbar (crop, flip, adjust*, vector*, mockup*, extend*, upscale*, remove bg*, eraser*, layer split*, edit text*, multi-angle*, GIF* — * credit-priced / gated).
5. Export: toolbar ⬇ (single), download▾ 下载 / 导出 PSD (multi), right-click 导出 ›; export completion triggers an upsell.

**Parallel loop** (O): generator nodes (图像生成器 / 视频生成器 / 字体生成器) run outside the agent thread with their own config and pre-charged price.

**Review / approval** (O): none — no plan/approve step, no compare view. Only 点赞/点踩 on assistant messages and whole-canvas 画布历史 restore.

**Concurrency** (O, from paywall copy): free 1 task, Starter 2, Basic 4, Pro 8, Ultimate 10 concurrent tasks.
