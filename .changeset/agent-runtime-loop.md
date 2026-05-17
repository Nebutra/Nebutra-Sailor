---
"@nebutra/agent-runtime": minor
---

Add the agent loop runner — the turn engine.

- `runTurn()` drives a turn `loop { model_call → emit items → execute tools
  → feed results back }` until the model stops requesting tools or a bounded
  step ceiling is hit. Single-threaded (shared context, no conflicting
  sub-agent decisions).
- The model call is abstracted behind `ModelInvoker`, WRAPping an existing
  model stack rather than re-porting provider/routing/fallback.
- Every terminal item and the turn outcome are appended to the tenant-scoped
  rollout (resumable by replay); tool calls pass the approval gate
  (`resolveRuleDecision` + server-initiated `ApprovalGate`); unapproved tools
  are never dispatched. Internal failures surface as `turn.failed`, never
  thrown to the caller.
