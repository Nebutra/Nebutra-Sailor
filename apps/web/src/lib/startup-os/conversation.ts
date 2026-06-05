import { runWithFallback } from "@nebutra/agents";
import { streamText } from "ai";
import { flatCompanyView } from "./company-context/projection";
import type {
  StartupArtifactKind,
  StartupArtifactStatus,
  StartupArtifactUpdate,
  StartupOSProject,
} from "./compiler";
import {
  applyGeneratedFilePatches,
  currentIso,
  parseGeneratedRunResult,
  type StartupRunUsageEvent,
} from "./execution";
import type { StartupOSFile } from "./files";
import {
  buildStartupEffortProviderOptions,
  type StartupEffortLevel,
  type StartupModelTier,
  selectStartupModelTier,
} from "./model-tier";
import type { StartupOSEventInput } from "./store";

/**
 * Sentinel line that separates the streamed founder-facing PLAN (prose, before)
 * from the strict JSON result tail (after). Split on the FIRST line-anchored
 * occurrence; the model is instructed never to repeat it.
 */
export const SENTINEL = "§§§STARTUP_OS_RESULT§§§";

const SENTINEL_LINE = /^§§§STARTUP_OS_RESULT§§§$/m;

const STRICT_JSON_ERROR =
  "Startup OS model response must be strict JSON with summary, artifactUpdates, and filePatches.";

// ─── Injectable streamer port (keyless, mirrors execution.ts invokeModel) ─────

export interface StartupConversationStreamRequest {
  readonly project: StartupOSProject;
  readonly instruction: string;
  readonly prompt: string;
  /**
   * Chosen model tier (preset alias for runWithFallback) and thinking effort.
   * Optional + defaulted so the default streamer and existing tests stay on
   * the legacy fast/low behavior when omitted.
   */
  readonly tier?: StartupModelTier;
  readonly effort?: StartupEffortLevel;
}

export interface StartupConversationStreamFinish {
  readonly provider: string;
  readonly model: string;
  readonly usage?: {
    readonly inputTokens?: number;
    readonly outputTokens?: number;
    readonly totalTokens?: number;
  };
}

/**
 * Async-generator port. Yields raw text deltas; returns finish metadata.
 * Tests inject a fake generator → NO api key needed (exactly like invokeModel).
 */
export type StartupConversationStreamer = (
  request: StartupConversationStreamRequest,
) => AsyncGenerator<string, StartupConversationStreamFinish, void>;

// ─── Event union (yielded by the generator) ──────────────────────────────────

export type StartupConversationEvent =
  // Emitted by the chat route (not the generator) up-front so the client can
  // revert-and-resend this turn from its pre-patch snapshot.
  | { readonly type: "turn"; readonly turnId: string }
  | {
      readonly type: "status";
      readonly phase: "started" | "planning" | "generating" | "applying" | "done";
      readonly occurredAt: string;
    }
  | { readonly type: "plan-delta"; readonly text: string }
  | {
      readonly type: "file";
      readonly path: string;
      readonly language: string;
      readonly action: "updated";
      readonly occurredAt: string;
    }
  | {
      readonly type: "artifact";
      readonly kind: StartupArtifactKind;
      readonly status?: StartupArtifactStatus;
      readonly summary?: string;
    }
  | { readonly type: "summary"; readonly text: string }
  | {
      readonly type: "done";
      readonly summary: string;
      readonly fileCount: number;
      readonly artifactCount: number;
      readonly provider: string;
      readonly model: string;
      readonly totalTokens: number;
      readonly occurredAt: string;
    }
  | { readonly type: "error"; readonly message: string; readonly occurredAt: string };

// ─── Generator signature + return ─────────────────────────────────────────────

export interface StreamStartupConversationInput {
  readonly tenantId: string;
  readonly userId: string;
  readonly files?: readonly StartupOSFile[];
  readonly now?: () => string;
  readonly streamModel?: StartupConversationStreamer;
  readonly recordUsage?: (event: StartupRunUsageEvent) => Promise<void>;
}

export interface StreamStartupConversationResult {
  readonly project: StartupOSProject;
  readonly files?: readonly StartupOSFile[];
  readonly plan: string;
  readonly summary: string;
  readonly events: readonly StartupOSEventInput[];
}

// ─── Prompt builder (analogous to buildStartupRunPrompt) ──────────────────────

