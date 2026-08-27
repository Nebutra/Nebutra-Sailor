# time-machine Replication Guide

1. Commit events through `@nebutra/event-log`.
2. Open `TimeMachine` with the same tenant id.
3. Call `timelineView()` to project a star-map-ready node list.
4. Use `branchFrom()` and `compare()` for experiments.
5. Use `rollbackDryRun()` only; apply belongs to a later explicit approval flow.
