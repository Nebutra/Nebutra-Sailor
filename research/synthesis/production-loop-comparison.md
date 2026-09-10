# Production loop comparison — loops discovered from transitions

Sources: each `research/competitors/<slug>/business/production-loop.md`, `business/generation.md`, `synthesis.md`.
Tiers as in `research/README.md`. Only loops that were **walked** (transitions recorded) are listed as O; loops
described in marketing or not submitted are marked U.

## Evidence

### Loops actually walked

| Competitor | Loop as recorded (O) | Evidence | Not walked (U) |
|---|---|---|---|
| **Seko** | canvas → `+` blank node → configure (mode tab · model · ratio/res · `@`主体 · count · ✦ price) → send (✦ debited, no confirm) → 排队中 → 生成中 → result **in the node** → select → floating toolbar → derived op (多角度 ✦1) → **new child node + edge** → reload restores all | `seko/evidence/canvas.blank-node.webp`, `canvas.node.image-submitted.webp`, `canvas.node.image-completed.webp`, `canvas.node.multiangle-submitted.webp`, `canvas.reloaded.webp` | story pipeline 短片工作室 (video spend), 合成视频 → 编辑器, publish |
| **TapNow** | project → canvas → ⊕ palette → Image node → prompt + model + params (cost 5) → Generate (no confirm) → ~39 s → output in the **same node**, bar stays → in-node tools (Change Angle / Relight / Redraw) → History drawer entry. **Agent variant**: select node (chip) → describe → "Completed 7 actions" log → approval card (~5 Tapies) → Confirm → new node + edge → Processing… → result + node mention | `tapnow/evidence/canvas.node.image.generated.webp`, `canvas.node.image.tool-redraw.webp`, `canvas.agent.approval.webp`, `canvas.agent.generated.webp`, `canvas.dock.history.with-item.webp` | video/audio/3D end-to-end, Timeline Editor, Act-without-asking, Group nodes |
| **Flowith** | `/blank` composer → Send → flow created with **prompt node + empty answer node** → answer fills (or "Need a refill?" card on 0 credits) → click node = quote token → Follow Up (lineage token) / Vary (mini form) → new child/sibling nodes → reload keeps even the failed node | `flowith/evidence/canvas.new.sent-t2.webp`, `canvas.new.sent-t8.webp`, `canvas.welcome.follow-up.webp`, `canvas.welcome.image-vary-menu.webp`, `canvas.new.reloaded.webp` | any *successful* run (0 credits), Slides/Website outputs, Neo run live |
| **Lovart** | home/canvas composer → agent 思考中 → `c-task` placeholder on canvas + step card in chat → result **swaps the placeholder** (c-image) + result card in thread → select → floating toolbar (快捷编辑 Tab ⚡14 …) → export. **Parallel path**: 图像生成器 node with own composer (⚡15 at submit) → result shape | `lovart/evidence/scratch.running.webp`, `scratch.done.webp`, `canvas.image-selected.webp`, `scratch.gen-node.running.webp`, `scratch.gen-node.done.webp` | video, skill invocation, failure/cancel, most priced toolbar ops |
| **LibTV** | home launcher → template clone into `/canvas` → node graph pre-built (分镜组 → shot i-nodes → motion v-nodes → BGM) → configure node (chips 参考/标记/特效/角色库/运镜 · config chip → popover · 高级设置) → ▶ … **generation not run (0 积分)** → 生成历史 (per canvas/project, rating filter) → 故事板 view → 发布 (作品 + 创作过程) → community 查看创作过程 → 复制项目 | `libtv/evidence/libtv.canvas.template-shot-breakdown.webp`, `libtv.canvas.node-config-popover.webp`, `libtv.canvas.dock-gen-history.webp`, `libtv.canvas.storyboard-mode.webp`, `libtv.tvshow.detail.webp` | job lifecycle, variant selection, agent run, 导演台 3D editor, 智能剪辑 output |
| **fal** | Explore → model page Playground (required-first form, cost line) → Run → **403 rejected pre-queue, no history row** → (sample) result Preview/JSON → chain Edit / Upscale / Make Video via `?fromOutput=` → Sandbox fan-out with `Est. $` | `fal/evidence/model.schnell.webp`, `model.schnell.after-run.webp`, `model.schnell.share.webp`, `sandbox.webp` | funded run (queue/progress/cancel UI), Sandbox post-run grid, Workflows editor |

### Loop stages that converge

