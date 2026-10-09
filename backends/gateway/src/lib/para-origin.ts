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
import { assertReferenceUrls } from "./para-assets.js";
import {
  chargeOf,
  chargeParaJob,
  ModelUnavailableError,
  type ParaCharge,
  paraJobCost,
  refundParaJob,
  videoQuoteFor,
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

/**
 * `timeoutMs` bounds the whole exchange, body included. The default suits request/response
 * calls; a stream (the job events SSE) passes a longer one, or a multi-minute video job's stream
 * would be cut at two minutes.
 */
export async function paraOriginFetch(
  context: AuthenticatedAiOriginHeaderInput,
  path: string,
  method: string,
  body?: unknown,
  options: { timeoutMs?: number } = {},
): Promise<Response> {
  const headers = await buildAuthenticatedAiOriginHeaders(context);
  return aiServiceBreaker.call(() =>
    fetch(paraOriginUrl(path), {
      method,
      headers,
      ...(body === undefined ? {} : { body: JSON.stringify(body) }),
      signal: AbortSignal.timeout(options.timeoutMs ?? 120_000),
    }),
  );
}

/**
 * Pin a video generator to what will be charged: the concrete model "Auto" resolves to, and the
 * duration and resolution snapped to what that model accepts. The origin then runs exactly the
 * clip that was paid for. Throws ModelUnavailableError for a planned or unknown model.
 */
export function pinVideoGenerator(generator: ParaGeneratorInput): ParaGeneratorInput {
  if (generator.mode !== "video") return generator;
  const quote = videoQuoteFor(generator);
  if (!quote) throw new ModelUnavailableError(generator.model);
  return {
    ...generator,
    model: quote.model.id,
    params: {
      ...(generator.params ?? {}),
      duration: quote.durationSeconds,
      resolution: quote.resolution,
    },
  };
}

/**
 * Create a `para.generate` task. Returns the raw origin envelope; the caller maps it (routes use
 * `taskToJob`). Throws OriginRejectedError when the origin refuses — that is a pre-admission
 * rejection, not a failed job — the billing error when the para wallet cannot pay, and, before
 * any charge, ReferenceUrlError / ModelUnavailableError for a request that cannot run.
 *
 * The one path every generation takes, the HTTP route and the agent's tool alike, so it is also
 * the one place credits are taken. The charge rides on the task's metadata; a reader that later
 * sees the task fail refunds it from there (`para-credits.ts`).
 */
export async function submitParaGenerateJob(
  context: AuthenticatedAiOriginHeaderInput,
  input: SubmitJobInput,
): Promise<Record<string, unknown>> {
  // Refusals that must happen before any credit moves: a reference URL outside PARA's asset
  // hosts, and a video model that cannot run.
  assertReferenceUrls(input.generator.references);
  const generator = pinVideoGenerator(input.generator);

  // A fresh key per attempt, never the client's idempotency key: a key reused after a rejected
  // (and refunded) attempt would read as already paid and the retry would run free.
  const charge: ParaCharge = { key: randomUUID(), credits: paraJobCost(generator) };
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
        generator,
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
