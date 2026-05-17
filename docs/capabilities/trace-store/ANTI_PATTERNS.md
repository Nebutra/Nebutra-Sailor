# trace-store anti-patterns

## Business logic in traces

Trace-store emits observability data only. Do not put workflow decisions here.

## Synchronous hot-path export

Do not block user work on network export. Batch and flush asynchronously.

## Secret leakage

Do not write raw credentials, tokens, cookies, or email fields to trace attributes.

## Mutable trace state

Spans are records. Do not use trace-store as a cross-capability state channel.