| Stage | Seko | TapNow | Flowith | Lovart | LibTV | fal | Count (O) |
|---|---|---|---|---|---|---|---|
| Entry via prompt-first launcher | O | O | O | O | O | – (task gallery) | 5 |
| Unit configured on the canvas itself | O node | O node | O composer + node | O generator node / composer | O node | – (form page) | 5 |
| Price visible at the trigger before submit | O ✦ | O Tapies | O sentence, no number | O ⚡ | O balance + budget | O $/unit | 5 numeric + 1 textual |
| No confirmation dialog for manual generation | O | O | O | O | U | guard only on unedited sample | 4 |
| Result lands in a node on the canvas | O | O | O | O (shape) | O | – | 5 |
| Refine from selection (toolbar ops) | O | O | O | O | – (implicit selection) | O chain links | 5 |
| Derivation creates a new object, source kept | O child + edge | O (agent) / in-node regen (manual) | O child/sibling | O new shape, no link | I2 (从生成历史选择 re-enters) | O new request | 4 O |
| Output collected in a history list | O 生成历史 | O History drawer | O Media History | O 生成文件 | O 生成历史 | O Requests | 6 |
| Export / share from canvas | O download, 发布作品 | O Download, Share, TapTV | O Download, Share link | O ⬇ / PSD / 导出 | O 发布 / 分享链接 | O Download / Share | 6 |
| Compare / approve step | none (O-neg) | none beyond agent card | spatial siblings | none (O-neg) | rating filter (I2) | Sandbox | 0 converge |

### Where they genuinely diverge

- **Who drives the loop**: TapNow and Lovart are agent-first on the home; Seko and LibTV offer both node and agent
  entry equally; Flowith folds the agent into a composer mode; fal has no agent in product (O).
- **Where the result of a re-generation goes**: TapNow regenerates in the same node (bar remains, History keeps prior
  outputs — I2); Flowith Rerun/Vary make new nodes (O for Vary, I2 for Rerun); Seko re-send is I2 new generation; Lovart
  places a new top-level shape. No convergence.
- **Video composition**: Seko 合成视频 → node or 编辑器 (O menu, not run); LibTV 智能剪辑 node (O, needs upstream video)
  and no timeline (U); TapNow Timeline Editor (Beta) did not open (U); Lovart/Flowith none. **No competitor showed a
  working timeline.**

## Pattern

The observed loop is the same shape in the five creative tools:

```
launcher prompt ─┐
                 ├─► node on canvas ─► configure (model · params · refs · price) ─► submit (no confirm)
add node ────────┘         ▲                                                              │
                           │                                                              ▼
                     select result ◄─── result renders in that node ◄─── queued → running
                           │
                           ├─► toolbar op → new linked node (Seko, Flowith, TapNow-agent) / new shape (Lovart)
                           ├─► agent chip → agent proposes → (approval) → new node + edge (TapNow)
                           └─► history list ─► re-apply to canvas / download / publish
```

fal is the same loop with the canvas removed: model page = node, `?fromOutput=` = edge.

## PARA decision

| Loop element | Rule | Supporters | Decision |
|---|---|---|---|
| Node on the work surface is where configuration and result live | A | Seko, TapNow, Flowith, LibTV, Lovart (O) | **A — adopt.** The M1 canvas node must be able to hold a generator state, not only a rendered asset. |
| Launcher prompt on Home creates a workspace and its first node | A | TapNow, Lovart, Flowith, LibTV, Seko (O) | **A — adopt** for the Home "prompt/drop zone". |
| Price at the trigger, no confirm for manual generation | A | Seko, TapNow, Lovart, Flowith (O) | **A — adopt** (see `job-patterns.md`). |
| Derivation = new object, source preserved | A | Seko, Flowith, TapNow-agent, fal (O); Lovart preserves but does not link | **A — adopt** "never overwrite"; the *link* (edge) is A with Seko, Flowith, TapNow (see `canvas-patterns.md`). |
| History list of outputs as the post-loop surface | A | all six (O) | **A — adopt** as the Library drawer's "Generated" scope. |
| Regenerate in place vs new node | — | diverge (TapNow in-place; Flowith new; Seko I2) | **EXPERIMENTAL** — choose by PARA business logic later; record both in the node schema (a node may hold N outputs). |
| Timeline / composition step | — | none observed working | **EXPERIMENTAL** — no evidence to freeze; keep as PRD non-goal. |
| Compare / approve step in the loop | — | none of the five creative tools | **Not adopted in M1** (A-negative); see `versioning-patterns.md`. |
