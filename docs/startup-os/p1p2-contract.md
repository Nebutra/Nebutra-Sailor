# Startup OS — P1/P2 Engineering Contract (Streaming Conversational Generation)

Build-ready spec for the streaming conversation engine (P1) + SSE chat route (P2).
Reuse existing patterns; do NOT fork helpers. Keyless-testable (inject a fake streamer).

## P1 — `apps/web/src/lib/startup-os/conversation.ts`

### Injectable streamer port (keyless, mirrors execution.ts `invokeModel`)

```ts
export interface StartupConversationStreamRequest {
  readonly project: StartupOSProject;
  readonly instruction: string;
  readonly prompt: string; // built by buildStartupConversationPrompt()
}
export interface StartupConversationStreamFinish {
  readonly provider: string;
  readonly model: string;
  readonly usage?: { inputTokens?: number; outputTokens?: number; totalTokens?: number };
}
// Async-generator port. Yields raw text deltas; returns finish metadata.
// Tests inject a fake generator → NO api key needed (exactly like invokeModel).
export type StartupConversationStreamer = (
  request: StartupConversationStreamRequest,
) => AsyncGenerator<string, StartupConversationStreamFinish, void>;
```

### Event union (yielded by the generator)

```ts
export type StartupConversationEvent =
  | { readonly type: "status"; readonly phase: "started" | "planning" | "generating" | "applying" | "done"; readonly occurredAt: string }
  | { readonly type: "plan-delta"; readonly text: string }
  | { readonly type: "file"; readonly path: string; readonly language: string; readonly action: "updated"; readonly occurredAt: string }
  | { readonly type: "artifact"; readonly kind: StartupArtifactKind; readonly status?: StartupArtifactStatus; readonly summary?: string }
  | { readonly type: "summary"; readonly text: string }
  | { readonly type: "done"; readonly summary: string; readonly fileCount: number; readonly artifactCount: number; readonly provider: string; readonly model: string; readonly totalTokens: number; readonly occurredAt: string }
  | { readonly type: "error"; readonly message: string; readonly occurredAt: string };
```

### Generator signature + return

```ts
export interface StreamStartupConversationInput {
  readonly tenantId: string;
  readonly userId: string;
  readonly files?: readonly StartupOSFile[];
  readonly now?: () => string;                        // injectable clock, default currentIso
  readonly streamModel?: StartupConversationStreamer; // default = real streamer (key-gated)
  readonly recordUsage?: (e: StartupRunUsageEvent) => Promise<void>; // reuse execution.ts type
}
export interface StreamStartupConversationResult {
  readonly project: StartupOSProject;
  readonly files?: readonly StartupOSFile[];
  readonly plan: string;
  readonly summary: string;
  readonly events: readonly StartupOSEventInput[];
}
export async function* streamStartupConversation(
  project: StartupOSProject,
  instruction: string,
  input: StreamStartupConversationInput,
): AsyncGenerator<StartupConversationEvent, StreamStartupConversationResult, void>;
```

### Internal flow (reuse execution.ts helpers)

1. yield `status:started` then `status:planning`.
2. Drive `streamModel(...)`. Buffer deltas in `raw`. Split on the sentinel line
   `§§§STARTUP_OS_RESULT§§§` (regex `/^§§§STARTUP_OS_RESULT§§§$/m`, FIRST occurrence).
   Before sentinel → emit `plan-delta` per delta/whole-line; after → accumulate JSON tail.
3. After stream ends: yield `status:generating`. Feed the fenced-json tail into the
   **reused & exported** `parseGeneratedRunResult()` from execution.ts →
   `{summary, artifactUpdates, filePatches}` (validated by `GeneratedRunResultSchema`).
4. yield `status:applying`. Per filePatch → reuse exported `applyGeneratedFilePatches()`
   (reducer over `patchStartupProjectFile`); yield one `file` event each. Per artifactUpdate
   → yield `artifact` event + fold into project via `completeStartupRun`-style merge. yield `summary`.
