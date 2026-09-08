# Job patterns — job = node vs job center vs indicator; states, survival, cost, rejection, cancel

Sources: `research/competitors/<slug>/business/jobs.md`, `business/generation.md`, `synthesis.md`. Three accounts
had **0 credits** (Flowith, LibTV, fal) so their funded lifecycle is U; fal contributes **documented** (O-doc) API
semantics instead. Tiers per line; only O/I2 are facts.

## Evidence

### Where a job is shown

| | Job surface | Global job center / queue | Post-hoc history | Tier · evidence |
|---|---|---|---|---|
| Seko | **the node** (排队中 + 会员加速 → 生成中 → result); toolbar usable while queued | none — O-negative on canvas, explore, my-space; unused `Notifications` live region | 生成历史 (assets outlive nodes), 资产库 | O · `seko/evidence/canvas.node.image-submitted.webp`, `canvas.node.image-overflow-menu.webp` |
| TapNow | the node (no textual status in DOM ~39 s, spinner U) + agent card ("Processing… · Ns" live timer → "Editing 1 file") | none found ("Side panel" content U) | History drawer per project, by media, dated | O · `tapnow/evidence/canvas.agent.generated.webp`, `canvas.dock.history.with-item.webp` |
| Flowith | the **answer node** (created empty at Send; fills with content or a failure card) | none (O) | Media History (account, by day) + flow drawer | O · `flowith/evidence/canvas.new.sent-t2.webp`, `canvas.new.sent-t8.webp` |
| Lovart | three at once: `c-task` placeholder on canvas · step card in chat (model badge, shimmer) · status row above composer "使用 GPT Image 2 生成图片… 00:31 / 2分钟"; send → stop | none (O) | 生成文件 drawer per project | O · `lovart/evidence/scratch.running.webp`, `scratch.gen-node.running.webp` |
| LibTV | the node (▶; lifecycle U, 0 积分) | none beyond browser notifications opt-in | 生成历史 per canvas / per project, member-attributed, rating filter, 批量操作 | O · `libtv/evidence/libtv.canvas.dock-gen-history.webp` |
| fal | result card chip `Idle → Starting → Error` (funded: U) | Requests tab per model + `/dashboard/recent-history`, buckets Success / Error / Client error | same lists (30-day payload retention, O-doc) | O · `fal/evidence/model.schnell.after-run.webp`, `model.schnell.requests.statusfilter.webp` |

Job = node: Seko, TapNow, Flowith, Lovart (placeholder shape), LibTV — **5 O**. Global queue panel: **0**.
History list of outputs: **6 O**.

### States

| | Observed state chain | Queue distinct from running | Tier |
|---|---|---|---|
| Seko | 排队中 → 生成中 → done (~60 s image; 多角度 ~90 s) | **yes** (two labels) | O |
| TapNow | Generate → (no DOM state) → result; agent: Thinking → Processing…·Ns → Editing 1 file → done | no | O |
| Flowith | empty node (+2 s) → failure card (+8 s) | no | O |
| Lovart | 思考中 → 生成中 (elapsed / ETA) → done; static ETA badge per model (10–600 s) | no | O |
| LibTV | U | U | – |
| fal | `IN_QUEUE(queue_position)` → `IN_PROGRESS(logs[])` → `COMPLETED(metrics \| error, error_type)`; **failure is COMPLETED + error fields**, not a state | **yes** | O-doc · `fal/evidence/docs.queue.webp` |

### Survival across navigation / reload

| | Evidence | Tier |
|---|---|---|
| Seko | 多角度 job started, navigated to my-space, came back: completed | O · `seko/evidence/canvas.reloaded.webp` |
| TapNow | reload restored nodes and an in-progress Redraw sub-mode; in-flight job U | O |
| Flowith | failed answer node persisted across reload; in-flight U | O · `flowith/evidence/canvas.new.reloaded.webp` |
| Lovart | completed results persisted; in-flight U | O |
| LibTV | I2 (server history, member-attributed) | I2 |
| fal | request lives server-side; status by id via poll / SSE / webhook | O-doc |

### Cost display

