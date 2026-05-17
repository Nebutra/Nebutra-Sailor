# Replicating a coding-agent product on Sailor

You want to build a product shaped like a terminal coding agent — a thing that
plans, calls tools, edits files, runs commands, asks for approval, and can be
resumed. This guide shows how to assemble that **on Sailor** in a few hours,
without writing a runtime from scratch and without touching infrastructure.

You do not need to have read any other doc. You do need a running Sailor
checkout (`pnpm install` green).

## The one mental model

A coding agent's runtime is four ideas, not a codebase:

1. **A conversation is a log, not a call stack.** `Thread → Turn → Item`.
   Every recorded thing is an `Item`; state is *replayed* from the log, so
   resume is free.
2. **Two independent questions on every action.** *Should a human approve this?*
   (approval policy) and *what is this action even allowed to touch?*
   (capability policy). Never collapse them.
3. **One tool interface.** Native tools and MCP tools look identical at the
   dispatch point. MCP is just an adapter.
4. **You never run untrusted code in your web process.** You *delegate* it
   behind an interface and record the result.

`@nebutra/agent-runtime` gives you all four as types + pure functions.

## Step 1 — model a conversation

```ts
import { mergeTurnConfig, type TurnConfig, type ThreadItem } from "@nebutra/agent-runtime/model";

const tenantDefault: TurnConfig = {
  model: "flagship",
  provider: "gateway",
  approvalPolicy: "on_request",
  capabilityPolicy: "external_sandbox",
};

// Per request the caller may override; the turn freezes this.
const turn = mergeTurnConfig(tenantDefault, { model: "reasoning" });
```

Emit `ThreadEvent`s (`thread.started → turn.started → item.* → turn.completed`)
as your agent works. Your UI subscribes to that stream — that is the whole
real-time story.

## Step 2 — decide approval without writing an if-pyramid

```ts
import { resolveRuleDecision } from "@nebutra/agent-runtime/policy";

// `rule` comes from your policy-as-data evaluator: "allow" | "prompt" | "forbidden"
const verdict = resolveRuleDecision(rule, { kind: "on_request" });
// → "auto_allow" | "ask_human" | "auto_reject"
```

`ask_human` is where you raise a server-initiated approval request
(`./protocol`'s `ServerRequest`) and wait for a `ReviewDecision`. `who` may
answer is `@nebutra/permissions`' job; `what tier / what answer` is this module.

## Step 3 — make every operation tenant-safe for free

```ts
import { METHOD_REGISTRY, resolveScope, scopeKey } from "@nebutra/agent-runtime/protocol";

const scope = resolveScope(METHOD_REGISTRY.turnStart, tenantId, { threadId });
// scopeKey(scope) is your serialization lane. Same thread id, different
// tenants → different lanes, always. You get per-tenant ordering and
// isolation without designing it.
```

Run requests sharing a `scopeKey` serially; parallelize across keys.

## Step 4 — register tools (native + MCP) behind one interface

```ts
import { ToolRegistry, adaptMcpTool } from "@nebutra/agent-runtime/tools";
import { z } from "zod";

const tools = new ToolRegistry({
  preToolUse: async (name, _i, ctx) => audit(name, ctx),
});

tools.register(
  { name: "read_file", description: "…", inputSchema: z.object({ path: z.string() }) },
  async (input, ctx) => readForTenant(ctx.tenantId, input.path),
);

// An external MCP tool is added the same way; callers cannot tell.
const adapted = adaptMcpTool("docs-server", mcpToolDef, mcpClient /* @nebutra/mcp */);
tools.register(adapted.definition, adapted.handler, adapted.origin);
```

## Step 5 — persist the trace so resume is free

```ts
import { InMemoryRolloutStore, replay, sanitizeForPersist } from "@nebutra/agent-runtime/rollout";

const store = new InMemoryRolloutStore(); // swap for a tenant-scoped DB store in prod
await store.append({ tenantId, threadId, type: "event", at, event });

// Resume = read the log and replay it. Compaction lines bound the replay.
const projection = replay(await store.read(tenantId, threadId));
```

For production, implement the `RolloutStore` interface on top of
`@nebutra/db` / `@nebutra/audit` providers — keep the interface, change the
backend. Nothing else changes.

## Step 6 — run code without running code

```ts
import { REFUSING_SANDBOX, type ExternalSandbox } from "@nebutra/agent-runtime/sandbox";

// Default: refuses. That is correct — a multi-tenant web process must not
// execute untrusted code. Provide a real isolator (a self-hosted sidecar,
// a remote sandbox service, anything) implementing ExternalSandbox:
const sandbox: ExternalSandbox = myDelegatedIsolator ?? REFUSING_SANDBOX;
const result = await sandbox.exec({ tenantId, threadId, command, capabilityPolicy });
```

This is the seam where a separate, isolated execution backend plugs in over
the protocol contract. Your web tier never gains the ability to run arbitrary
code; it only gains the ability to *ask something else to*.

## What you did NOT have to build

Model calls, provider routing, fallback, telemetry (`@nebutra/agents`);
tenancy (`@nebutra/tenant`); persistence (`@nebutra/db`, pgvector);
permissions (`@nebutra/permissions`); queue (`@nebutra/queue`); MCP transport
(`@nebutra/mcp`); the gateway host (`backends/gateway`). You wired a grammar
on top of wheels that already turn.

## See it run

Enable the `agent-runtime-demo` feature flag for a tenant and open
`/<locale>/demo/agent-runtime`. Off by default; the page proves tenant
isolation, approval resolution, and the sandbox refusal with pure functions
and zero infrastructure.
