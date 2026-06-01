# Proposal: Governed Agent Ops Workspace

## Status

Proposed on 2026-05-29. No production exposure. Any future prototype must be default-off and labeled as an unreviewed automated prototype.

## The real job

Teams want to run long-lived AI work inside a product environment, not just inside an IDE:

- research and synthesis
- internal workflow execution
- batch remediation
- tool-using operations with approvals

The missing job is a control plane where an operator can launch, observe, approve, replay, and bill for agent work safely.

## Why this is not trend-chasing

This is not "build a Cursor clone." Cursor, Warp, and Replit prove that agentic workflows are becoming normal, but Nebutra's differentiated job is different:

`bring agent-runtime governance into a tenant-scoped SaaS product surface`

That means approvals, billing, vault-backed credentials, replay, and feature gating are first-class.

## Proposed product shape

A web workspace for internal operators that can:

- start named agent runs against scoped tasks
- watch SSE event streams and replay history
- approve or deny protected tool actions
- inspect usage, spend, and output artifacts
- route long-running work through durable jobs

First target users:

- ops teams
- support leads
- implementation/solutions engineers
- internal "digital employee" workflows

## AI and business mechanism

AI mechanism:

- `@nebutra/agents` for model execution
- `@nebutra/agent-runtime` for turn grammar, policy, rollout, and tool abstraction
- tool surfaces composed selectively through MCP and package adapters

Business mechanism:

- raises Nebutra from starter/template positioning to operating-system positioning
- creates a premium control-plane narrative for enterprise plans
- gives a dogfooding path for billing, vault, queue, and audit

## Reuse vs new build

Reuse directly:

- `@nebutra/agent-runtime` and live gateway route
- `@nebutra/agents`
- `@nebutra/queue` for durable turn and async execution
- `@nebutra/vault` for credential access
- `@nebutra/billing` for usage metering and entitlements
- `@nebutra/feature-flags` and admin routes for gated rollout
- existing auth and tenant context

New work:

- operator-facing workspace UI
- approval inbox and override actions
- richer tool catalog and safe default tool bundles
- durable rollout persistence activation as the expected default, not an env-only option
- spend and run analytics views

## Success metrics

- number of recurring internal workflows moved from manual steps to governed agent runs
- median operator time saved per approved run
- percent of protected actions that get explicit approval instead of failing silently
- run replay/debug time after failure
- usage-to-billing traceability completeness

## Implementation sketch

1. Start with one internal workspace surface over the existing `agent-runtime` SSE route.
2. Add named run templates for narrow jobs instead of free-form universal agents.
3. Persist rollout lines durably by default for opted-in tenants.
4. Add an approval inbox with explicit deny/approve state transitions.
5. Add spend, tool, and run health reporting before broadening the tool surface.

## Effort

Estimated `M-L`:

- 2 to 3 weeks for an internal-only thin control plane
- 4 to 6 weeks for a credible governed operator workspace with approvals and spend views

## Main risks

- agent-runtime is real but still not a finished end-user product
- feature-flags package remains WIP, so rollout semantics must stay conservative
- too much free-form power too early would create safety theater instead of trust

## Benchmark essence

What to copy in substance, not surface:

- Cursor: subagents, indexing, and full-lifecycle agent workflows
- Warp: split terminal/action surfaces from cloud orchestration
- Vercel: AI workloads need first-class infra and observability
- Inngest: durability and replay are core product value
- Replit: move from idea to production, not just prompt to demo
- fal.ai: infrastructure products win when latency, scaling, and observability are explicit

Official references:

- [Cursor](https://cursor.com/en-US/product)
- [Warp](https://docs.warp.dev/)
- [Vercel AI](https://vercel.com/ai)
- [Inngest](https://www.inngest.com/)
- [Replit](https://replit.com/)
- [fal.ai](https://fal.ai/)

## Decision

Pursue after the launch funnel and support-deflection proposals, unless Nebutra decides to lean much harder into enterprise agent operations than founder launch tooling.
