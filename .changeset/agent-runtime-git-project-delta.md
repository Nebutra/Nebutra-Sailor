---
"@nebutra/agent-runtime": minor
---

Absorb the git-backed-project delta (over the already-absorbed core).

- `project-repo`: durable project = git repo. Metadata + per-conversation
  jsonl logs persisted as committed files (one commit per turn); history /
  restore by commit SHA (commit graph IS the history — distinct from
  workbench's in-memory snapshot ring); injected `GitHostPort` (no git
  vendor lock-in); tenant ownership gate (`ownsRepo`, default-deny).
- `deployment-status`: commit-keyed lifecycle (`idle|deploying|live|
  failed`), latest-status + timeline-from-commits derivations, explicit
  `advanceState` machine; preview domain from an injected suffix (no
  hardcoded host).

Tenant-scoped & fail-closed; pure data/logic; git + deploy hosts injected.
Resolved a `CommitRef` barrel collision (deployment-status structural type
renamed `DeploymentCommitRef`). 252 package tests.
