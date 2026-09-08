# fal.ai — synthesis (model infrastructure; mapped 2026-09-08)

Scope: public + owner-authenticated tracks (Chrome session was already logged in as the owner; $0.00 credits, no purchase). 10 surfaces, 37 states, 39 evidence captures. fal is not a creative OS — this file is about its **job model, playground disclosure, result object and persistence**, and what PARA's Jobs surface can borrow.

## 1. Job lifecycle model
- **O (documented)** Unit of work = *request* (`request_id`) against one endpoint. Three states: `IN_QUEUE` (carries `queue_position`) → `IN_PROGRESS` (carries `logs[]`) → `COMPLETED` (carries `metrics.inference_time`, and on failure `error` + `error_type`). Failure is not a state; it is COMPLETED with error fields. `evidence/docs.queue.webp`
- **O (documented)** Guarantees: never dropped, no queue limit, auto re-queue up to 10× on runner 503/504/conn errors; `start_timeout` (deadline to *start*, 504 with `X-Fal-Request-Timeout-Type: user`) vs `request_timeout` (per attempt, app-set). Cancel: 202 `CANCELLATION_REQUESTED` / 400 `ALREADY_COMPLETED` / 404; IN_QUEUE cancel is immediate, IN_PROGRESS is best-effort.
- **O (documented)** Three delivery modes over one status object: poll, SSE stream (open until COMPLETED), webhook (`status: OK|ERROR`, 31 retries, idempotent on `request_id`; `gateway_request_id` differs after retries). 13 machine-readable `error_type`s, also in a response header. `evidence/docs.webhooks.webp`, `evidence/docs.request-errors.webp`
- **O (UI)** Playground chip sequence with no balance: `Idle` → alertdialog guard → `Starting` → `Error` ("Not enough credits", Add credits). Error body `{name:"ApiError",status:403,detail:"User is locked. Reason: Exhausted balance…",requestId:""}`; empty id ⇒ rejected pre-queue, and **no history row is written**. `evidence/model.schnell.run-attempt.webp`, `evidence/model.schnell.after-run.webp`
- **U** How a funded run renders IN_QUEUE position / logs / cancel in the chip. Docs hand the client those fields; the UI was not observable.
- **O** Observability: Requests tab buckets Success / Error / Client error (search by id, preview toggle, 3 layouts); Analytics splits latency into queue p90 + cold-boot p90 + execution p50–p99. `evidence/model.schnell.requests.statusfilter.webp`, `evidence/model.schnell.analytics.webp`

## 2. Playground disclosure pattern
- **O** Model page = one entity, five tabs (Playground · API · Examples · Requests · Analytics); gallery cards expose "Try it now!" and "See docs" as the two entry tabs. API tab is public; Playground needs auth. `evidence/explore.webp`
- **O** Two-column: Input card | Result card. Required params only (Prompt); "Additional Settings · More" reveals 8 optional controls inline; every param has an (i) popover showing the schema description; the API tab is the same schema. A UI-locked param (safety checker) is shown with an inline "API only" alert rather than hidden. `evidence/model.schnell.webp`, `evidence/model.schnell.advanced.webp`, `ux/disclosure-matrix.md`
- **O** The result column is never empty: a sample prompt + sample output + timing/cost line load by default, and running the unedited sample triggers a credit guard.
- **O** Cost is displayed before ("will cost $0.003 per megapixel") and after ("took 0.76 s and will cost…"), with model-specific forms (per image + "$1 = 12 runs" + resolution multipliers; per second + audio tiers + worked 5 s example). `evidence/model.nb2-edit.webp`, `evidence/model.kling-i2v.webp`
- **O** Sandbox is the compare surface: one prompt × N models × M repeats, dock shows "Will run 1x on 5 models · Est. $0.37" before Run; model picker with Selected/SOTA/Trending/Fast chips; reusable named Model Sets; Simple vs Advanced input toggle. `evidence/sandbox.webp`, `evidence/sandbox.sets.webp`, `evidence/sandbox.advanced.webp`

## 3. Result object
- **O** The result *is* the raw API response (Preview | JSON toggle over the same payload; Copy JSON; Download media URL). Fields: `images[{url,width,height,content_type}]`, `seed`, `prompt`, `timings.inference`, `has_nsfw_concepts`.
- **O** Completed-result actions: **Edit / Upscale / Make Video** deep-link another model page with `?fromOutput=<requestId>` (each with a ▾ alternative-model menu), plus Favorite, Link character, Add to Collection, Share (`?share=<requestId>`), Download. Provenance is carried by request id, not by a document. `evidence/model.schnell.share.webp`
- **O** No side-by-side compare inside the model playground; compare = Sandbox.

## 4. Persistence
- **O (documented)** Payload JSON 30 days (opt-out header; delete only after completion); CDN media public URLs with configurable expiration + ACL; webhook results retained ~1 h for retry. `evidence/docs.media-expiration.webp`
- **O** UI: per-model Requests + global Recent History; /assets auto-collects everything (All media, Collections, Favorites, Entities: Characters/Props/Environments/Styles/Scenes); "@ to reference entities" in prompts (usage I2). `evidence/assets.webp`
- **O** Workflows (templates) and fal Agent (Early Access, $50–$1,000/mo credit bundles) exist; enumerated only. `evidence/workflows.webp`, `evidence/agent.webp`

## 5. What PARA can borrow for its Jobs surface
1. **Three states + error-as-terminal-payload** (O-doc). Model jobs as `queued(position) → running(logs) → completed(metrics | error, error_type)`; keep a machine-readable error taxonomy separate from model validation errors, and surface it in the job row filter (Success / Error / Client error).
2. **Gateway rejections are not jobs** (O). A pre-admission failure (balance, quota) returns no id and writes no history row; show it inline in the launcher, not in the job list.
3. **Cost twice, guard once** (O). Unit price under the launcher before run, actual time + cost after; a confirm dialog only for the "you didn't change the sample" case; a fan-out estimate ("1× on 5 models · Est. $") when a job spawns children.
4. **Request id as the provenance key** (O). `?fromOutput=<id>` chaining and `?share=<id>` permalinks mean every artifact resolves back to its job without a separate lineage object — PARA's job row should be linkable and its output should offer "continue with…" actions.
5. **Observability tiers** (O). Job list (per entity + global, preview toggle, 3 densities) → per-job JSON → aggregate latency decomposed into queue vs cold start vs execution. PARA's Jobs surface can show "waiting in queue" separately from "running", because users read them differently.
6. **Cancel semantics honesty** (O-doc). Queued cancel is immediate; running cancel is a request that may not stop the work — label the button accordingly and report `CANCELLATION_REQUESTED` vs `ALREADY_COMPLETED`.
7. **Required-first form with (i)-from-schema** (O). Generating the launcher form from the same schema that documents the API keeps the two in lockstep; lock UI-only restrictions visibly instead of hiding the field.

## Coverage
Surfaces: home, explore, login wall, model page (playground/API/examples/requests/analytics + 3 models), sandbox (+ picker, sets, advanced), dashboard (home, recent history, usage, webhooks, assets), docs (queue, webhooks, request-errors, media-expiration, synchronous, client-setup), workflows, agent, pricing. Not covered: a funded run (queue/in-progress UI, cancel button, Sandbox post-run grid), Form/JSON input mode listbox, variant switcher menu, Products/Generate nav menus, Workflows editor, billing/keys pages (deliberately not opened), Explore search results page. Login/purchase/keys/settings: none performed.