const CONVERSATION_SYSTEM_PROMPT = `You are Nebutra Startup Agent OS in conversational build mode.
The editable workspace is a TanStack Start app PRE-WIRED with the Nebutra design
system: it already depends on @nebutra/ui (components), @nebutra/tokens (design
tokens — src/styles/app.css imports "@nebutra/tokens/styles.css"), and
@nebutra/icons. File-based routing lives under src/routes/, src/routes/__root.tsx
is the HTML shell (there is NO index.html or src/main.tsx) and wraps the app in a
next-themes ThemeProvider, src/routes/index.tsx is the home route, and global styles
live in src/styles/app.css. To change the founder landing surface patch
src/routes/index.tsx; to change the document head or shell patch src/routes/__root.tsx;
for styling patch src/styles/app.css.
You MUST keep building UI with @nebutra/ui components (e.g. Button, Card, Badge from
"@nebutra/ui/primitives") and @nebutra/icons glyphs, plus the brand CSS variables from
@nebutra/tokens (var(--brand-gradient), var(--neutral-12), etc.) — NEVER revert the
founder surface to bare/unstyled HTML or hardcoded hex colors.
First, write a short founder-facing PLAN in prose (1-5 sentences, no markdown
headers, no code fences). Then emit EXACTLY this sentinel on its own line:

${SENTINEL}

Immediately after the sentinel, emit ONE fenced \`\`\`json block with strict JSON:
keys summary, artifactUpdates, filePatches. filePatches may ONLY update existing
workspace paths shown in workspaceFiles (use those exact paths) and must include
full replacement content. Never claim a deploy, send, payment, or production
mutation happened. Output nothing after the closing fence.`;

function describeWorkspaceFiles(files: readonly StartupOSFile[] | undefined) {
  if (!files?.length) return [];
  return files.map((file) => ({
    path: file.path,
    kind: file.kind,
    language: file.language,
    content: file.content.slice(0, 8000),
  }));
}

export function buildStartupConversationPrompt(
  project: StartupOSProject,
  instruction: string,
  files?: readonly StartupOSFile[],
): string {
  return JSON.stringify(
    {
      instruction,
      companyContext: flatCompanyView(project.companyContext),
      thesis: project.thesis,
      arena: project.arena,
      artifacts: project.artifacts.map((artifact) => ({
        kind: artifact.kind,
        title: artifact.title,
        status: artifact.status,
        summary: artifact.summary,
      })),
      workspaceFiles: describeWorkspaceFiles(files),
    },
    null,
    2,
  );
}

// ─── Artifact fold (completeStartupRun-style merge, no run involved) ──────────

function foldArtifactUpdates(
  project: StartupOSProject,
  updates: readonly StartupArtifactUpdate[],
  updatedAt: string,
): StartupOSProject {
  if (updates.length === 0) return project;
  const updatesByKind = new Map(updates.map((update) => [update.kind, update]));
  return {
    ...project,
    updatedAt,
    artifacts: project.artifacts.map((artifact) => {
      const update = updatesByKind.get(artifact.kind);
      if (!update) return artifact;
      return {
        ...artifact,
        ...(update.status ? { status: update.status } : {}),
        ...(update.summary ? { summary: update.summary } : {}),
        ...(update.payload ? { payload: update.payload } : {}),
      };
    }),
  };
}

function fileLanguage(files: readonly StartupOSFile[] | undefined, path: string): string {
  return files?.find((file) => file.path === path)?.language ?? "text";
}

// ─── Streaming engine ─────────────────────────────────────────────────────────

