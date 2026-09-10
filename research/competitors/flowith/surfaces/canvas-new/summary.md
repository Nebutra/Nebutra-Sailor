# flowith.canvas-new — generation lifecycle on a fresh flow

Probe: one Chat run (GPT 4.1) on a 0-credit Free account, flow named "PARA research scratch".

- **Flow creation (O):** the flow object is created on the first Send from `/blank` (URL → `/conv/<uuid>`, appears in History as "Untitled Flow"), before any node exists.
- **Send → nodes (O):** Send creates the prompt node *and* an empty answer node at once (job submitted). The answer node is the job's container; its terminal content — here a "Need a refill? … 0 Credits · View pricing" card — is written into that node and persisted (still there after reload).
- **Title (O):** auto-derived from the first prompt.
- **Failed node affordances (O):** Delete only; no retry. Retry would be "select prompt node → send again" (I1).
- **Mode inheritance (I2):** the in-flow composer starts in the mode last used (Chat · GPT 4.1 here; Neo Agent in the tutorial flow).
- **Unknown (U):** streaming appearance, cancel, editing during a run, survival of a running job across navigation.

Evidence: `evidence/canvas.new.sent-t2.webp`, `canvas.new.sent-t8.webp`, `canvas.new.failed-node-selected.webp`, `canvas.new.reloaded.webp`.
