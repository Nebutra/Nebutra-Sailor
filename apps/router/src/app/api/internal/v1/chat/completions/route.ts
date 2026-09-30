import { z } from "zod";
import { resolveNewApiModel, verifyInternalServiceCaller } from "@/lib/internal-service";
import { proxyOpenAiCompatible, RouterSupplyUnavailableError } from "@/lib/openai-edge";

export const runtime = "nodejs";
export const maxDuration = 180;

/**
 * POST /api/internal/v1/chat/completions — machine-only, service-token
 * authenticated OpenAI-compatible chat completions.
 *
 * This is the "AI-native" path from ADR 2026-09-24 (Sailor convergence):
 * another Nebutra service (the gateway's docs assistant, its paid AI gateway
 * upstream fallback) reaches New-API through Router with a service token it
 * mints itself, never a hand-issued static key. Router forwards to New-API
 * with its own `NEW_API_ACCESS_TOKEN` / `NEW_API_BASE_URL` — the credential
 * never leaves this process — and never touches the money spine
 * (`createRouterGuard` / rate limiter): this is Nebutra's own infrastructure
 * cost, not billable customer usage, so `proxyOpenAiCompatible` is called
 * with no `guard`, no `rateLimit` and no `resolveKey` ("relay-only mode").
 *
 * Only `chat/completions` is exposed (not the full `/v1/[...path]` surface):
 * every current caller is a chat-completions request, and narrowing the
 * surface here rather than opening the whole OpenAI-compatible path keeps
 * this endpoint's blast radius to exactly what is used.
 */

const InternalChatBodySchema = z
  .object({
    model: z.string().trim().min(1).max(256),
  })
  .catchall(z.unknown());

function unauthenticated(): Response {
  return Response.json(
    {
      error: {
        message: "Missing or invalid service token.",
        type: "invalid_request_error",
        code: "unauthenticated",
      },
    },
    { status: 401 },
  );
}

function badRequest(message: string): Response {
  return Response.json(
    { error: { message, type: "invalid_request_error", code: "bad_request" } },
    { status: 400 },
  );
}

function unavailable(message: string): Response {
  return Response.json(
    { error: { message, type: "server_error", code: "router_unconfigured" } },
    { status: 503 },
  );
}

export async function POST(request: Request): Promise<Response> {
  if (!(await verifyInternalServiceCaller(request))) {
    return unauthenticated();
  }

  let raw: unknown;
  try {
    raw = await request.json();
  } catch {
    return badRequest("Body must be JSON.");
  }

  const parsed = InternalChatBodySchema.safeParse(raw);
  if (!parsed.success) {
    return badRequest(parsed.error.issues[0]?.message ?? "Malformed request body.");
  }

  const upstreamToken = process.env.NEW_API_ACCESS_TOKEN || process.env.NEBUTRA_NEW_API_TOKEN;
  if (!upstreamToken) {
    return unavailable("Router supply is not configured.");
  }

  const { model, ...rest } = parsed.data;
  const upstreamRequest = new Request("https://router.internal/api/internal/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${upstreamToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ ...rest, model: resolveNewApiModel(model) }),
  });

  try {
    return await proxyOpenAiCompatible(upstreamRequest, ["chat", "completions"]);
  } catch (error) {
    if (error instanceof RouterSupplyUnavailableError) {
      return unavailable("Router supply is not configured.");
    }
    return Response.json(
      {
        error: {
          message: error instanceof Error ? error.message : "upstream_failed",
          type: "server_error",
          code: "upstream_failed",
        },
      },
      { status: 503 },
    );
  }
}
