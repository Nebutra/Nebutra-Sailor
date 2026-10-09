/**
 * KCQ managed AI: an OpenAI-compatible surface (`/models`, `/chat/completions`)
 * the KCQ Agent can use as its provider, backed by the platform Router.
 *
 * Owner decision 2026-10-09: KCQ requires sign-in, and its AI defaults go
 * through Router.
 *  - Platform staff (an unrevoked `PlatformStaff` row for the verified
 *    session user) are routed to the Command Code INTERNAL source with
 *    `deepseek/deepseek-v4.1-flash`.
 *  - Every other signed-in user is routed over Router's PUBLIC supply with
 *    `gpt-5.6-luna` (DEFAULT_PUBLIC_MODEL).
 *
 * Staff is decided here, server-side, from the session user id against the
 * database. Nothing the browser sends (headers, body, `model`) can set it. The
 * result is carried to Router as a claim inside an HS256 service token only this
 * deployment and Router can sign, and Router independently refuses INTERNAL
 * sources to any token without it (apps/router internalRouteFor).
 *
 * Billing gap (stated, not hidden): Router's money edge (reserve/settle against
 * a product wallet) is keyed to API-key identities on the public relay, not to
 * this service-token relay, which is deliberately unbilled infrastructure. Usage
 * is recorded as a structured `kcq.ai.usage` log line per request (user, tier,
 * model, tokens) so it can be reconciled, but customer calls are not yet
 * debited from a KCQ product wallet.
 */
import { createRoute, OpenAPIHono, z } from "@hono/zod-openapi";
import { signServiceToken } from "@nebutra/auth";
import { createAuth } from "@nebutra/auth/server";
import { getSystemDb } from "@nebutra/db";
import {
  createStreamingUsageExtractor,
  extractUsageFromJson,
  type UsageResult,
} from "@nebutra/gateway-core";
import { logger } from "@nebutra/logger";
import { normalizePlatformStaffRole, type PlatformStaffRole } from "@nebutra/permissions";
import { DEFAULT_PUBLIC_MODEL } from "@nebutra/router-supply";
import { bodyLimit } from "hono/body-limit";
import { routerInternalUrl } from "../ai/gateway.js";

const log = logger.child({ service: "kcq-ai" });

export const KCQ_AI_STAFF_MODEL_DEFAULT = "deepseek/deepseek-v4.1-flash";

export interface KcqAiIdentity {
  userId: string;
  /** Present only for an unrevoked PlatformStaff grant. */
  staffRole: PlatformStaffRole | null;
}

export interface KcqAiOptions {
  resolveIdentity?: (request: Request) => Promise<KcqAiIdentity | null>;
  /** Returns true when the caller is over the limit. */
  rateLimited?: (userId: string) => boolean;
  fetchImpl?: typeof fetch;
  signToken?: (claims: { userId: string; role?: string }) => Promise<string>;
}

