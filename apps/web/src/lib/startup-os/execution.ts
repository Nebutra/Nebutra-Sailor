import { runWithFallback } from "@nebutra/agents";
import { generateText as generateAIText } from "ai";
import { z } from "zod";
import {
  completeStartupRun,
  failStartupRun,
  type StartupArtifactKind,
  type StartupArtifactStatus,
  type StartupOperatingRun,
  type StartupOSProject,
  startStartupRun,
} from "./compiler";
import { patchStartupProjectFile, type StartupOSFile } from "./files";
import {
  buildStartupEffortProviderOptions,
  type StartupEffortLevel,
  type StartupModelTier,
  selectStartupModelTier,
} from "./model-tier";
import type { StartupOSEventInput } from "./store";

type EnvLike = Record<string, string | undefined>;

export interface StartupRunModelRequest {
  readonly project: StartupOSProject;
  readonly run: StartupOperatingRun;
  readonly prompt: string;
  /**
   * Chosen model tier (preset alias for runWithFallback) and thinking effort.
   * Optional + defaulted so existing callers/tests stay backward compatible
   * (omitting them keeps the legacy always-"fast"/low behavior).
   */
  readonly tier?: StartupModelTier;
  readonly effort?: StartupEffortLevel;
}

export interface StartupRunModelResult {
  readonly text: string;
  readonly provider: string;
  readonly model: string;
  readonly usage?: {
    readonly inputTokens?: number;
    readonly outputTokens?: number;
    readonly totalTokens?: number;
  };
}

export type StartupRunModelInvoker = (
  request: StartupRunModelRequest,
) => Promise<StartupRunModelResult>;

export interface StartupRunUsageEvent {
  readonly tenantId: string;
  readonly projectId: string;
  readonly runId: string;
  readonly provider: string;
  readonly model: string;
  readonly tokens: number;
}

export interface ExecuteStartupRunInput {
  readonly tenantId: string;
  readonly userId: string;
  readonly files?: readonly StartupOSFile[];
  readonly now?: () => string;
  readonly invokeModel?: StartupRunModelInvoker;
  readonly recordUsage?: (event: StartupRunUsageEvent) => Promise<void>;
}

export interface ExecuteStartupRunResult {
  readonly project: StartupOSProject;
  readonly files?: readonly StartupOSFile[];
  readonly events: readonly StartupOSEventInput[];
}

const GeneratedArtifactUpdateSchema = z.object({
  kind: z.enum([
    "company_context",
    "brand_system",
    "brand_film_brief",
    "landing_page",
    "mvp_scaffold",
    "demand_signal_map",
    "governance_plan",
  ]),
  status: z.enum(["drafted", "ready", "review_required"]).optional(),
  summary: z.string().min(1).optional(),
  payload: z.array(z.string().min(1)).min(1).optional(),
});

const GeneratedFilePatchSchema = z.object({
  path: z.string().min(1),
  content: z.string(),
});

export const GeneratedRunResultSchema = z.object({
  summary: z.string().min(1),
  artifactUpdates: z.array(GeneratedArtifactUpdateSchema).default([]),
  filePatches: z.array(GeneratedFilePatchSchema).default([]),
});

export function hasStartupOSAIProviderKey(env: EnvLike = process.env) {
  return Boolean(env.OPENROUTER_API_KEY || env.ANTHROPIC_API_KEY || env.OPENAI_API_KEY);
}

export function currentIso() {
  return new Date().toISOString();
}

function findRun(project: StartupOSProject, runId: string) {
  const run = project.runs.find((item) => item.id === runId);
  if (!run) {
    throw new Error(`Startup OS run not found: ${runId}`);
  }
  return run;
}

