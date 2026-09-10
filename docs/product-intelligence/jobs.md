# Jobs — PARA decision

Last synthesized: 2026-09-08 · Sources: research/synthesis/job-patterns.md,
research/synthesis/canvas-patterns.md, research/synthesis/agent-patterns.md,
research/synthesis/frontend-density.md, research/synthesis/pattern-matrix.md

Scope: where a job lives, whether a job center exists, states and error taxonomy, survival across navigation and
reload, cost at trigger, confirmation, and the agent spend gate. Coverage caveat: Flowith, LibTV and fal accounts had
zero credits; their funded lifecycle is U and fal contributes documented API semantics (O-doc).

## Evidence

Paths relative to `research/competitors/`.

- Seko · job renders **in the node**: 排队中 (+ 会员加速) → 生成中 → result; toolbar usable while queued; ✦ chip
  **live-repriced** on model/res change (7 → 4 → 1); header balance drops at submit (110 → 109 → 108); no confirm
  dialog; a 多角度 job started, navigated away to my-space, came back **completed**; no job center on canvas,
  explore or my-space (O-negative); 生成历史 keeps outputs — O · `seko/evidence/canvas.node.image-submitted.webp`,
  `seko/evidence/canvas.node.image-ratio-picker.webp`, `seko/evidence/canvas.reloaded.webp`
- TapNow · job in the node (no textual status in DOM for ~39 s) + agent card with live timer "Processing… · Ns" →
  "Editing 1 file"; cost beside Generate (5), agent `~5 Tapies` on the approval card; no confirm for manual; History
  drawer per project; "4 concurrent tasks" sold per plan; no job center found — O ·
  `tapnow/evidence/canvas.node.image.prompt-filled.webp`, `tapnow/evidence/canvas.agent.generated.webp`,
  `tapnow/evidence/canvas.dock.history.with-item.webp`, `tapnow/evidence/canvas.agent.approval.webp`
- Flowith · the **answer node is the job**: created empty at Send (+2 s), fills or receives a "Need a refill?" failure
  card (+8 s); the failed node **persists across reload**, toolbar Delete only; cost is a sentence with no number — O ·
  `flowith/evidence/canvas.new.sent-t2.webp`, `flowith/evidence/canvas.new.failed-node.webp`,
  `flowith/evidence/canvas.new.reloaded.webp`, `flowith/evidence/canvas.welcome.image-vary-menu.webp`
- Lovart · three indicators at once: `c-task` placeholder on canvas · step card in chat (model badge, shimmer) ·
  **status row above the composer** "使用 GPT Image 2 生成图片… 00:31 / 2分钟"; send → stop; ⚡ badge per op, not
  param-sensitive; charged 15 at submit (generator) / 3 at completion (agent) ≠ badge; no job list — O ·
  `lovart/evidence/scratch.running.webp`, `lovart/evidence/scratch.gen-node.running.webp`, `lovart/evidence/scratch.gen-node.webp`
- LibTV · node ▶ (lifecycle U); 生成历史 per canvas / per project, member-attributed, rating filter, 批量操作; browser
  notifications opt-in; agent 积分预算 threshold — O · `libtv/evidence/libtv.canvas.dock-gen-history.webp`,
  `libtv/evidence/libtv.canvas.agent-settings.webp`
- fal · `IN_QUEUE(queue_position) → IN_PROGRESS(logs[]) → COMPLETED(metrics | error, error_type)`; **failure is
  COMPLETED + error fields**, not a state; 403 "Exhausted balance" returns `requestId: ""` — **never queued, no
  history row**, shown inline in the launcher chip; `PUT /cancel` → 202, queued = immediate, running = best-effort,
  400 `ALREADY_COMPLETED`; auto re-queue ≤10× on runner 503/504; 13 `error_type`s; "will cost $0.003 per MP" before,
  "took 0.76 s and will cost …" after; alertdialog only for the unedited sample; Requests tab buckets Success / Error /
  Client error; 30-day payload retention — O / O-doc · `fal/evidence/docs.queue.webp`,
  `fal/evidence/docs.request-errors.webp`, `fal/evidence/model.schnell.after-run.webp`,
  `fal/evidence/model.schnell.requests.statusfilter.webp`, `fal/evidence/model.nb2-edit.webp`, `fal/evidence/sandbox.webp`
- Global job center / queue panel: **0 of 6**. Global jobs *indicator* (top-bar badge): **0 of 6**. History list of
  outputs: **6 of 6**.

## Pattern

Converges (≥3): **the job is the node** — status renders in the node from submit (Seko, TapNow, Flowith, Lovart, LibTV);
no product has a job center; the only global surface is a history of **outputs** (6/6); cost sits at the trigger
(Seko, TapNow, Lovart, fal numeric); **no dialog interrupts manual generation** (Seko, TapNow, Lovart, Flowith);
results persist server-side and survive reload (Seko in-flight, Flowith failed, TapNow/Lovart completed).