| | Before | After | Confirm dialog | Tier · evidence |
|---|---|---|---|---|
| Seko | ✦ chip **live-repriced** on model/res change (7 → 4 → 1); header balance | header balance drops at submit (110 → 109 → 108) | none | O · `seko/evidence/canvas.node.image-ratio-picker.webp` |
| TapNow | cost next to Generate (5); agent card `~5 Tapies` | header did not refresh immediately; user menu later 170 | none (manual); approval card (agent) | O · `tapnow/evidence/canvas.node.image.prompt-filled.webp`, `canvas.agent.approval.webp` |
| Flowith | sentence only ("1 Generation with 1:1 ratio in Seedream 5.0 Pro") + batch multiplier; **no number** | – | none | O · `flowith/evidence/canvas.welcome.image-vary-menu.webp` |
| Lovart | ⚡ badge per op (15 generator, 14 quick edit, 9 矢量, 90 video); **not** parameter-sensitive on the generator | charged 15 at submit (generator) / 3 at completion (agent) — discrepancy vs badge | none | O · `lovart/evidence/scratch.gen-node.webp` |
| LibTV | 积分 balance; agent 积分预算 threshold; `/comfy` estimate | U | U | O · `libtv/evidence/libtv.canvas.agent-settings.webp` |
| fal | "will cost $0.003 per MP" under result; Sandbox "Will run 1x on 5 models · Est. $0.37" | "took 0.76 s and will cost …" | only for the **unedited sample** (alertdialog) | O · `fal/evidence/model.nb2-edit.webp`, `sandbox.webp`, `model.schnell.run-attempt.webp` |

### Gateway rejection vs failed job

- **fal** (O): 403 "Exhausted balance" returns `requestId: ""` — never queued, **no history row**; shown inline in the
  launcher chip. `fal/evidence/model.schnell.after-run.webp`.
- **Flowith** (O): 0 credits → the answer node is created anyway and receives a "Need a refill?" card; the failed node
  **persists** and its toolbar is Delete only. `flowith/evidence/canvas.new.failed-node.webp`.
- Others: no failure observed (U).

### Cancel / retry / concurrency

- Cancel: Lovart stop button replaces send (O). fal (O-doc): `PUT /cancel` → 202 `CANCELLATION_REQUESTED`; queued =
  immediate, running = best-effort; 400 `ALREADY_COMPLETED`. TapNow: Cancel only on the approval card before submit (O).
- Retry: Flowith Rerun on succeeded nodes only (O); fal auto re-queue ≤10× on runner 503/504 (O-doc); 13 `error_type`s
  (O-doc). Others U.
- Concurrency limits sold per plan: TapNow "4 concurrent tasks" (O), Lovart 1/2/4/8/10 (O), LibTV/Seko membership =
  queue priority (O labels). Slow queue: Lovart 无限低速生成 (O).

## Pattern

- **The node is the job indicator**; a global queue does not exist in any creative tool. The only global surface is a
  *history of outputs*, not of jobs (fal's Requests tab is the exception and is infra-shaped).
- **Queue vs running** is distinguished only where the platform exposes a real queue (Seko, fal).
- **Cost is adjacent to the trigger and no dialog interrupts manual generation**; the dialog appears only for the agent
  (TapNow) or for a suspicious run (fal sample).
- **Rejection semantics diverge**: fal writes nothing, Flowith writes a failed node. Failure UI is otherwise unobserved.

## PARA decision

| Element | Rule | Supporters | Decision |
|---|---|---|---|
| Job = the node; status rendered in the node from submit | A | Seko, TapNow, Flowith, Lovart, LibTV (O) | **A — adopt.** PARA's `jobs-store` should key jobs by node id and the node renders `queued / running / done / failed`. |
| No permanent jobs panel; Jobs indicator + popover only | A (negative) | 0 competitors have a queue panel; all have history lists | **A — adopt** (matches AC-04). The popover lists *active* jobs; completed ones go to the Library "Generated" scope. |
| Queue distinct from running, with position | C (+B) | Seko (O), fal (O-doc) — PARA runs through a gateway queue | **C — adopt** `queued(position) → running → completed \| failed`; error as terminal payload with a type (fal). |
| Job survives navigation and reload (server-owned) | A | Seko (O), fal (O-doc), TapNow/Flowith/Lovart persisted results (O) | **A — adopt**; mock store must survive route changes in M1. |
| Cost at the trigger, live-repriced on param change | A | Seko (O), TapNow, Lovart, fal numeric (O) | **A — adopt**; live repricing **B** (Seko + fal per-unit). |
| Cost after completion (time + actual) | B | fal (O); Seko balance delta (O) | **B — adopt** as a job-row field. |
| No confirm dialog for manual generation | A | Seko, TapNow, Lovart, Flowith (O) | **A — adopt.** |
| Fan-out estimate before a multi-child run | B | fal Sandbox (O); TapNow 1×–4× cost (O) | **B — adopt** for batch/agent runs. |
| Gateway rejection shown inline, no job row | C | fal (O); Flowith contradicts (O) | **C — adopt fal**: pre-admission failures (quota, balance) never create a node/job; post-admission failures are terminal on the node (Flowith shape). |
| Cancel: immediate when queued, best-effort when running; button label honest | C | fal (O-doc); Lovart stop (O) | **C — adopt.** |
| Retry from a failed node | — | none observed; Flowith Delete-only | **EXPERIMENTAL** (PARA logic wants it; no competitor evidence). |
| Per-plan concurrency and slow queue | B | TapNow, Lovart (O) | **B — record in billing, not in M1 UI.** |