export function parseGeneratedRunResult(text: string): {
  readonly summary: string;
  readonly artifactUpdates: readonly {
    readonly kind: StartupArtifactKind;
    readonly status?: StartupArtifactStatus;
    readonly summary?: string;
    readonly payload?: readonly string[];
  }[];
  readonly filePatches: readonly {
    readonly path: string;
    readonly content: string;
  }[];
} {
  const cleaned = text
    .trim()
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```$/i, "");

  try {
    const parsed = GeneratedRunResultSchema.parse(JSON.parse(cleaned));
    return parsed;
  } catch (error) {
    throw new Error(
      `Startup OS model response must be strict JSON with summary, artifactUpdates, and filePatches. ${error instanceof Error ? error.message : ""}`.trim(),
    );
  }
}

function describeWorkspaceFiles(files: readonly StartupOSFile[] | undefined) {
  if (!files?.length) return [];
  return files.map((file) => ({
    path: file.path,
    kind: file.kind,
    language: file.language,
    content: file.content.slice(0, 8000),
  }));
}

export function applyGeneratedFilePatches(
  files: readonly StartupOSFile[] | undefined,
  patches: readonly { readonly path: string; readonly content: string }[],
  updatedAt: string,
) {
  if (patches.length === 0) return files;
  if (!files?.length) {
    throw new Error(
      "Startup OS model returned filePatches, but no editable workspace files exist.",
    );
  }
  return patches.reduce<readonly StartupOSFile[]>(
    (currentFiles, patch) =>
      patchStartupProjectFile(currentFiles, {
        path: patch.path,
        content: patch.content,
        updatedAt,
      }),
    files,
  );
}

export function buildStartupRunPrompt(
  project: StartupOSProject,
  run: StartupOperatingRun,
  files?: readonly StartupOSFile[],
) {
  const artifacts = project.artifacts
    .filter((artifact) => run.artifactIds.includes(artifact.id))
    .map((artifact) => ({
      kind: artifact.kind,
      title: artifact.title,
      summary: artifact.summary,
      payload: artifact.payload,
    }));

  return JSON.stringify(
    {
      instruction:
        "Generate the requested Startup Agent OS artifact update. The workspace is a TanStack Start app with file-based routing under src/routes/ — src/routes/__root.tsx is the HTML shell (no index.html or src/main.tsx exists), src/routes/index.tsx is the home route, and global styles live in src/styles/app.css. To change the founder landing surface, patch src/routes/index.tsx; to change document head or shell, patch src/routes/__root.tsx. Return strict JSON only with keys: summary, artifactUpdates, filePatches. filePatches may only update existing workspace paths shown in workspaceFiles (use those exact paths) and must include full replacement content. Never claim a deploy, send, payment, or production mutation happened.",
      companyContext: project.companyContext,
      thesis: project.thesis,
      run: {
        id: run.id,
        stage: run.stage,
        adapter: run.adapter,
        artifactIds: run.artifactIds,
      },
      targetArtifacts: artifacts,
      workspaceFiles: describeWorkspaceFiles(files),
    },
    null,
    2,
  );
}

export const invokeRealStartupRunModel: StartupRunModelInvoker = async (request) => {
  // Backward-compatible defaults: callers that don't route stay on fast/low.
  const tier = request.tier ?? "fast";
  const effort = request.effort ?? "low";
  // Top-level call providerOptions carrying the chosen thinking effort. Only
  // the active fallback provider's namespace is applied; the rest are ignored.
  // This sits at the CALL level — cache-control (if ever added) lives at the
  // system-MESSAGE level, so there is no collision and no merge is needed here.
  const providerOptions = buildStartupEffortProviderOptions(effort);
  const { result, provider } = await runWithFallback(
    async (model) =>
      generateAIText({
        model,
        system:
          "You are Nebutra Startup Agent OS. The editable workspace is a TanStack Start app: file-based routing under src/routes/, src/routes/__root.tsx is the HTML shell (no index.html or src/main.tsx), src/routes/index.tsx is the home route, and styles live in src/styles/app.css. Produce founder-grade artifacts from CompanyContext and target those real paths in filePatches. Return strict JSON only.",
        messages: [{ role: "user", content: request.prompt }],
        temperature: 0.35,
        maxOutputTokens: 1600,
        providerOptions,
      }),
    { model: tier },
  );
  const usage =
    (result as { usage?: unknown; totalUsage?: unknown }).usage ??
    (result as { usage?: unknown; totalUsage?: unknown }).totalUsage;
  const usageRecord = usage && typeof usage === "object" ? (usage as Record<string, unknown>) : {};
  const inputTokens =
    typeof usageRecord.inputTokens === "number" ? usageRecord.inputTokens : undefined;
  const outputTokens =
    typeof usageRecord.outputTokens === "number" ? usageRecord.outputTokens : undefined;

  return {
    text: result.text,
    provider,
    // The model field reports the chosen preset alias (was literally "fast"),
    // not the resolved model id — matches existing usage-event semantics.
    model: tier,
    usage: {
      ...(inputTokens !== undefined ? { inputTokens } : {}),
      ...(outputTokens !== undefined ? { outputTokens } : {}),
      totalTokens:
        typeof usageRecord.totalTokens === "number"
          ? usageRecord.totalTokens
          : (inputTokens ?? 0) + (outputTokens ?? 0),
    },
  };
};

export async function executeStartupRun(
  project: StartupOSProject,
  runId: string,
  input: ExecuteStartupRunInput,
): Promise<ExecuteStartupRunResult> {
  const now = input.now ?? currentIso;
  const initialRun = findRun(project, runId);
  if (initialRun.approval === "pending_review") {
    throw new Error("Startup OS run requires governance review before execution.");
  }

  // Pure tier/effort decision, computed from the run as found (before any state
  // transition). The instruction is SYNTHETIC: the run carries no free-text
  // prompt, so we score `${stage} ${targetArtifactTitles}` — stage names like
  // "governance.review" carry the keyword signal. fileCount comes from the
  // editable workspace; the retry signal is the original failed status.
  const wasFailedRetry = initialRun.status === "failed";
  const targetArtifactTitles = project.artifacts
    .filter((artifact) => initialRun.artifactIds.includes(artifact.id))
    .map((artifact) => artifact.title)
    .join(" ");
  const decision = selectStartupModelTier({
    instruction: `${initialRun.stage} ${targetArtifactTitles}`.trim(),
    fileCount: input.files?.length ?? 0,
    isRetryAfterFailure: wasFailedRetry,
  });

  // A retry re-plans a previously-failed run so it can start again. This is a
  // legitimate failed → planned transition kept local to startup-os.
  const executableProject = wasFailedRetry
    ? {
        ...project,
        runs: project.runs.map((run) =>
          run.id === runId ? { ...run, status: "planned" as const } : run,
        ),
      }
    : project;

  const startedAt = now();
  const startedProject = startStartupRun(executableProject, runId, {
    now: startedAt,
    provider: "ai-runtime",
    summary: `Started real execution for ${initialRun.stage}.`,
  });
  const startedRun = findRun(startedProject, runId);
  const startedEvent: StartupOSEventInput = {
    type: "run_started",
    occurredAt: startedAt,
    actorId: input.userId,
    summary: `Started ${startedRun.stage} through the Startup OS executor.`,
    metadata: {
      runId,
      stage: startedRun.stage,
      provider: startedRun.provider ?? "ai-runtime",
      tier: decision.tier,
      effort: decision.effort,
      reason: decision.reason,
    },
  };

  try {
    const modelResult = await (input.invokeModel ?? invokeRealStartupRunModel)({
      project: startedProject,
      run: startedRun,
      prompt: buildStartupRunPrompt(startedProject, startedRun, input.files),
      tier: decision.tier,
      effort: decision.effort,
    });
    const completedAt = now();
    const generated = parseGeneratedRunResult(modelResult.text);
    const completedFiles = applyGeneratedFilePatches(
      input.files,
      generated.filePatches,
      completedAt,
    );
    const completedProject = completeStartupRun(startedProject, runId, {
      now: completedAt,
      provider: modelResult.provider,
      resultSummary: generated.summary,
      summary: generated.summary,
      artifactUpdates: generated.artifactUpdates,
    });
    const totalTokens = modelResult.usage?.totalTokens ?? 0;
    if (totalTokens > 0) {
      await input.recordUsage?.({
        tenantId: input.tenantId,
        projectId: project.id,
        runId,
        provider: modelResult.provider,
        model: modelResult.model,
        tokens: totalTokens,
      });
    }

    return {
      project: completedProject,
      ...(completedFiles ? { files: completedFiles } : {}),
      events: [
        startedEvent,
        {
          type: "run_completed",
          occurredAt: completedAt,
          actorId: input.userId,
          summary: `Completed ${startedRun.stage} through ${modelResult.provider}.`,
          metadata: {
            runId,
            stage: startedRun.stage,
            provider: modelResult.provider,
            model: modelResult.model,
            totalTokens,
            filePatchCount: generated.filePatches.length,
            tier: decision.tier,
            effort: decision.effort,
            reason: decision.reason,
          },
        },
      ],
    };
  } catch (error) {
    const failedAt = now();
    const message = error instanceof Error ? error.message : String(error);
    return {
      project: failStartupRun(startedProject, runId, {
        now: failedAt,
        summary: message,
      }),
      events: [
        startedEvent,
        {
          type: "run_failed",
          occurredAt: failedAt,
          actorId: input.userId,
          summary: message,
          metadata: {
            runId,
            stage: startedRun.stage,
          },
        },
      ],
    };
  }
}