Diverges: queue distinct from running only where a real queue exists (Seko, fal); rejection semantics (fal writes
nothing; Flowith writes a failed node); a per-run status row near the composer (Lovart only); cancel (Lovart stop;
fal docs; TapNow only pre-submit); retry (Flowith Rerun on successes only); post-run cost (fal, Seko delta); charge
timing (Lovart at submit vs completion). Failure UI is otherwise unobserved.

## PARA decision

1. **Job = node. `jobs-store` is keyed by `nodeId`; the node renders `queued / running / completed / failed`** —
   **A** (Seko, TapNow, Flowith, Lovart, LibTV).
2. **No job center, no permanent jobs panel** — **A** (negative; 0/6 have one). Completed jobs are not "jobs" any
   more: their outputs live in the Library **Generated** scope — **A** (6/6 history lists).
3. **Jobs indicator + popover in the top bar** — **EXPERIMENTAL** as a departure: 0/6 show a global indicator. It is
   allowed because it never occupies the workspace (AC-04) and is **redundant by contract** — the node is always the
   primary status surface; the popover lists only *active* jobs with cancel, and is empty-hidden. The A-supported
   alternative is Lovart's status row above the composer (**B** candidate if the indicator loses its experiment).
4. **States**: `queued(position) → running(progress?, elapsed) → completed | failed(error: {type, message})` —
   **C** (fal O-doc) + **B** (Seko two labels; PARA runs through a gateway queue). Failure is a **terminal payload
   with a type**, not a separate lifecycle branch; adopt fal's `error_type` shape (the enum itself is backend work —
   do not invent it in the UI).
5. **Pre-admission rejection (balance, quota, validation) is shown inline at the trigger and creates no node and no
   job** — **C** (fal O). Flowith's failed-node-on-zero-credits is the counter-example and is not adopted.
   **Post-admission failure is terminal on the node** and persists — **A** (Flowith O; fal COMPLETED+error; Seko
   persistence).
6. **Survival**: jobs are server-owned; they survive navigation and reload, and a job that finished while away renders
   completed on return — **A** (Seko O, fal O-doc, TapNow/Flowith/Lovart persisted results). M1 mock: `jobs-store`
   must survive route changes (module-level store, not page state).
7. **Cost at the trigger, numeric, no confirm for manual generation** — **A** (Seko, TapNow, Lovart, fal; Flowith
   textual). **Live repricing on param change** — **B** (Seko, fal per-unit). **Post-run cost and duration on the
   node Info** — **B** (fal, Seko delta).
8. **Fan-out estimate before a multi-child run (count > 1, agent batch)** — **B** (fal Sandbox Est. $, TapNow 1×–4×).
9. **Spend gate exists only for the agent** (approval card, see agent.md) — **B** (TapNow, LibTV). Manual generation
   never gets a dialog (decision 7).
10. **Cancel**: immediate when queued, best-effort when running; button label reflects it ("Cancel" vs "Stop —
    may complete") — **C** (fal) + **B** (Lovart stop). **Retry from a failed node** — **EXPERIMENTAL** (0 O; PARA
    logic wants it); ship behind a labs flag as Delete + Retry.
11. **Charge timing**: reserve at submit, settle at completion; show the settled amount — **B** (Seko debit at submit,
    Lovart settle at completion, fal after-run line). Never show a badge that differs from the charge (Lovart's
    discrepancy is the anti-pattern).
12. **Per-plan concurrency and slow queue** — **B** (TapNow, Lovart); record in billing, no M1 UI.
13. **Browser notification on completion** — **EXPERIMENTAL** (LibTV opt-in only).

## What this changes in the current PRD/shell

- **Keep**: Jobs popover (never a panel), AC-04; `jobs-store` separate from the document.
- **Change**: `Job` gains `nodeId`, `queuePosition?`, `error?: {type, message}`, `cost?: {estimated, actual}`,
  `startedAt/finishedAt`; `JobStatus` keeps four states but `failed` carries the error payload; the mock progress
  simulation must drive the **node** status (MediaNode renders queued/running/failed) with the popover as a mirror;
  the popover lists active jobs only and hides itself when empty; the top-bar indicator is annotated EXPERIMENTAL in
  design.md; a Cancel action exists in the popover and on the running node.
- **Remove**: any notion of a "completed jobs" list in the popover — completed outputs go to Library › Generated.
- **Defer**: retry, notifications, concurrency limits, live repricing (needs a price catalogue).

## Open questions

- U · Does a global indicator earn its place, or is the node enough? Closing: M2 telemetry — popover opens per job;
  if users find running jobs by scrolling the canvas instead, drop the indicator and adopt Lovart's status row.
- U · Failure UI on a running job (Seko, TapNow, Lovart). Closing: authenticated runs with a forced failure
  (invalid reference / exhausted balance mid-queue); capture node + panel.
- U · In-flight survival on TapNow, Flowith, Lovart (only Seko verified). Closing: authenticated run — submit, navigate
  to the list, return before completion.
- U · LibTV funded lifecycle (queue label? progress?). Closing: LibTV run with 积分.
- U · fal funded run: what the launcher chip shows during IN_QUEUE with a position. Closing: $1 fal top-up.