5. yield `done` + `status:done`; call `recordUsage` when totalTokens>0. Build
   `events: StartupOSEventInput[]` = `conversation_started` + `conversation_message`(plan)
   + per `file_updated` + `conversation_completed`.
6. On ANY throw (streamer error / parse throw / missing file): yield `error`, set events to
   `[conversation_started, conversation_failed]`, return result with UN-patched files +
   original project (fail-closed — persist nothing mutating).

### Model output protocol (single streamed text body)

System prompt (via `buildStartupConversationPrompt`, analogous to `buildStartupRunPrompt`):

```
You are Nebutra Startup Agent OS in conversational build mode.
First, write a short founder-facing PLAN in prose (1-5 sentences, no markdown
headers, no code fences). Then emit EXACTLY this sentinel on its own line:

§§§STARTUP_OS_RESULT§§§

Immediately after the sentinel, emit ONE fenced ```json block with strict JSON:
keys summary, artifactUpdates, filePatches. filePatches may ONLY update existing
workspace paths shown in workspaceFiles and must include full replacement content.
Never claim a deploy, send, payment, or production mutation happened. Output
nothing after the closing fence.
```

`SENTINEL = "§§§STARTUP_OS_RESULT§§§"` (exported const). Text before = `plan`
(streamed). Text after = fenced JSON → existing `parseGeneratedRunResult()` (already
strips fences + validates). If sentinel never appears OR JSON tail fails schema → throw
the SAME "must be strict JSON with summary, artifactUpdates, and filePatches" error →
one `error` event + `conversation_failed`; turn is non-mutating.

### store.ts change

ADD `"conversation_started" | "conversation_message" | "conversation_completed" | "conversation_failed"`
to BOTH the `StartupOSEventType` union AND the inline allowlist inside `isStartupOSEvent`.
No schema migration (events live in `AtelierCanvas.scene` JSON).

### execution.ts change

EXPORT `parseGeneratedRunResult`, `applyGeneratedFilePatches`, `GeneratedRunResultSchema`,
and `currentIso` (currently module-private) so conversation.ts reuses, not forks, them.
(If reviewers prefer, extract to `startup-os/generated-result.ts` and import from both —
pick export-in-place for the smaller diff.)

## P2 — `POST /api/startup-os/projects/[projectId]/chat`

`Content-Type: text/event-stream`, `Cache-Control: no-cache, no-transform`,
`X-Accel-Buffering: no`. Returns a Web `ReadableStream`. `export const dynamic =
"force-dynamic"`. **Node runtime — do NOT set `runtime: 'edge'`** (streamText needs Node).
Each frame: `event: <type>\ndata: <json>\n\n`. Frame name == event `type`.

| event | data | when |
|---|---|---|
| status | `{phase, occurredAt}` | lifecycle started→planning→generating→applying→done |
| plan-delta | `{text}` | each plan chunk before sentinel |
| file | `{path, language, action:"updated", occurredAt}` | per applied patch |
| artifact | `{kind, status?, summary?}` | per artifactUpdate |
| summary | `{text}` | run-result summary |
| done | `{summary, fileCount, artifactCount, provider, model, totalTokens, occurredAt}` | AFTER save+rollout+audit succeed |
| error | `{message, occurredAt}` | in-stream failure |

Trailing `event: end\ndata: [DONE]\n\n` then `controller.close()`.

Route control flow (reuse execute/route.ts verbatim):
1. `getRequestContext`: prototype gate → 404; `getAuth` → 401 unsigned / 403 no orgId;
   `resolveRole` + `hasPermission(role,"project:update")` → 403.
2. `hasStartupOSAIProviderKey()` false → **503 JSON** (fail before opening the stream).
3. Parse body with zod `ChatRequestSchema = z.object({ instruction: z.string().min(1).max(4000) })`; invalid → 400 JSON.
4. `getStartupProjectRecord` → 404 JSON if missing. `workspaceFiles = existing.files ?? buildStartupProjectFiles(existing.project)`.
5. Open `ReadableStream`. In `start(controller)`: iterate `streamStartupConversation(...)`,
   enqueue an SSE frame per event. On generator return value: inside `$transaction` run
   `saveStartupProjectRecord({events, files})` + `recordStartupOSRunRollout` (reuse
   `persistStartupRunResult` shape), then `auditLogger().log({ action: failed ?
   "startup_os.chat.failed" : "startup_os.chat.completed", outcome,
   resource:{type:"startup_os_project_chat"} })`, enqueue final `done`/`error` + `end`, close.
6. Any thrown error during streaming → enqueue `error` + `end`, close (NEVER 500-after-200).

## Files

Create: `lib/startup-os/conversation.ts`, `lib/startup-os/__tests__/conversation.test.ts`,
`app/api/startup-os/projects/[projectId]/chat/route.ts`,
`app/api/startup-os/projects/[projectId]/chat/__tests__/route.test.ts`.
Modify: `lib/startup-os/store.ts`, `lib/startup-os/execution.ts`.

## TDD test plan (NO api key — inject fake streamer / mock the generator)

**A. conversation.test.ts** (inject `streamModel` fake async generator; fixtures via
`compileStartupProject` + `approveGovernanceReview` + `buildStartupProjectFiles`):
1. streams plan deltas then parses JSON tail — assert event order `status(started)`,
   `status(planning)`, ≥1 `plan-delta`, `status(generating)`, `status(applying)`, ≥1 `file`,
   ≥1 `artifact`, `summary`, `done`, `status(done)`; `result.plan`/`result.summary` correct.
2. applies filePatches via patchStartupProjectFile — patched content + `generatedFrom==="user-edit"`
   + `updatedAt` from injected `now()`; one `file` event.
3. emits artifact events + folds into project — `artifact{kind:"landing_page",status:"ready"}` +
   `result.project.artifacts` updated.
4. records usage when totalTokens>0 (+ sibling: totalTokens=0 → recordUsage NOT called).
5. fails closed on malformed JSON tail — terminal `error` (msg contains "strict JSON"),
   events `["conversation_started","conversation_failed"]`, files/project unchanged.
6. fails closed when sentinel never appears.
7. propagates streamer throw as `error` + `conversation_failed`, no `done`.
8. builds appendable events `["conversation_started","conversation_message","file_updated","conversation_completed"]`, all `actorId==="user_123"`.

**B. store.test.ts** (extend): 9. round-trips `conversation_*` events through saveStartupProjectRecord.

**C. chat/route.test.ts** (clone execute/route.test.ts harness; additionally
`vi.mock("@/lib/startup-os/conversation")` with a fake generator):
10. 503 without provider key (no stream opened); 11. 400 empty/invalid instruction;
12. 404 missing project; 13. streams SSE frames + persists on done (assert content-type
`text/event-stream`, body has `event: plan-delta`/`event: file`/`event: done`/`event: end`,
save+rollout+audit `startup_os.chat.completed`); 14. error frame + audit failure when
generator returns failed result (still 200/event-stream); 15. 401/403 gates.

Coverage ≥80% on conversation.ts branches + chat route gates.

## Open risks

- Reuse-by-export from execution.ts is the chosen approach (smaller diff than extract).
- Node runtime only (no edge) — streamText needs Node streams.
- Fail-closed: malformed tail persists NOTHING mutating; guard apply phase inside the same try as parse.
- Sentinel collision: split on FIRST line-anchored occurrence; instruct model to never repeat it.
- recordUsage best-effort (wrapped, never throws) — metering outage must not abort the turn.
- AtelierCanvas.scene grows unbounded as events append — future events-window pruning ratchet (out of scope P1/P2).
- Client can't use native EventSource (no POST body) — consume via fetch + ReadableStream reader.
