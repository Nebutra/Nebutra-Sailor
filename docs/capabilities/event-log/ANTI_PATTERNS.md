# event-log anti-patterns

## Mutable events

Do not edit prior events. Append a new event for every action.

## Whole-file copies without hashes

Do not duplicate unchanged content. Store snapshots by content hash.

## Silent rollback

Do not mutate content during rollback planning. Layer 0 rollback is dry-run first.

## Shared mutable cross-capability state

Do not use in-memory shared state between capabilities. Communicate through explicit events and contracts.
