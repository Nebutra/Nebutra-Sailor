# Agent — PARA decision

Last synthesized: 2026-09-08 · Sources: research/synthesis/agent-patterns.md,
research/synthesis/frontend-density.md, research/synthesis/job-patterns.md,
research/synthesis/canvas-patterns.md, research/synthesis/pattern-matrix.md

Scope: entry, placement, open-by-default, plan display, approval gate, autonomy switch, tool log, non-blocking
guarantee, failure/retry. fal has no in-product agent; its docs supply only cancel/queue engineering evidence.

## Evidence

Paths relative to `research/competitors/`.

- Seko · right aside ≈33 %, **open by default** on every canvas; per-**canvas** 对话历史; non-blocking; tool rows
  (已调用工具: 读取画布内容 / 多模态分析) before the answer; selected node auto-attached as a 图片 chip; text turn free;
  `/` skills, 9 LLMs + 智能选择; approval U; failure U — O · `seko/evidence/canvas.agent-reply.webp`,
  `seko/evidence/canvas.agent-attach.webp`, `seko/evidence/canvas.agent-skill.webp`, `seko/evidence/canvas.agent-model.webp`
- TapNow · right panel ≈33 %, open by default; per-**project** sessions, auto-titled, Fork; collapsible "Completed N
  actions" log (read skill · check models · get node details · submit task); **approval card** (action · ~cost ·
  prompt · ref chip · model · ratio · res · count · Cancel/Confirm) in Ask mode; composer switch **Ask before acting /
  Act without asking**; result = new node + edge, reply carries node mention chips; separate Agent Tapies pool;
  Cancel only on the card before submit — O · `tapnow/evidence/canvas.agent.approval.webp`,
  `tapnow/evidence/canvas.agent.confirm-mode.webp`, `tapnow/evidence/canvas.agent.actions-expanded.webp`,
  `tapnow/evidence/canvas.agent.generated.webp`, `tapnow/evidence/canvas.settings.usage.webp`
- Flowith · **no panel**: "Neo Agent" chip on the one bottom composer; plan **projected as nodes** (step-label nodes,
  Group for parallel research, output doc nodes); click node = quote token; failed answer node's toolbar is Delete
  only — O · `flowith/evidence/home.mode-neo-agent.webp`, `flowith/evidence/canvas.quant.overview.webp`,
  `flowith/evidence/canvas.quant.step-node-selected.webp`, `flowith/evidence/canvas.new.failed-node-selected.webp`
- Lovart · right panel 400 px ≈38 %, collapsible to a 对话 button; per-project 历史对话; non-blocking, **stop replaces
  send**; step cards (model badge, 生成中 shimmer) + status row above the composer with elapsed/ETA; no plan preview;
  no approval; charge settles at completion — O · `lovart/evidence/scratch.running.webp`,
  `lovart/evidence/scratch.done.webp`, `lovart/evidence/canvas.agent-collapsed.webp`
- LibTV · right resizable drawer ~420 px, **optional** (closed by default); per-project 历史对话; Agent 设置 → 协作模式
  `自动生成图片/视频…无需逐次确认` switch + 积分预算管理 threshold (confirm UI U); adding a node inserts a locatable chip;
  `@` references 工作流/节点/资源; 3 free rounds/day — O · `libtv/evidence/libtv.canvas.agent-drawer.webp`,
  `libtv/evidence/libtv.canvas.agent-settings.webp`, `libtv/evidence/libtv.canvas.agent-attach.webp`
- Density with the panel open: Seko 0.42, TapNow 0.42, Lovart 0.45, LibTV 0.35 chrome; closed: 0.08–0.22 — O
  (density.yaml per slug; `lovart/evidence/canvas.agent-collapsed.webp`)
- fal · `PUT /cancel` → 202 `CANCELLATION_REQUESTED`; queued = immediate, running = best-effort; 13 `error_type`s;
  auto re-queue on runner 503/504 — O-doc · `fal/evidence/docs.queue.webp`, `fal/evidence/docs.request-errors.webp`
- Failure / retry UI on a running agent turn: **0 O** across the field.

## Pattern

Converges (≥3): the agent is a co-pilot **on the workspace route**, never a route or mode (5/5); conversation scoped
to the document/project (5/5); right-docked panel (4) open by default (3); selection auto-inserts removable context
chips (4); execution shown as a **tool/step log** — what the agent *did* (Seko, TapNow, Lovart in a panel; Flowith
as nodes); non-blocking runs (Seko, Lovart, TapNow); results arrive as canvas objects linked to their source (TapNow
edge, Flowith edge, Lovart meta); skills entered from the composer (Seko, TapNow, Lovart, LibTV).

Diverges: placement (Flowith bottom composer, no panel; LibTV closed by default); approval before spend (TapNow card;
LibTV switch semantics; Lovart none; Seko U); autonomy switch (TapNow, LibTV only); forward plan display (nobody in a
panel; Flowith post-hoc as nodes); credit pool (TapNow separate); thread scope (Seko canvas vs project ×3); failure
handling unmapped everywhere.

## PARA decision

