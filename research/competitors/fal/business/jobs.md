# fal — jobs (request) model — the key file

## Unit of work
- **O** The job is a **request** against one model endpoint, identified by `request_id` (UUID). Submit returns `request_id`, `response_url`, `status_url`, `cancel_url`, `queue_position` (documented, `evidence/docs.queue.webp`).
- **O** `gateway_request_id` may differ from `request_id` after an automatic retry (last attempt vs queue id) (documented, `evidence/docs.webhooks.webp`).

## Lifecycle (documented — tier O as documentation, not UI-observed)
| Status | Payload | Notes |
|---|---|---|
| `IN_QUEUE` | `queue_position` | never dropped; no size limit; runners autoscale |
| `IN_PROGRESS` | `logs[{message,timestamp}]` (opt-in `logs=1`) | dispatcher routed to a runner |
| `COMPLETED` | `logs`, `metrics.inference_time`, `error?`, `error_type?` | **failure is COMPLETED + error fields**, not a distinct state |
- Retries: runner 503/504/connection error → re-queued, up to 10×. `start_timeout` = wall-clock deadline for *starting* (504 `X-Fal-Request-Timeout-Type: user`); `request_timeout` (app-set, default 3600 s) bounds each attempt. `hint` header gives runner affinity.
- Delivery: poll `/status`, SSE `/status/stream` (stays open until COMPLETED), `subscribe()` with `onQueueUpdate`, or webhook.
- Cancel: PUT `/cancel` → 202 `CANCELLATION_REQUESTED` (IN_QUEUE: removed immediately; IN_PROGRESS: signal, may still complete unless app implements cancel), 400 `ALREADY_COMPLETED`, 404 `NOT_FOUND`.
- Error taxonomy: 13 `error_type` values (`request_timeout`, `startup_timeout`, `runner_scheduling_failure`, `runner_*`, `client_disconnected`, `client_cancelled`, `bad_request`, `internal_error`) with typical HTTP codes; also in `X-Fal-Error-Type` header (`evidence/docs.request-errors.webp`).
- Webhook: POST `{request_id, gateway_request_id, status: OK|ERROR, payload|null, error?, payload_error?}`; 2xx acks; 15 s first / 120 s retry timeout; up to 31 retries with backoff until the stored result expires (~1 h, ~6 min if ≥10 KB); 3xx and private IPs = permanent failure; idempotency on `request_id`.

## Lifecycle as the UI shows it (observed)
- **O** Result chip: `Idle` → (alertdialog guard for sample prompt) → `Starting` → `Error` with inline alert "Not enough credits / Add credits" (`evidence/model.schnell.after-run.webp`). Error JSON `{name:"ApiError", status:403, body:{detail:"User is locked. Reason: Exhausted balance…"}, requestId:""}` — empty requestId ⇒ rejected at the gateway, never queued, **no history row**.
- **O** Completed shape (sample/share state): media + raw JSON + "took 0.76 s, will cost $0.003 per MP" + chain actions.
- **U** Funded run: whether the chip shows queue position / logs / a cancel button. Docs give the client these fields; the UI rendering is unverified.
- **O** Requests tab buckets: Success / Error / Client error; search by request ID; compact/list/grid; preview toggle. Global mirror at /dashboard/recent-history.
- **O** Analytics: queue p90 + cold-boot p90 + execution p50–p99 per model — the platform surfaces *where* time went.

## Cost gating
- **O** Header credit pill (`Credits: $0.00, out of credits`) with popover Buy / Redeem / Go to billing; pre-run unit price under the result; sample-prompt guard; Sandbox shows `Est. $` for the whole fan-out before Run.
- **O** "Unlock 50 free generations per day — verify with a card" (Sandbox banner; not actioned).
