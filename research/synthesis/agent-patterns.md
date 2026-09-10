# Agent patterns — entry, placement, persistence, plan, approval, context, failure

Sources: `research/competitors/<slug>/business/agent.md`, `synthesis.md`, `ux/density.yaml`. fal has no in-product
agent (marketing page only, O) and is listed only where its docs give engineering evidence. Tiers per line; only O/I2
are facts.

## Evidence

### Matrix

| Dimension | Seko | TapNow | Flowith (Neo) | Lovart | LibTV |
|---|---|---|---|---|---|
| **Entry** | right aside **open by default** on every canvas + home hero 创作 Agent mode (O) | right panel on every canvas + `/home` composer + suggestion cards (O) | "Neo Agent" chip on the one composer (home and in-flow); "Agent off" toggle inside Image mode (O) | right panel on canvas + home hero composer, collapsible to 对话 button (O) | right resizable drawer bound to the project; also home composer and `/skill` (O) |
| **Placement** | right aside ≈33 % width (O) | right panel ≈33 % (O) | bottom composer only; **no panel** (O) | right panel ≈38 % at 1040 px (O) | right drawer ~420 px, optional (O) |
| **Persistence** | per **canvas** 对话历史, 新对话 resets (O) | per **project** chat sessions, auto-titled, Fork (O) | the flow *is* the conversation; nodes persisted server-side (O) | per **project** 历史对话, searchable (O) | per **project** 历史对话; 新对话无法分享 until started (O) |
| **Blocking** | non-blocking; canvas interactive during turn (O) | panel stays interactive, timer ticks; canvas concurrent editing U | U (no credits) | non-blocking; stop replaces send (O) | U |
| **Plan display** | none for text turn; rows `已调用工具: 读取画布内容 / 多模态分析` (O) | collapsible "Completed N actions" with named steps (read skill · check models · get node details · submit task) (O); multi-step plan view U | **projected as nodes**: step-label nodes, Group for parallel research, output doc nodes, sandbox node; no panel (O) | step cards in chat (model badge, 生成中 shimmer) + status row above composer with elapsed/ETA (O); no plan preview (O) | U (no run possible) |
| **Approval gating** | U for spending turns | **approval card** (action · ~cost · prompt · ref chip · model · ratio · res · count · Cancel/Confirm) in Ask mode (O) | U | none (O) | Agent 设置 → 协作模式 `自动生成图片/视频…无需逐次确认` implies per-step confirm by default (O label); UI of the confirm U |
| **Autonomy switch** | none seen (U) | composer switch **Ask before acting / Act without asking** (O) | MAX toggle, output-format Auto/Text/Image/… (O); not an autonomy switch | 自动 model toggle only (O) | 自动生成图片/视频 switch + 积分预算管理 alert threshold (O) |
| **Tool / step log** | yes, rows before answer (O) | yes, collapsible (O) | yes, as nodes (O) | yes, step cards (O) | U |
| **Context binding to selection** | selecting a node auto-attaches it as 图片 chip (O) | selected nodes become context chips with thumbnail (O) | click node = removable quote token; tokens accumulate; "Quote first" setting (O) | selected shapes → mention chips, one per shape; right-click 发送至对话 (O) | adding a node inserts a locatable chip; `@` references 工作流/节点/资源 (O); selection itself is implicit (I2) |
| **Result integration** | text answer only observed; canvas unchanged (O) | new node + edge from reference; reply carries node mention chips (O) | output nodes are ordinary quotable nodes (O) | placeholder shape swapped in place; result also as card in thread; shape meta carries threadId/actionId (O) | I2: nodes on canvas (资产 → 分镜 → 视频 groups in published graphs) |
| **Failure / retry** | U | U (Cancel only before submission) | failed answer node toolbar = Delete only; Rerun only on successes (O) | U | U |
| **Credits** | free for text turn (O) | separate **Agent Tapies** pool (O) | one credit balance (O) | agent charge settles at completion, 3 cr (O) | 3 free rounds/day; per-project budget threshold (O) |
| **Skills / memory** | `/` skills, 8 categories, community (O) | skills = clonable graphs + docs the agent reads; Memory cards (labels O, mechanics U) | Knowledge Garden as context (O) | 19 prompt recipes (O) | marketplace recipes with declared inputs/outputs (O) |
| **LLM picker** | 9 + 智能选择 (O) | Auto + 6 gated (O) | mode-filtered model picker (O) | 模型偏好 (image/video), not LLM (O) | 添加模型 chips (O) |

Evidence: `seko/evidence/canvas.agent-reply.webp`, `canvas.agent-attach.webp`, `canvas.agent-skill.webp`;
`tapnow/evidence/canvas.agent.confirm-mode.webp`, `canvas.agent.approval.webp`, `canvas.agent.actions-expanded.webp`,
`canvas.agent.generated.webp`, `canvas.settings.usage.webp`; `flowith/evidence/home.mode-neo-agent.webp`,
`canvas.quant.overview.webp`, `canvas.quant.step-node-selected.webp`, `canvas.new.failed-node-selected.webp`;
`lovart/evidence/scratch.running.webp`, `scratch.done.webp`, `canvas.multi-selected.webp`, `canvas.agent-collapsed.webp`;
`libtv/evidence/libtv.canvas.agent-drawer.webp`, `libtv.canvas.agent-settings.webp`, `libtv.canvas.agent-attach.webp`.

