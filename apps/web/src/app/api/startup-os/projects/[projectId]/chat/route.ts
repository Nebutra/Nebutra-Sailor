// @seam-exempt: the only ORM token here is the tenant-scoped $transaction that
// wraps already-seam'd store/rollout wrappers (saveStartupProjectRecord,
// recordStartupOSRunRollout) — no raw Prisma model access to migrate. Mirrors the
// allowlisted runs/[runId]/execute/route.ts persistStartupRunResult shape verbatim.
import { auditLogger } from "@nebutra/audit";
import { logger } from "@nebutra/logger";
import { AI_TOKENS, getMetering } from "@nebutra/metering";
import { NextResponse } from "next/server";
import { z } from "zod";
import { getAuth } from "@/lib/auth";
import { getTenantDb } from "@/lib/db";
import { hasPermission, resolveRole } from "@/lib/permissions";
import { companyName } from "@/lib/startup-os/company-context/projection";
import {
  type StartupConversationEvent,
  type StreamStartupConversationResult,
  streamStartupConversation,
} from "@/lib/startup-os/conversation";
import { hasStartupOSAIProviderKey, type StartupRunUsageEvent } from "@/lib/startup-os/execution";
import { isStartupOSPrototypeEnabled } from "@/lib/startup-os/feature-flag";
import { buildStartupProjectFiles } from "@/lib/startup-os/files";
import { recordStartupOSRunRollout, type StartupOSRolloutDb } from "@/lib/startup-os/rollout";
import {
  getStartupProjectRecord,
  type StartupOSDb,
  type StartupOSProjectRecord,
  type StartupTurnSnapshot,
  saveStartupProjectRecord,
} from "@/lib/startup-os/store";

export const dynamic = "force-dynamic";

const CHAT_RUN_ID = "conversation";

const ChatRequestSchema = z.object({
  instruction: z.string().min(1).max(4000),
});

interface RouteContext {
  readonly params: Promise<{
    readonly projectId: string;
  }>;
}

type StartupOSRuntimeDb = StartupOSDb &
  StartupOSRolloutDb & {
    readonly $transaction?: <T>(
      action: (tx: StartupOSDb & StartupOSRolloutDb) => Promise<T>,
    ) => Promise<T>;
  };

function disabledResponse() {
  return NextResponse.json({ error: "Startup OS is not enabled." }, { status: 404 });
}

async function getRequestContext(request: Request) {
  if (!isStartupOSPrototypeEnabled()) {
    return { response: disabledResponse() } as const;
  }

  const auth = await getAuth(request);
  if (!auth.isSignedIn || !auth.userId) {
    return {
      response: NextResponse.json({ error: "Authentication required." }, { status: 401 }),
    } as const;
  }
  if (!auth.orgId) {
    return {
      response: NextResponse.json({ error: "Organization required." }, { status: 403 }),
    } as const;
  }
  const role = resolveRole(auth.sessionClaims?.org_role as string | undefined);
  if (!hasPermission(role, "project:update")) {
    return {
      response: NextResponse.json({ error: "Forbidden" }, { status: 403 }),
    } as const;
  }
  const orgId = auth.orgId;

  return {
    auth,
    orgId,
    userId: auth.userId,
    db: getTenantDb(orgId) as unknown as StartupOSRuntimeDb,
  } as const;
}

async function persistChatResult(input: {
  readonly db: StartupOSRuntimeDb;
  readonly tenantId: string;
  readonly result: StreamStartupConversationResult;
  readonly snapshot?: StartupTurnSnapshot;
}): Promise<{
  readonly saved: StartupOSProjectRecord;
  readonly rollout: { readonly threadId: string };
}> {
  const persist = async (db: StartupOSDb & StartupOSRolloutDb) => {
    const saved = await saveStartupProjectRecord(db, input.tenantId, input.result.project, {
      events: input.result.events,
      ...(input.result.files ? { files: input.result.files } : {}),
      ...(input.snapshot ? { snapshot: input.snapshot } : {}),
    });
    const rollout = await recordStartupOSRunRollout({
      db,
      tenantId: input.tenantId,
      project: saved.project,
      runId: CHAT_RUN_ID,
      events: input.result.events,
    });
    return { saved, rollout };
  };

  return input.db.$transaction ? input.db.$transaction(persist) : persist(input.db);
}

