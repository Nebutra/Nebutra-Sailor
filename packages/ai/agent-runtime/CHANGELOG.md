# @nebutra/agent-runtime

## 0.2.1

### Patch Changes

- Publish registry package metadata under the MIT license.

- Updated dependencies []:
  - @nebutra/ai-primitives@0.1.1
  - @nebutra/capability-kit@0.2.1
  - @nebutra/execution-policy@0.1.1
  - @nebutra/mcp@0.1.2

## 0.2.0

### Minor Changes

- [`fab751f`](https://github.com/Nebutra/Nebutra-Sailor/commit/fab751f39639251bfa006b1bfbcd8cd62f94626a) Thanks [@TsekaLuk](https://github.com/TsekaLuk)! - New adapter subpaths inside `@nebutra/agent-runtime`: concrete reusable port
  adapters for the runtime package.
  - `mcp-catalog`: adapts `@nebutra/mcp` `serverRegistry`/`mcpClient` into the
    `McpServerCatalogPort` / `McpClientLike` ports — plan-gated, tenant
    fail-closed, schema-less MCP tools still yield usable definitions,
    composes with `activateMcpTools`.
  - `dispatcher-sse`: runtime-agnostic transport for `ProtocolDispatcher` using
    only Web-standard `Request`/`Response` — JSON-RPC handler (never throws),
    incremental `text/event-stream` SSE with error-frame + `AbortSignal`
    cancellation, listener→async-iterable notification bridge.

  Dependency-injected (no hidden globals), tenant fail-closed, zero framework
  lock-in. The durable rollout-store backend adapter is intentionally not
  included (a correct system-of-record needs a fail-loud datastore; pending a
  governance decision — documented in the README).

- [`4865ac9`](https://github.com/Nebutra/Nebutra-Sailor/commit/4865ac9bff6dd83635bc33e4aeb348b087dee7c7) Thanks [@TsekaLuk](https://github.com/TsekaLuk)! - Absorb the IDE-coding-agent delta (over the already-absorbed CLI core).
  - `code-review`: a pure unified-diff parser, branch-base resolution, a
    confidence-banded review prompt (CRITICAL ≥95% / WARNING ≥85% /
    SUGGESTION ≥75% / below → omit) with an untrusted-content injection guard
    over diff + commit messages, an advisory/no-edit invariant, a fail-closed
    finding parser (`ReviewParseError` rather than a fabricated empty result),
    and a deterministic post-review mode handoff.
  - `context-compaction`: in-session, mid-turn context-overflow recovery — a
    1.3× token-correction estimator, a 60%-floored budget, greedy whole-message
    packing with an oversized-message clipped-transcript fallback,
    bounded-concurrency chunk summarization with a preserve-rubric prompt, a
    recursive binary reduce capped at an output token limit, and a fail-closed
    `"compact"` retry sentinel (never silently drops context).
  - `commit-message` (WRAP): a Conventional-Commits prompt + git-context shape +
    "regenerate materially different" negative constraint + fence/quote
    stripping + bounded retry over the existing injected small-model seam.

  Tenant-scoped / fail-closed where stateful; pure where stateless; the only
  impurity is an injected model/summarize port. 632 package tests.

- [`67f9cd0`](https://github.com/Nebutra/Nebutra-Sailor/commit/67f9cd02c0ee908f0579efadc4292d535a758c16) Thanks [@TsekaLuk](https://github.com/TsekaLuk)! - Durable rollout-store backend (the agent-runtime system-of-record).
  - New Prisma model `AgentRolloutLine` → table `agent_rollout_lines`, additive
    migration `20260519000000_add_agent_rollout_store` (one CREATE TABLE).
  - `createPrismaRolloutPersistence` in `@nebutra/agent-runtime-adapters`:
    fail-loud `RolloutPersistencePort` over a minimal injected
    `PrismaRolloutDelegate` (no generated-client / `@nebutra/db` dependency;
    per-tenant resolver for RLS). 6 TDD tests.
  - Gateway route store is env-gated: `AGENT_ROLLOUT_DURABLE=1` selects the
    durable Postgres store, default stays in-memory. Activation is a standard
    migrate+generate deploy step (ADR 2026-05-19), not faked durability.

- [`bb1b126`](https://github.com/Nebutra/Nebutra-Sailor/commit/bb1b126e82379d88da10f43a86d9d07bccc3a224) Thanks [@TsekaLuk](https://github.com/TsekaLuk)! - Absorb the git-backed-project delta (over the already-absorbed core).
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

- [`da6bfea`](https://github.com/Nebutra/Nebutra-Sailor/commit/da6bfeaf6c323a9aecefdd65c481a9852aee25b9) Thanks [@TsekaLuk](https://github.com/TsekaLuk)! - Add `@nebutra/agent-runtime`: a multi-tenant agent-runtime grammar.
  - New package re-expresses a coding-agent runtime _design_ in Sailor grammar —
    thread/turn/item model + event lifecycle, two-axis approval/capability
    policy, uniform tool/MCP abstraction, event-sourced rollout with compaction,
    and an external-sandbox delegation seam.
  - Every serialization scope, store key, and dispatch is tenant-scoped;
    cross-tenant requests can never share a serial lane.
  - No infra change and no in-process untrusted-code execution: the default
    executor fails closed; real execution is delegated behind `ExternalSandbox`.
  - Adds an off-by-default `agent-runtime-demo` feature flag gating a demo route
    in `apps/web`.

- [`3c5c43e`](https://github.com/Nebutra/Nebutra-Sailor/commit/3c5c43e1c07c03da936d2948408f8abb4b113321) Thanks [@TsekaLuk](https://github.com/TsekaLuk)! - Absorb the differentiated coding-agent-harness capabilities (the delta over
  the already-absorbed core).
  - `definitions`: shared layered-tier resolver (precedence + dual
    availability/enabled gate) + frontmatter parser — backs commands, skills,
    subagents from one kernel.
  - `skills`: two-phase progressive disclosure (token-budget listing,
    first-party never-truncated, path-activation), lazy body expansion,
    per-skill model/tool override merge.
  - `hook-pipeline`: 18-event taxonomy, config matcher/`if` resolver,
    structured decision protocol, multi-transport (function/http/prompt),
    parallel fan-out with deterministic precedence merge; wraps the bare
    `ToolHooks` as the in-process transport.
  - `commands`: unified command=skill model with dual user/model front-doors
    and a pure arg-substitution + templating expander.
  - `subagents`: definition resolver (tool allow−deny), fork-vs-spawn
    context-boundary contract, typed terminal-envelope result contract, and a
    tenant-scoped Task lifecycle registry.

  All tenant-scoped & fail-closed; pure data/logic (no FS/shell/TUI — those
  transports deliberately dropped for multi-tenant safety). 135 package tests.

- [`a29b2d9`](https://github.com/Nebutra/Nebutra-Sailor/commit/a29b2d997416edc4e421b31b777724ae70e4da54) Thanks [@TsekaLuk](https://github.com/TsekaLuk)! - Add the agent loop runner — the turn engine.
  - `runTurn()` drives a turn `loop { model_call → emit items → execute tools
→ feed results back }` until the model stops requesting tools or a bounded
    step ceiling is hit. Single-threaded (shared context, no conflicting
    sub-agent decisions).
  - The model call is abstracted behind `ModelInvoker`, WRAPping an existing
    model stack rather than re-porting provider/routing/fallback.
  - Every terminal item and the turn outcome are appended to the tenant-scoped
    rollout (resumable by replay); tool calls pass the approval gate
    (`resolveRuleDecision` + server-initiated `ApprovalGate`); unapproved tools
    are never dispatched. Internal failures surface as `turn.failed`, never
    thrown to the caller.

- [`cd34724`](https://github.com/Nebutra/Nebutra-Sailor/commit/cd347242ab6874931a74aa72aa9a0d183f7dd5d3) Thanks [@TsekaLuk](https://github.com/TsekaLuk)! - Absorb the multi-channel-gateway delta (over the already-absorbed core).
  - `channel-gateway`: channel-agnostic `InboundMessage`/`OutboundMessage`
    normalization, a `ChannelAdapter` port (parseInbound returns null for
    non-message events, never throws on junk), tenant-scoped `ChannelRegistry`,
    and outbound route-back through the originating channel.
  - `inbound-admission`: deterministic tenant-prefixed `resolveSessionKey`
    (group/DM/thread bindings, cross-tenant non-colliding), allowlist gating
    (exact / `*` / `prefix:*`, closed-by-default), mention gating (group
    requires @mention or reply-to-assistant; DM never), a time-injected
    `InboundDebouncer`, composed by `admitInbound`.

  Tenant-scoped & fail-closed; pure data/logic; transport + time injected.
  Only the clean contracts were re-expressed (the messy source impl is not
  ported). 365 package tests.

- [`447e948`](https://github.com/Nebutra/Nebutra-Sailor/commit/447e948a7153446e7bc3769395c1687c9f27c991) Thanks [@TsekaLuk](https://github.com/TsekaLuk)! - Close the runtime gap — four capabilities, all tenant-scoped & fail-closed,
  each behind an injectable port so the package keeps zero datastore/queue
  dependency ("no infra change" stays honest):
  - **Durable / resumable turn** (`durable-turn.ts`): `createDurableTurn` wraps
    `runTurn` behind a `DurableTurnQueuePort`; `resume` replays the rollout and
    re-drives an unfinished turn, idempotent and cross-tenant isolated.
  - **Protocol dispatcher** (`dispatcher.ts`): transport-agnostic JSON-RPC
    dispatcher serving the method registry — envelope validation fail-closed,
    per-`scopeKey` serialization (cross-tenant never shares a lane), errors
    mapped to JSON-RPC codes, validated notification stream.
  - **MCP activation** (`mcp-bridge.ts`): `activateMcpTools` adapts tenant/plan
    -visible MCP-server tools into the uniform `ToolRegistry` via an injectable
    `McpServerCatalogPort`; duplicate names skipped, empty tenant fails closed.
  - **Persistent rollout store** (`rollout-store-persistent.ts`):
    `PersistentRolloutStore` over a `RolloutPersistencePort` (satisfiable by an
    `@nebutra/audit`/`@nebutra/db` adapter) — monotonic per-(tenant,thread)
    seq, faithful round-trip, cross-tenant isolation, typed round-trip errors.

- [`b1b9b72`](https://github.com/Nebutra/Nebutra-Sailor/commit/b1b9b7251ef6b1b84e5211dd9b4ae14a1be4b05a) Thanks [@TsekaLuk](https://github.com/TsekaLuk)! - Absorb the self-improving-loop delta (over the already-absorbed core).
  - `memory-provider`: pluggable cross-session `MemoryProvider` port (full
    lifecycle: initialize/prefetch/syncTurn/onSessionEnd/onSessionSwitch/
    onPreCompress/onDelegation/systemPromptBlock) + a `MemoryManager` that
    degrades safely + memory-context injection defense (recalled text
    banner-wrapped as reference-not-instructions; a split-safe streaming
    scrubber strips model-forged memory banners). Vendor backends injected.
  - `skill-distillation`: the learning loop — eligibility gate (only
    non-trivial successful trajectories), `distillSkill` (deterministic
    prompt → injected synthesize → skill record with `allowedTools` clamped
    to tools the experience actually used = least privilege), `improveSkill`
    (versioned, tenant-locked), pure `shouldNudgePersist` heuristic.

  Tenant-scoped & fail-closed; pure data/logic; LLM synthesis + memory
  backends are injected ports. 288 package tests.

- [`5ed8c38`](https://github.com/Nebutra/Nebutra-Sailor/commit/5ed8c38362e86bad51786383b81cc921b11d1b18) Thanks [@TsekaLuk](https://github.com/TsekaLuk)! - Absorb the coding-agent share/permission delta (over the already-absorbed core).
  - `permission-ruleset`: `Rule{permission,pattern,action:allow|deny|ask}` +
    `evaluate(...rulesets)` first-match over both dimensions with fail-safe
    `ask` default, a `wildcardMatch` with the faithful trailing `" *"`-optional
    rule (no catastrophic backtracking), and a bash-command-prefix/arity
    extractor (`commandPrefix`/`commandPermissionKey`).
  - `session-share`: mint a read-only `ShareRecord{id,url,secret}` for a
    session, revoke it, public secret-gated `verifyViewer` (no tenantId —
    constant-time compare; documented threat model). Injected id-mint /
    url-builder / sync-sink / store ports; kill-switch; persist-first
    best-effort sync.

  Owner plane tenant-scoped & fail-closed; viewer plane secret-gated; pure
  where stateless; transport/crypto/store injected. 496 package tests.

- [`77c0105`](https://github.com/Nebutra/Nebutra-Sailor/commit/77c0105ce89a4ff0f5e86229cce9c2561c1b1c5f) Thanks [@TsekaLuk](https://github.com/TsekaLuk)! - Absorb the site-clone / targeted-edit delta (over the already-absorbed core).
  - `design-context`: website → structured generation seed
    `{content, brand{colors,fonts}, screenshot, title}` — pure normalizer +
    injected `ScrapeProvider` port (no network/provider lock-in),
    `toGenerationSeed` bounded deterministic prompt block.
  - `edit-planner`: pattern-driven `analyzeEditIntent` (7 EditTypes) +
    `selectFilesForEdit` (primary/context split + deterministic system-prompt
    builder) + generalised fast-apply (`parseEditBlocks` / `applyEditBlock`
    with an injected merger). Targeted edit planning vs regenerate-all.

  Tenant-scoped & fail-closed; pure data/logic; scrape + LLM-merge are
  injected ports. 219 package tests.

- [`1e2d929`](https://github.com/Nebutra/Nebutra-Sailor/commit/1e2d9298f4f093cbe81199e7dcd3991116d01ea2) Thanks [@TsekaLuk](https://github.com/TsekaLuk)! - Absorb the terminal-suggestion delta (over the already-absorbed core).
  - `fuzzy-match`: smart-case subsequence fuzzy match returning
    `{score, indices}` (lowercase query ⇒ case-insensitive; any uppercase ⇒
    case-sensitive), case-insensitive + ignore-spaces variants (indices map to
    original text), anchored glob-wildcard (`* ? [a-z] \`, no catastrophic
    backtracking), stable `rankByFuzzy`. Pure, dependency-free.
  - `command-suggestions`: `classifyMatch` with deterministic
    exact > prefix > fuzzy score banding, `rankSuggestions` (history-boost +
    shorter-text + stable tie-breaks), `dedupeByText` (history-wins,
    case-insensitive), tenant-scoped `SuggestionHistoryStore` (recency ring,
    cross-tenant isolation). Fuzzy matcher injected.

  Tenant-scoped & fail-closed where stateful; pure data/logic. The source's
  generated `command-signatures-v2` JS bundle was deliberately not ported.
  426 package tests.

- [`509338e`](https://github.com/Nebutra/Nebutra-Sailor/commit/509338ee5ffc537c108f06cd1fc24a811a5e05b8) Thanks [@TsekaLuk](https://github.com/TsekaLuk)! - Concrete Track-B coupling for the agent-runtime external-sandbox seam.
  - Add `createHttpSandbox(baseUrl)`: an `ExternalSandbox` that delegates
    execution over HTTP to the decoupled Rust isolator
    (`backends/rust/sandbox`, `POST /api/v1/sandbox/exec`).
  - Non-2xx isolator responses (e.g. a fail-closed 403 refusal) surface as
    `SandboxDelegationError` and are never coerced into a fabricated result.
  - The Rust isolator now mirrors the `SandboxExecRequest` /
    `SandboxExecResult` / `CapabilityPolicy` wire shapes and is fail-closed
    until a real isolation backend (Wasmtime/Firecracker) is wired.

- [`efe764d`](https://github.com/Nebutra/Nebutra-Sailor/commit/efe764d60085352eae304dc37dc22fda8920e587) Thanks [@TsekaLuk](https://github.com/TsekaLuk)! - Absorb the web-app-builder delta (the differentiated capabilities over the
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

### Patch Changes

- Updated dependencies [[`5d3d7e6`](https://github.com/Nebutra/Nebutra-Sailor/commit/5d3d7e6c59cae5aa242bb988b75a9888cfd0db39)]:
  - @nebutra/mcp@0.1.1