1. **Entry**: "Ask PARA…" composer in the bottom dock on the workspace route + the same composer on Home — **A**
   (Seko, TapNow, Lovart, LibTV, Flowith for on-route overlay; all five for Home composer).
2. **Placement: bottom composer that expands into a bottom panel; no persistent right panel** — **B** (Flowith
   bottom composer O; LibTV closed-by-default drawer O; PARA's ≤ 25 % chrome logic: every open right panel measured
   0.35–0.45). **This is a recorded departure from A** (right dock: Seko, TapNow, Lovart, LibTV). Trade-off: a
   bottom panel steals canvas *height* — the scarcer axis at 1440×900 — and a long step log competes with the
   composer; the right dock costs width but keeps the log and the canvas visible side by side. Mitigation: the
   expanded panel reserves the same ~33 % area budget as the field and the step log is collapsible (TapNow shape).
   Re-test at M2 with real runs (closing experiment below).
3. **Not open by default** — **B** (LibTV optional, Flowith none + AC-03). Departure from A (Seko, TapNow, Lovart
   open by default) for the same density reason.
4. **Thread scope: project-level threads, visible from any workspace of the project** — **B** (TapNow, Lovart, LibTV
   per project; Seko per canvas diverges; PARA project logic). Thread list, auto-title, new thread — A shape.
5. **Selection → context chips**: removable, accumulating, thumbnail per node — **A** (Seko, TapNow, Flowith,
   Lovart). Agent replies reference nodes with locatable chips — **B** (TapNow, LibTV).
6. **Plan display: a collapsible step/tool log in the panel** ("Completed N actions", expandable rows) — **A** (Seko,
   TapNow, Lovart). **Plan projected as canvas nodes** — **EXPERIMENTAL** (Flowith only). **Editable forward plan
   before execution** — **EXPERIMENTAL** (0/6).
7. **Results are canvas nodes linked to their source by a `derived` edge** — **A** (TapNow, Flowith, Lovart meta).
   The placeholder node appears at submit (canvas.md).
8. **Approval gate: a card before any credit-spending action** carrying action · est. cost · prompt · refs · model ·
   params · Cancel / Confirm — **B** (TapNow O; LibTV switch O; PARA metering/billing logic).
9. **Autonomy switch, two states: Ask before acting / Act without asking**, per thread — **B** (TapNow, LibTV).
   **Per-project budget threshold** — **EXPERIMENTAL** (LibTV only). **Separate agent credit pool** — **EXPERIMENTAL**
   (TapNow only).
10. **Non-blocking**: the canvas stays interactive during a run — **A** (Seko, Lovart, TapNow). **Stop replaces
    send** — **B** (Lovart O) with **C** cancel semantics (fal: queued = immediate, running = best-effort, label honest).
11. **Tool-log transparency**: every tool call is a row with name and target; cost shown per spending step — **A**
    (Seko, TapNow, Lovart) + **B** for per-step cost (TapNow card, Lovart step badge).
12. **Failure / retry** — **EXPERIMENTAL** (U). Engineering follows fal (C): terminal error with `error_type`,
    auto re-queue on infrastructure errors; the UI shape (retry from the failed node vs from the log) is unproven —
    M2 ships Delete + "Retry" on the failed node behind a labs flag.
13. **Skills / recipes / knowledge from the composer** — existence **A** (Seko, TapNow, Lovart, LibTV), shape
    **EXPERIMENTAL**; PRD non-goal. **LLM picker** — existence A (Seko, TapNow, Flowith), deferred.

## What this changes in the current PRD/shell

- **Keep**: bottom composer + expandable panel (decision 2, tagged B with the recorded departure); closed at rest
  (AC-03); "Workspace agent running" golden state.
- **Change**: the M1 fake run must render a **step log** (collapsible rows) and a **placeholder node** on the canvas,
  not only a progress bar; the composer shows **selection chips** in the "selected" state; **Stop** replaces Send
  while running; the expanded panel is height-capped to ~33 % of viewport area; agent threads are stored per project
  in `ui-store` (mock) with a thread list; design.md gains the approval card and ask/act switch as M2 contracts.
- **Remove**: nothing.
- **Defer**: approval card and ask/act switch to M2 (needs cost data); budget threshold; credit pool; plan-as-nodes;
  skills; LLM picker; failure/retry UI beyond Delete.

## Open questions

- U · Bottom panel vs right dock with real runs. Closing experiment: M2 A/B at 1440×900 — same task, measure canvas
  interactions during a run and time-to-accept the result; adopt the winner, re-tag.
- U · Does a spend gate hurt completion? Closing: TapNow authenticated runs in Act mode vs Ask mode on the same task.
- U · Failure and retry. Closing: Lovart/TapNow authenticated run with a forced failure (invalid ref, exhausted
  credits mid-run) — record what the panel and the node show.
- U · Does per-canvas (Seko) or per-project (TapNow/Lovart/LibTV) thread scope confuse users when switching
  workspaces? Closing: PARA M2 with project threads; watch for "where did my chat go" reports.
- U · Concurrent editing while the agent mutates the graph (TapNow U). Closing: TapNow authenticated run — move a
  node while "Processing…".