async function recordStartupOSUsage(event: StartupRunUsageEvent) {
  try {
    const metering = await getMetering();
    await metering.defineMeter(AI_TOKENS);
    await metering.ingest({
      meterId: AI_TOKENS.id,
      tenantId: event.tenantId,
      value: event.tokens,
      timestamp: new Date().toISOString(),
      idempotencyKey: `startup-os:${event.projectId}:${event.runId}:${event.provider}:${event.model}`,
      properties: {
        surface: "startup_os",
        projectId: event.projectId,
        runId: event.runId,
        provider: event.provider,
        model: event.model,
      },
    });
  } catch (error) {
    logger.warn("[startup-os.chat] Failed to record metering usage", {
      tenantId: event.tenantId,
      projectId: event.projectId,
      runId: event.runId,
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
}

function eventFrame(event: { readonly type: string } & Record<string, unknown>): string {
  const { type, ...data } = event;
  return `event: ${type}\ndata: ${JSON.stringify(data)}\n\n`;
}

function endFrame(): string {
  return "event: end\ndata: [DONE]\n\n";
}

export async function POST(request: Request, context: RouteContext) {
  const requestContext = await getRequestContext(request);
  if ("response" in requestContext) return requestContext.response;

  if (!hasStartupOSAIProviderKey()) {
    return NextResponse.json(
      {
        error:
          "Startup OS AI execution requires a private provider key: OPENROUTER_API_KEY, ANTHROPIC_API_KEY, or OPENAI_API_KEY.",
      },
      { status: 503 },
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Request body must be valid JSON." }, { status: 400 });
  }
  const parsed = ChatRequestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "A non-empty instruction (1-4000 characters) is required." },
      { status: 400 },
    );
  }
  const instruction = parsed.data.instruction;

  const { projectId } = await context.params;
  const decodedProjectId = decodeURIComponent(projectId);

  const existing = await getStartupProjectRecord(
    requestContext.db,
    requestContext.orgId,
    decodedProjectId,
  );
  if (!existing) {
    return NextResponse.json({ error: "Startup OS project not found." }, { status: 404 });
  }

  const workspaceFiles = existing.files ?? buildStartupProjectFiles(existing.project);
  const { auth, db, orgId, userId } = requestContext;

  const encoder = new TextEncoder();
  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const enqueue = (chunk: string) => controller.enqueue(encoder.encode(chunk));

      try {
        const generator = streamStartupConversation(existing.project, instruction, {
          tenantId: orgId,
          userId,
          files: workspaceFiles,
          recordUsage: recordStartupOSUsage,
        });

        let pendingDone: StartupConversationEvent | null = null;
        let next = await generator.next();
        while (!next.done) {
          const event = next.value;
          if (event.type === "done") {
            // Hold the terminal done frame until persistence + audit succeed.
            pendingDone = event;
          } else {
            enqueue(eventFrame(event));
          }
          next = await generator.next();
        }

        const result = next.value;
        const failed = result.events.some((event) => event.type === "conversation_failed");

        if (!failed) {
          // Pre-turn workspace snapshot — the basis for revert-and-resend / undo.
          const turnSnapshot: StartupTurnSnapshot = {
            turnId: globalThis.crypto.randomUUID(),
            prompt: instruction,
            files: workspaceFiles,
            createdAt: new Date().toISOString(),
          };
          const { saved, rollout } = await persistChatResult({
            db,
            tenantId: orgId,
            result,
            snapshot: turnSnapshot,
          });
          await auditLogger(request, {
            actor: { id: userId, type: "user" },
            tenantId: orgId,
          }).log({
            action: "startup_os.chat.completed",
            outcome: "success",
            resource: {
              type: "startup_os_project_chat",
              id: `${saved.project.id}:${CHAT_RUN_ID}`,
              name: companyName(saved.project.companyContext),
            },
            severity: "info",
            metadata: {
              projectId: saved.project.id,
              rolloutThreadId: rollout.threadId,
              summary: result.summary,
            },
          });
          if (pendingDone) enqueue(eventFrame(pendingDone));
        } else {
          await auditLogger(request, {
            actor: { id: userId, type: "user" },
            tenantId: orgId,
          }).log({
            action: "startup_os.chat.failed",
            outcome: "failure",
            resource: {
              type: "startup_os_project_chat",
              id: `${result.project.id}:${CHAT_RUN_ID}`,
              name: companyName(result.project.companyContext),
            },
            severity: "warning",
            metadata: {
              projectId: result.project.id,
              status: "failed",
            },
          });
        }

        enqueue(endFrame());
        controller.close();
      } catch (error) {
        const message = error instanceof Error ? error.message : "Startup OS conversation failed.";
        logger.error("[startup-os.chat.POST] Conversation turn failed after stream open", {
          organizationId: orgId,
          userId: auth.userId,
          projectId: decodedProjectId,
          error: message,
        });
        enqueue(
          eventFrame({
            type: "error",
            message,
            occurredAt: new Date().toISOString(),
          }),
        );
        enqueue(endFrame());
        controller.close();
      }
    },
  });

  return new Response(stream, {
    status: 200,
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}
