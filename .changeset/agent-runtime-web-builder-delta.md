---
"@nebutra/agent-runtime": minor
---

Absorb the web-app-builder delta (the differentiated capabilities over the
already-absorbed harness core).

- `artifact-stream`: streaming artifact/action protocol — a chunk-fed
  incremental parser for an `<artifact>` of ordered
  `<action type=file|shell|start|build|data>` blocks (split-tag safe, no
  duplicate emit), plus an action runner with a
  `pending→running→complete|aborted|failed` state-machine, submission-order
  queue, halt-on-failure, and execution delegated through injected ports
  (no in-process exec / host FS). Distinct from tool-calling.
- `workbench`: tenant-scoped project-state model — immutable FileMap with
  auto-derived folders, apply-file-mutation, snapshot/restore with
  deep-copy isolation, bounded snapshot history, project diff; behind a
  `ProjectPersistencePort` (in-memory ref impl mirroring the rollout-store
  seam).

All tenant-scoped & fail-closed, pure data/logic. 181 package tests.