export async function* streamStartupConversation(
  project: StartupOSProject,
  instruction: string,
  input: StreamStartupConversationInput,
): AsyncGenerator<StartupConversationEvent, StreamStartupConversationResult, void> {
  const now = input.now ?? currentIso;
  const stream = input.streamModel ?? createRealStartupConversationStreamer();
  const originalFiles = input.files;

  // Pure tier/effort decision. A conversation turn already has the raw founder
  // instruction, so it is scored directly (no synthetic instruction needed).
  // v1 has no retry concept on a fresh turn → isRetryAfterFailure: false.
  const decision = selectStartupModelTier({
    instruction,
    fileCount: originalFiles?.length ?? 0,
    isRetryAfterFailure: false,
  });

  const startedAt = now();
  const conversationStartedEvent: StartupOSEventInput = {
    type: "conversation_started",
    occurredAt: startedAt,
    actorId: input.userId,
    summary: `Started conversational build turn: ${instruction}`.slice(0, 280),
    metadata: {
      instruction,
      tier: decision.tier,
      effort: decision.effort,
      reason: decision.reason,
    },
  };

  yield { type: "status", phase: "started", occurredAt: startedAt };
  yield { type: "status", phase: "planning", occurredAt: now() };

  let plan = "";
  let tail = "";
  let sawSentinel = false;
  let finish: StartupConversationStreamFinish;

  try {
    const iterator = stream({
      project,
      instruction,
      prompt: buildStartupConversationPrompt(project, instruction, originalFiles),
      tier: decision.tier,
      effort: decision.effort,
    });

    let next = await iterator.next();
    while (!next.done) {
      const delta = next.value;
      if (sawSentinel) {
        tail += delta;
      } else {
        const combined = plan + delta;
        const match = SENTINEL_LINE.exec(combined);
        if (match) {
          sawSentinel = true;
          plan = combined.slice(0, match.index);
          tail = combined.slice(match.index + match[0].length);
        } else {
          plan = combined;
          if (delta.length > 0) {
            yield { type: "plan-delta", text: delta };
          }
        }
      }
      next = await iterator.next();
    }
    finish = next.value;

    if (!sawSentinel) {
      throw new Error(STRICT_JSON_ERROR);
    }

    yield { type: "status", phase: "generating", occurredAt: now() };
    const generated = parseGeneratedRunResult(tail);

    const appliedAt = now();
    yield { type: "status", phase: "applying", occurredAt: appliedAt };
    const patchedFiles = applyGeneratedFilePatches(originalFiles, generated.filePatches, appliedAt);

    const fileEvents: StartupOSEventInput[] = [];
    for (const patch of generated.filePatches) {
      const language = fileLanguage(patchedFiles ?? originalFiles, patch.path);
      yield {
        type: "file",
        path: patch.path,
        language,
        action: "updated",
        occurredAt: appliedAt,
      };
      fileEvents.push({
        type: "file_updated",
        occurredAt: appliedAt,
        actorId: input.userId,
        summary: `Updated ${patch.path} through a conversation turn.`,
        metadata: { path: patch.path, source: "conversation" },
      });
    }

    for (const update of generated.artifactUpdates) {
      yield {
        type: "artifact",
        kind: update.kind,
        ...(update.status ? { status: update.status } : {}),
        ...(update.summary ? { summary: update.summary } : {}),
      };
    }
    const foldedProject = foldArtifactUpdates(project, generated.artifactUpdates, appliedAt);

    yield { type: "summary", text: generated.summary };

    const totalTokens = finish.usage?.totalTokens ?? 0;
    if (totalTokens > 0) {
      await input.recordUsage?.({
        tenantId: input.tenantId,
        projectId: project.id,
        runId: `conversation:${startedAt}`,
        provider: finish.provider,
        model: finish.model,
        tokens: totalTokens,
      });
    }

    const doneAt = now();
    yield {
      type: "done",
      summary: generated.summary,
      fileCount: generated.filePatches.length,
      artifactCount: generated.artifactUpdates.length,
      provider: finish.provider,
      model: finish.model,
      totalTokens,
      occurredAt: doneAt,
    };
    yield { type: "status", phase: "done", occurredAt: doneAt };

    const events: StartupOSEventInput[] = [
      conversationStartedEvent,
      {
        type: "conversation_message",
        occurredAt: appliedAt,
        actorId: input.userId,
        summary: plan.trim() || generated.summary,
        metadata: { provider: finish.provider, model: finish.model },
      },
      ...fileEvents,
      {
        type: "conversation_completed",
        occurredAt: doneAt,
        actorId: input.userId,
        summary: generated.summary,
        metadata: {
          provider: finish.provider,
          model: finish.model,
          totalTokens,
          fileCount: generated.filePatches.length,
          artifactCount: generated.artifactUpdates.length,
        },
      },
    ];

    return {
      project: foldedProject,
      ...(patchedFiles ? { files: patchedFiles } : {}),
      plan: plan.trim(),
      summary: generated.summary,
      events,
    };
  } catch (error) {
    const failedAt = now();
    const message = error instanceof Error ? error.message : String(error);
    yield { type: "error", message, occurredAt: failedAt };

    return {
      project,
      ...(originalFiles ? { files: originalFiles } : {}),
      plan: plan.trim(),
      summary: "",
      events: [
        conversationStartedEvent,
        {
          type: "conversation_failed",
          occurredAt: failedAt,
          actorId: input.userId,
          summary: message,
          metadata: { instruction },
        },
      ],
    };
  }
}

// ─── Default real streamer (thin, key-gated; NOT exercised by tests) ──────────

export function createRealStartupConversationStreamer(): StartupConversationStreamer {
  return async function* realStreamer(request) {
    // Backward-compatible defaults: omitted tier/effort keeps fast/low.
    const tier = request.tier ?? "fast";
    const effort = request.effort ?? "low";
    // Top-level call providerOptions carrying the chosen thinking effort. Only
    // the active fallback provider's namespace is applied; cache-control (if
    // ever added) lives at the system-MESSAGE level, so no merge is needed.
    const providerOptions = buildStartupEffortProviderOptions(effort);
    const { result, provider } = await runWithFallback(
      async (model) =>
        streamText({
          model,
          system: CONVERSATION_SYSTEM_PROMPT,
          messages: [{ role: "user", content: request.prompt }],
          temperature: 0.4,
          maxOutputTokens: 2400,
          providerOptions,
        }),
      { model: tier },
    );

    for await (const delta of result.textStream) {
      yield delta;
    }

    const usage = await Promise.resolve(result.usage).catch(() => undefined);
    const usageRecord =
      usage && typeof usage === "object" ? (usage as Record<string, unknown>) : {};
    const inputTokens =
      typeof usageRecord.inputTokens === "number" ? usageRecord.inputTokens : undefined;
    const outputTokens =
      typeof usageRecord.outputTokens === "number" ? usageRecord.outputTokens : undefined;
    const totalTokens =
      typeof usageRecord.totalTokens === "number"
        ? usageRecord.totalTokens
        : (inputTokens ?? 0) + (outputTokens ?? 0);

    return {
      provider,
      // Reports the chosen preset alias (was literally "fast"), not the
      // resolved model id — matches existing usage-event semantics.
      model: tier,
      usage: {
        ...(inputTokens !== undefined ? { inputTokens } : {}),
        ...(outputTokens !== undefined ? { outputTokens } : {}),
        totalTokens,
      },
    };
  };
}