function staffModel(): string {
  return process.env.KCQ_AI_STAFF_MODEL?.trim() || KCQ_AI_STAFF_MODEL_DEFAULT;
}
function publicModel(): string {
  return process.env.KCQ_AI_PUBLIC_MODEL?.trim() || DEFAULT_PUBLIC_MODEL;
}
function intFromEnv(name: string, fallback: number): number {
  const parsed = Number.parseInt(process.env[name] ?? "", 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

/** The model this identity is served with; the client's `model` never decides it. */
export function modelFor(identity: KcqAiIdentity): string {
  return identity.staffRole ? staffModel() : publicModel();
}

export async function resolveKcqAiIdentity(request: Request): Promise<KcqAiIdentity | null> {
  const auth = await createAuth({ provider: "better-auth" });
  const session = await auth.getSession(request);
  if (!session?.userId || session.expiresAt.getTime() <= Date.now()) return null;
  // AUDIT(no-tenant): platform staff standing is platform-scope, never tenant data.
  const grant = await getSystemDb().platformStaff.findUnique({
    where: { userId: session.userId },
    select: { role: true, revokedAt: true },
  });
  const staffRole =
    grant && grant.revokedAt === null ? normalizePlatformStaffRole(grant.role) : null;
  return { userId: session.userId, staffRole };
}

/** Fixed-window per-user limiter; one process is enough for a per-user cost guard. */
export function createUserRateLimiter(maxPerMinute: number) {
  const windows = new Map<string, { count: number; resetAt: number }>();
  return (userId: string): boolean => {
    const now = Date.now();
    let record = windows.get(userId);
    if (!record || now > record.resetAt) {
      record = { count: 0, resetAt: now + 60_000 };
      windows.set(userId, record);
      if (windows.size > 10_000) {
        for (const [key, value] of windows) if (now > value.resetAt) windows.delete(key);
      }
    }
    record.count += 1;
    return record.count > maxPerMinute;
  };
}

const chatBody = z
  .object({
    model: z.string().max(256).optional(),
    messages: z.array(z.record(z.string(), z.unknown())).min(1).max(500),
    stream: z.boolean().optional(),
  })
  .catchall(z.unknown());

function openAiError(message: string, code: string, status: number) {
  return { body: { error: { message, type: "invalid_request_error", code } }, status };
}

export function createKcqAiRoutes(options: KcqAiOptions = {}) {
  const app = new OpenAPIHono<{ Variables: { identity: KcqAiIdentity } }>();
  const resolveIdentity = options.resolveIdentity ?? resolveKcqAiIdentity;
  const rateLimited =
    options.rateLimited ?? createUserRateLimiter(intFromEnv("KCQ_AI_RATE_PER_MINUTE", 20));
  const doFetch = options.fetchImpl ?? fetch;
  const signToken =
    options.signToken ?? ((claims: { userId: string; role?: string }) => signServiceToken(claims));

  app.use("*", bodyLimit({ maxSize: intFromEnv("KCQ_AI_MAX_BODY_BYTES", 1_000_000) }));
  app.use("*", async (c, next) => {
    c.header("Cache-Control", "private, no-store");
    const identity = await resolveIdentity(c.req.raw);
    if (!identity) {
      const e = openAiError("请先登录。", "unauthenticated", 401);
      return c.json(e.body, 401);
    }
    if (c.req.method !== "GET") {
      const allowed = new Set<string>();
      if (process.env.KCQ_PUBLIC_ORIGIN) allowed.add(process.env.KCQ_PUBLIC_ORIGIN);
      if (process.env.NODE_ENV !== "production") allowed.add("http://localhost:3130");
      if (!allowed.has(c.req.header("Origin") ?? "")) {
        return c.json(openAiError("请求来源无效。", "bad_origin", 403).body, 403);
      }
    }
    c.set("identity", identity);
    await next();
  });

  app.get("/v1/models", (c) => {
    const identity = c.get("identity");
    return c.json({
      object: "list",
      data: [{ id: modelFor(identity), object: "model", owned_by: "nebutra" }],
    });
  });

  app.openapi(
    createRoute({
      method: "post",
      path: "/v1/chat/completions",
      tags: ["KCQ"],
      summary: "Managed KCQ AI chat completions via Router",
      request: { body: { required: true, content: { "application/json": { schema: chatBody } } } },
      responses: { 200: { description: "OpenAI-compatible completion or SSE stream" } },
    }),
    async (c) => {
      const identity = c.get("identity");
      if (rateLimited(identity.userId)) {
        c.header("Retry-After", "60");
        return c.json(openAiError("请求过于频繁，请稍后再试。", "rate_limited", 429).body, 429);
      }
      const { model: _ignored, ...rest } = c.req.valid("json");
      const model = modelFor(identity);
      const maxOutput = intFromEnv("KCQ_AI_MAX_OUTPUT_TOKENS", 8192);
      const requestedMax = Number(rest.max_tokens ?? rest.max_completion_tokens ?? maxOutput);
      const clamped = Math.min(Number.isFinite(requestedMax) ? requestedMax : maxOutput, maxOutput);
      const upstreamBody: Record<string, unknown> = { ...rest, model, max_tokens: clamped };
      delete upstreamBody.max_completion_tokens;
      if (rest.stream) {
        upstreamBody.stream_options = {
          ...(typeof rest.stream_options === "object" && rest.stream_options
            ? (rest.stream_options as Record<string, unknown>)
            : {}),
          include_usage: true,
        };
      }

      let token: string;
      try {
        token = await signToken({
          userId: identity.userId,
          ...(identity.staffRole ? { role: identity.staffRole } : {}),
        });
      } catch {
        return c.json(openAiError("AI 服务暂未配置。", "not_configured", 503).body, 503);
      }

      const started = Date.now();
      const tier = identity.staffRole ? "staff" : "public";
      const record = (usage: UsageResult | null, status: string) =>
        log.info("kcq.ai.usage", {
          userId: identity.userId,
          tier,
          model,
          status,
          promptTokens: usage?.promptTokens ?? null,
          completionTokens: usage?.completionTokens ?? null,
          totalTokens: usage?.totalTokens ?? null,
          latencyMs: Date.now() - started,
          billed: false,
        });

      let upstream: Response;
      try {
        upstream = await doFetch(`${routerInternalUrl()}/api/internal/v1/chat/completions`, {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
          body: JSON.stringify(upstreamBody),
          signal: AbortSignal.timeout(180_000),
        });
      } catch {
        record(null, "unreachable");
        return c.json(openAiError("AI 服务暂时不可用。", "upstream_unreachable", 502).body, 502);
      }

      if (!upstream.ok) {
        record(null, `upstream_${upstream.status}`);
        // Router's body can name sources and models; the browser gets a generic envelope.
        const status = upstream.status === 429 ? 429 : upstream.status === 404 ? 404 : 502;
        const message = status === 404 ? "当前模型不可用。" : "AI 服务暂时不可用。";
        return c.json(openAiError(message, "upstream_error", status).body, status);
      }

      if (!rest.stream) {
        const json: unknown = await upstream.json().catch(() => null);
        record(extractUsageFromJson(json, model), "success");
        return c.json((json ?? {}) as Record<string, unknown>);
      }

      const body = upstream.body;
      if (!body) {
        record(null, "empty_stream");
        return c.json(openAiError("AI 服务暂时不可用。", "upstream_error", 502).body, 502);
      }
      const extractor = createStreamingUsageExtractor(model);
      const decoder = new TextDecoder();
      const tapped = body.pipeThrough(
        new TransformStream<Uint8Array, Uint8Array>({
          transform(chunk, controller) {
            controller.enqueue(chunk);
            extractor.processChunk(decoder.decode(chunk, { stream: true }));
          },
          flush() {
            record(extractor.getUsage(), "success");
          },
        }),
      );
      return new Response(tapped, {
        status: 200,
        headers: {
          "Content-Type": "text/event-stream; charset=utf-8",
          "Cache-Control": "private, no-store",
        },
      });
    },
  );

  app.onError((error, c) => {
    if (error instanceof Error && error.name === "BodyLimitError") {
      return c.json(openAiError("请求过大。", "payload_too_large", 413).body, 413);
    }
    log.error("kcq ai request failed", { category: error.name });
    return c.json(openAiError("AI 服务暂时不可用。", "server_error", 500).body, 500);
  });
  return app;
}

export const kcqAiRoutes = createKcqAiRoutes();
