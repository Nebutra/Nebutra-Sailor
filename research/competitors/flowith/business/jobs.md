# Jobs — Flowith

Observed with one Chat run on 0 credits (`evidence/canvas.new.sent-t2.webp`, `sent-t8.webp`, `reloaded.webp`):

| t | canvas | tier |
|---|---|---|
| Send | prompt node + empty answer node created together; title auto-set | O |
| +2 s | answer node still empty (placeholder) | O |
| +8 s | answer node shows "Need a refill? You've utilized all your credits… 0 Credits · View pricing" | O |
| reload | both nodes persist; failed node toolbar = Delete only | O |

- There is no job list / queue view; the node *is* the job (O). Completed jobs are the tutorial's answer/image nodes with model + date footers (O).
- Cost is shown before running only as a sentence in Vary ("1 Generation with 1:1 ratio in Seedream 5.0 Pro") and as the batch multiplier; the catalog holds per-model credit prices (O). No credit number is shown pre-run (O).
- Retry: no retry on the failed node; Rerun exists on successful answer/step nodes (O).
- Streaming, cancel, concurrent runs, editing during a run: U (no credits to observe).
