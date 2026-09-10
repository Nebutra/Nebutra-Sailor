/**
 * Submitting a PARA generation job to the ECS origin task envelope.
 *
 * Extracted so the HTTP route and the agent's `generate_image` tool submit through one path.
 * Callers hold a tenant context, not a Hono context — the agent runner has no request.
 */

import { env } from "../config/env.js";
import {
  type AuthenticatedAiOriginHeaderInput,
  buildAuthenticatedAiOriginHeaders,
} from "../routes/ai/origin-headers.js";
import { aiServiceBreaker } from "../services/circuitBreaker.js";

export interface ParaGeneratorInput {
  mode: "image" | "video" | "text" | "audio";
  model?: string;
  prompt?: string;
  params?: Record<string, unknown>;
  references?: Array<{ kind: "asset" | "subject" | "node"; id: string; url?: string }>;
  count?: 1 | 2 | 4;
}

export interface SubmitJobInput {
  workspaceId: string;
  nodeId: string;
  generator: ParaGeneratorInput;
  idempotencyKey?: string;
}

/** The origin refused before admitting a task: no job exists, and none should be shown. */
export class OriginRejectedError extends Error {
  constructor(
    public readonly status: number,
    message: string,
  ) {
    super(message);
    this.name = "OriginRejectedError";
  }
}

export function paraOriginUrl(path: string): string {
  if (!env.AI_SERVICE_URL) throw new Error("AI_SERVICE_URL is required to run PARA jobs");
  return `${env.AI_SERVICE_URL.replace(/\/$/, "")}${path}`;
}

export async function paraOriginFetch(
  context: AuthenticatedAiOriginHeaderInput,
  path: string,
  method: string,
  body?: unknown,
): Promise<Response> {
  const headers = await buildAuthenticatedAiOriginHeaders(context);
  return aiServiceBreaker.call(() =>
    fetch(paraOriginUrl(path), {
      method,
      headers,
      ...(body === undefined ? {} : { body: JSON.stringify(body) }),
      signal: AbortSignal.timeout(120_000),
    }),
  );
}

/**
 * Create a `para.generate` task. Returns the raw origin envelope; the caller maps it (routes use
 * `taskToJob`). Throws OriginRejectedError when the origin refuses — that is a pre-admission
 * rejection, not a failed job.
 */
export async function submitParaGenerateJob(
  context: AuthenticatedAiOriginHeaderInput,
  input: SubmitJobInput,
): Promise<Record<string, unknown>> {
  const upstream = await paraOriginFetch(context, "/api/v1/tasks/", "POST", {
    type: "para.generate",
    queue: "ai",
    priority: "normal",
    payload: {
      workspaceId: input.workspaceId,
      nodeId: input.nodeId,
      generator: input.generator,
    },
    metadata: { product: "para", workspaceId: input.workspaceId, nodeId: input.nodeId },
    ...(input.idempotencyKey ? { idempotency_key: input.idempotencyKey } : {}),
  });
  if (!upstream.ok) {
    const detail = await upstream.text().catch(() => "");
    throw new OriginRejectedError(
      upstream.status,
      detail || `origin rejected the job (${upstream.status})`,
    );
  }
  return (await upstream.json()) as Record<string, unknown>;
}
