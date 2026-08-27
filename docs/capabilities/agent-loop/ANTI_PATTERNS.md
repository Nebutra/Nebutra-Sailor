# agent-loop Anti-Patterns

- Do not create `packages/ai/agent-loop`; `@nebutra/agent-runtime` is the owner.
- Do not call provider SDKs from this layer; model execution is injected.
- Do not stream raw tokens to product surfaces; stream item lifecycle events.
- Do not branch before a thread has been subscribed and mirrored to event-log.
