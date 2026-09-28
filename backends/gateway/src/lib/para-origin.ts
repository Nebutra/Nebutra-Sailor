/**
 * Submitting a PARA generation job to the ECS origin task envelope.
 *
 * Extracted so the HTTP route and the agent's `generate_image` tool submit through one path.
 * Callers hold a tenant context, not a Hono context — the agent runner has no request.
 */

import { randomUUID } from "node:crypto";
import { env } from "../config/env.js";
import {
  type AuthenticatedAiOriginHeaderInput,
  buildAuthenticatedAiOriginHeaders,
} from "../routes/ai/origin-headers.js";
import { aiServiceBreaker } from "../services/circuitBreaker.js";
import {
  chargeOf,
  chargeParaJob,
  type ParaCharge,
  paraJobCost,
  refundParaJob,
} from "./para-credits.js";

export interface ParaGeneratorInput {
  mode: "image" | "video" | "text" | "audio";
  model?: string | undefined;
  prompt?: string | undefined;
  params?: Record<string, unknown> | undefined;
  references?:
    | Array<{ kind: "asset" | "subject" | "node"; id: string; url?: string | undefined }>
    | undefined;
  count?: 1 | 2 | 4 | undefined;
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
 * rejection, not a failed job — and the billing error when the para wallet cannot pay.
 *
 * The one path every generation takes, the HTTP route and the agent's tool alike, so it is also
 * the one place credits are taken. The charge rides on the task's metadata; a reader that later
 * sees the task fail refunds it from there (`para-credits.ts`).
 */
export async function submitParaGenerateJob(
  context: AuthenticatedAiOriginHeaderInput,
  input: SubmitJobInput,
): Promise<Record<string, unknown>> {
  // A fresh key per attempt, never the client's idempotency key: a key reused after a rejected
  // (and refunded) attempt would read as already paid and the retry would run free.
  const charge: ParaCharge = { key: randomUUID(), credits: paraJobCost(input.generator) };
  await chargeParaJob(context.tenantId, charge);

  let upstream: Response;
  try {
    upstream = await paraOriginFetch(context, "/api/v1/tasks/", "POST", {
      type: "para.generate",
      queue: "ai",
      priority: "normal",
      payload: {
        workspaceId: input.workspaceId,
        nodeId: input.nodeId,
        generator: input.generator,
      },
      metadata: {
        product: "para",
        workspaceId: input.workspaceId,
        nodeId: input.nodeId,
        charge,
      },
      ...(input.idempotencyKey ? { idempotency_key: input.idempotencyKey } : {}),
    });
  } catch (error) {
    await refundParaJob(context.tenantId, charge);
    throw error;
  }
  if (!upstream.ok) {
    await refundParaJob(context.tenantId, charge);
    const detail = await upstream.text().catch(() => "");
    throw new OriginRejectedError(
      upstream.status,
      detail || `origin rejected the job (${upstream.status})`,
    );
  }
  const task = (await upstream.json()) as Record<string, unknown>;
  // An idempotent replay returns the task an earlier attempt created and paid for; this
  // attempt's charge is then a second payment for the same work.
  if (chargeOf(task)?.key !== charge.key) await refundParaJob(context.tenantId, charge);
  return task;
}
