# @nebutra/workflow-runtime

Tenant-authored workflow orchestration. A workflow is tenant-written JavaScript
(`agent()`, `parallel()`, `phase()`, `args`) — the same orchestration grammar as
Claude Code's Workflow tool — executed **only** inside a fail-closed sandbox.

This package owns three things:

- **The sandbox seam** (`WorkflowSandbox`) + the fail-closed default
  (`REFUSING_WORKFLOW_SANDBOX`). Untrusted `scriptSource` is **never** run via
  `eval` / `new Function` / `node:vm`.
- **The QuickJS adapter** (`createQuickJSSandbox`) — a self-hosted WASM VM
  (`quickjs-emscripten`). `agent()` returns a guest Promise the host resolves
  asynchronously, so `parallel()` gets real host-side concurrency despite the
  single-threaded VM.
- **The guest primitives** + the JSON-Schema → forced-tool + AJV structured
  output bridge.

The actual model call behind `agent()` is **injected by the host** (the gateway)
via `HostBindings`, so this package layers on `@nebutra/agents` +
`@nebutra/agent-runtime` without re-implementing the provider stack or wave
scheduling.

```ts
import { createQuickJSSandbox, DEFAULT_SANDBOX_LIMITS } from "@nebutra/workflow-runtime";

const sandbox = createQuickJSSandbox();
const result = await sandbox.run({
  scriptSource: `const a = await agent("research X"); return a;`,
  args: {},
  limits: DEFAULT_SANDBOX_LIMITS,
  host: {
    agent: (prompt, opts) => runBriefAsTurn(prompt, opts), // gateway-injected
    log: (m) => emit({ type: "log", message: m }),
    phase: (t) => emit({ type: "phase", title: t }),
  },
});
```

> **Status:** WIP. The QuickJS adapter and guest primitives are landing
> incrementally; the default seam refuses to run until a concrete sandbox is
> wired.
