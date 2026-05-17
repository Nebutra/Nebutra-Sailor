# agent-loop Replication Guide

```ts
import { InMemoryRolloutStore, Pulsar, ToolRegistry } from "@nebutra/agent-runtime";

const pulsar = Pulsar.builder()
  .withTenant("local")
  .withConfig({
    model: "local",
    provider: "injected",
    approvalPolicy: "on_request",
    capabilityPolicy: "external_sandbox",
  })
  .withModel({ async invoke() { return { emissions: [{ kind: "text", text: "ok" }] }; } })
  .withTools(new ToolRegistry())
  .withRolloutStore(new InMemoryRolloutStore())
  .withApprovalGate({ async request() { return { kind: "approved" }; } })
  .build();

const thread = await pulsar.startPlay("hello_play", "Say hello");
for await (const event of thread.subscribe()) console.log(event);
```

## Steps

1. Use `@nebutra/agent-runtime` as the only agent-loop package.
2. Inject the model executor from the host runtime.
3. Inject a tenant-scoped rollout store.
4. Subscribe to item-level events instead of token events.
5. Mirror item completions into event-log when branch support is needed.

## Checks

```bash
pnpm pulsar:doctor
pnpm --filter @nebutra/agent-runtime test -- src/pulsar.test.ts
```