### Counts

- Right-docked agent panel: Seko, TapNow, Lovart, LibTV — **4 O**. Open by default: Seko, TapNow, Lovart — **3 O**
  (LibTV optional, Flowith none).
- Conversation scoped to the document/project: **5 O** (Seko canvas; TapNow, Lovart, LibTV project; Flowith flow).
- Non-blocking execution: Seko, Lovart (O), TapNow panel (O) — **3**.
- Tool/step log visible: Seko, TapNow, Lovart, Flowith — **4 O**; in a panel: 3; as nodes: 1.
- Selection → composer chip/token: Seko, TapNow, Flowith, Lovart — **4 O**.
- Approval before spend: TapNow (O); LibTV (O setting, UI U) — **1–2**.
- Autonomy switch: TapNow, LibTV — **2 O**.
- Agent mutates the graph (adds nodes/edges): TapNow (O), Flowith (O), Lovart (O shape), LibTV (I2) — **3 O**.
- Failure/retry UI: **0 O** beyond Flowith's Delete-only failed node.

## Pattern

1. The agent is a **co-pilot docked beside the same canvas**, never a separate route or mode; its conversation is
   owned by the document it sits beside.
2. **Selection is the context protocol**: the user's current selection is auto-inserted into the composer as
   removable chips/tokens; the agent's replies point back with node mentions (TapNow) or locatable chips (LibTV).
3. **Transparency is a log, not a plan**: what the agent *did* is shown (tool rows, action counts, step cards). A
   forward plan the user can edit is shown by nobody in a panel; Flowith alone materialises it as nodes after the fact.
4. **Spend is the approval boundary** where approval exists: TapNow's card carries exactly the generator parameters
   and price; LibTV's switch is worded as "may consume credits without per-step confirmation".
5. **Results are canvas objects**, arriving with a link to their source (TapNow edge, Lovart meta, Flowith edge).
6. **Failure handling is unmapped** across the field.

## PARA decision

| Element | Rule | Supporters | Decision |
|---|---|---|---|
| Agent lives on the workspace route as an overlay, conversation scoped to the workspace/project | A | Seko, TapNow, Lovart, LibTV, Flowith (O) | **A — adopt.** Scope: workspace-level thread list (Seko per canvas; TapNow/Lovart/LibTV per project) — scope itself diverges → PARA chooses project-scoped threads visible from any workspace (**B**: TapNow, Lovart, LibTV + PARA project logic). |
| Placement: right docked panel, open by default | A (placement) | Seko, TapNow, Lovart, LibTV (4 O) / open-by-default Seko, TapNow, Lovart (3 O) | **A holds for the right panel.** PARA's PRD instead specifies a bottom composer expanding into a panel (AC-03). That is **B**: Flowith bottom composer (O) + LibTV closed-by-default drawer (O), supported by PARA's ≤25 % chrome logic (`frontend-density.md`: every open-right-panel state measures 33–45 % chrome). Record the departure from A explicitly; re-test at M2 with real runs. |
| Selection → context chips in the composer, removable, accumulating | A | Seko, TapNow, Flowith, Lovart (O) | **A — adopt** for M1 "Workspace selected" and "agent running" states. |
| Non-blocking execution; stop button replaces send | A / B | non-blocking Seko, Lovart, TapNow (O); stop: Lovart (O) | **A — adopt** non-blocking; stop affordance **B** (Lovart + fal cancel docs as C). |
| Execution shown as a step/tool log in the panel | A | Seko, TapNow, Lovart (O) | **A — adopt** (collapsible log, TapNow shape). |
| Plan projected as canvas nodes | — | Flowith only (O); TapNow places result nodes with edges (O) | **EXPERIMENTAL** for the *plan*; result-as-linked-node is **A** (TapNow, Flowith, Lovart; see `canvas-patterns.md`). |
| Approval card before any credit-spending action, parameters editable | B | TapNow (O), LibTV setting (O) — PARA's metering/billing logic strongly supports a spend gate | **B — adopt** (card shape from TapNow: action · est. cost · prompt · refs · model · params · Cancel/Confirm). |
| Autonomy switch (ask / act) + per-project budget threshold | B | TapNow (O), LibTV (O) | **B — adopt** the two-state switch; budget threshold **EXPERIMENTAL** (LibTV only). |
| Separate agent credit pool | — | TapNow only (O) | **EXPERIMENTAL**. |
| Failure / retry / cancel UI | — | no O evidence except Flowith Delete-only and fal cancel semantics (C) | **EXPERIMENTAL**; engineering side follows fal (see `job-patterns.md`). |
| Skills / memory / knowledge entry in composer | A (existence) | Seko, TapNow, Lovart, LibTV skills (O); Flowith knowledge (O) | Existence is A, but shape diverges (recipe vs clonable graph vs knowledge base) → **EXPERIMENTAL**, PRD non-goal in M1. |
