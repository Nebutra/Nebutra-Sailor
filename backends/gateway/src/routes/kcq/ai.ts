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
 * Billing (owner decision 2026-10-09): customer calls are paid from the KCQ
 * product wallet (`product = "kcq"`, ADR 2026-09-27) of the workspace the client
 * names in `X-KCQ-Workspace` (default `personal`; an organization needs live
 * membership), resolved exactly as the BYOK/market routes resolve it. The price
 * is the served model's published shelf rate, reserved before forwarding and
 * settled from the upstream's usage after; see `ai-billing.ts`. Staff calls
 * ride Router's INTERNAL source and are never billed. Every request still
 * writes a structured `kcq.ai.usage` log line (`billed: true | false`).
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
import {
  defaultKcqAiBilling,
  defaultKcqWallet,
  estimatePromptTokens,
  KCQ_WALLET_PRODUCT,
  type KcqAiBilling,
  type KcqUsage,
  type KcqWalletReader,
  quoteKcqRequest,
  settleKcqRequest,
} from "./ai-billing.js";
import { resolveWorkspaceTenant } from "./scope.js";
import { MarketSourceError } from "./twelve-data.js";

const log = logger.child({ service: "kcq-ai" });

/** The offer that funds the KCQ wallet (ops/nebutra/offers.json). */
export const KCQ_TOPUP_OFFER_ID = "kcq_topup";
const WALLET_USAGE_ROWS = 8;

export const KCQ_AI_STAFF_MODEL_DEFAULT = "deepseek/deepseek-v4.1-flash";

export interface KcqAiIdentity {
  /** Canonical `users.id` — what staff grants, tenants and wallets are keyed by. */
  userId: string;
  /** The auth center's own id; only for Better Auth's tables (org membership). */
  authUserId?: string;
  /** Present only for an unrevoked PlatformStaff grant. */
  staffRole: PlatformStaffRole | null;
  email?: string | null;
}

export interface KcqAiOptions {
  resolveIdentity?: (request: Request) => Promise<KcqAiIdentity | null>;
  /** Returns true when the caller is over the limit. */
  rateLimited?: (userId: string) => boolean;
  fetchImpl?: typeof fetch;
  signToken?: (claims: { userId: string; role?: string }) => Promise<string>;
  /** The money seam (reserve / settle / release). Defaults to the Router's repository. */
  billing?: KcqAiBilling;
  /** The tenant whose KCQ wallet pays for this customer call. */
  resolveWalletTenant?: (request: Request, identity: KcqAiIdentity) => Promise<string>;
  /** Balance and recent usage of the KCQ wallet (read-only). */
  wallet?: KcqWalletReader;
}

/** Same workspace rule as the market routes; the AI surface defaults to the personal workspace. */
export async function resolveKcqWalletTenant(
  request: Request,
  identity: KcqAiIdentity,
): Promise<string> {
  const workspace = request.headers.get("X-KCQ-Workspace") || "personal";
  if (workspace.length > 160) throw new MarketSourceError(400, "请指定当前工作区。");
  const scope = await resolveWorkspaceTenant({
    userId: identity.userId,
    authUserId: identity.authUserId,
    email: identity.email ?? null,
    workspace,
  });
  return scope.tenantId;
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
  // `session.userId` is the canonical users id (the auth provider resolves the
  // auth-center subject through user_identity_links), so the grant lookup and
  // the wallet tenant agree with every other app table for the same person.
  // AUDIT(no-tenant): platform staff standing is platform-scope, never tenant data.
  const grant = await getSystemDb().platformStaff.findUnique({
    where: { userId: session.userId },
    select: { role: true, revokedAt: true },
  });
  const staffRole =
    grant && grant.revokedAt === null ? normalizePlatformStaffRole(grant.role) : null;
  return {
    userId: session.userId,
    ...(session.authUserId ? { authUserId: session.authUserId } : {}),
    staffRole,
    ...(session.email ? { email: session.email } : {}),
  };
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

/** An OpenAI-compatible chat completion, as the Router returns it. */
const chatCompletion = z
  .object({
    id: z.string().optional(),
    object: z.string().optional(),
    model: z.string().optional(),
    choices: z.array(z.record(z.string(), z.unknown())).optional(),
    usage: z.record(z.string(), z.unknown()).optional(),
  })
  .catchall(z.unknown())
  .openapi("KcqChatCompletion");

function openAiError(message: string, code: string, status: number) {
  return { body: { error: { message, type: "invalid_request_error", code } }, status };
}

export function createKcqAiRoutes(options: KcqAiOptions = {}) {
  const app = new OpenAPIHono<{ Variables: { identity: KcqAiIdentity } }>();
  const resolveIdentity = options.resolveIdentity ?? resolveKcqAiIdentity;
  const rateLimited =
    options.rateLimited ?? createUserRateLimiter(intFromEnv("KCQ_AI_RATE_PER_MINUTE", 20));
  const doFetch = options.fetchImpl ?? fetch;
  const billing = () => options.billing ?? defaultKcqAiBilling();
  const resolveWalletTenant = options.resolveWalletTenant ?? resolveKcqWalletTenant;
  const walletReader = () => options.wallet ?? defaultKcqWallet();
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

  /**
   * The KCQ wallet of the workspace named in `X-KCQ-Workspace`, resolved and
   * membership-checked exactly like the billed calls. Staff ride the internal
   * source and have no balance to show: they are told so instead.
   */
  app.get("/v1/wallet", async (c) => {
    const identity = c.get("identity");
    if (identity.staffRole) return c.json({ internal: true, billed: false });
    let tenantId: string;
    try {
      tenantId = await resolveWalletTenant(c.req.raw, identity);
    } catch (error) {
      if (error instanceof MarketSourceError) {
        const status = error.status === 403 ? 403 : 400;
        return c.json(openAiError(error.message, "workspace_unavailable", status).body, status);
      }
      throw error;
    }
    const reader = walletReader();
    const [wallet, usage] = await Promise.all([
      reader.balance(tenantId),
      reader.recent(tenantId, WALLET_USAGE_ROWS),
    ]);
    return c.json({
      internal: false,
      billed: true,
      balance: wallet.balance,
      currency: wallet.currency,
      offerId: KCQ_TOPUP_OFFER_ID,
      usage,
    });
  });

  app.openapi(
    createRoute({
      method: "post",
      path: "/v1/chat/completions",
      tags: ["KCQ"],
      summary: "Managed KCQ AI chat completions via Router",
      request: { body: { required: true, content: { "application/json": { schema: chatBody } } } },
      responses: {
        200: {
          description: "OpenAI-compatible completion (JSON) or SSE stream when `stream: true`",
          content: {
            // The Router's completion body is passed through as-is, so its
            // shape is the upstream's: an open object, not a pinned schema.
            "application/json": { schema: chatCompletion },
            "text/event-stream": { schema: z.string() },
          },
        },
      },
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

      // Customers pay from their KCQ wallet; staff ride the internal source unbilled.
      const customer = !identity.staffRole;
      const clientKey = c.req.header("Idempotency-Key") ?? c.req.header("X-Request-Id") ?? null;
      const validKey = clientKey && /^[A-Za-z0-9_-]{8,100}$/.test(clientKey) ? clientKey : null;
      const requestKey = validKey ?? crypto.randomUUID();
      let hold: {
        tenantId: string;
        requestId: string;
        idempotencyKey: string;
        reserved: number;
        priceRow: Parameters<typeof settleKcqRequest>[1]["priceRow"];
      } | null = null;

      const started = Date.now();
      const tier = identity.staffRole ? "staff" : "public";
      const record = (usage: UsageResult | null, status: string, costUsd: number | null = null) =>
        log.info("kcq.ai.usage", {
          userId: identity.userId,
          tier,
          model,
          status,
          promptTokens: usage?.promptTokens ?? null,
          completionTokens: usage?.completionTokens ?? null,
          totalTokens: usage?.totalTokens ?? null,
          latencyMs: Date.now() - started,
          billed: costUsd !== null,
          ...(hold ? { tenantId: hold.tenantId, costUsd, reserved: hold.reserved } : {}),
        });

      if (customer) {
        let tenantId: string;
        try {
          tenantId = await resolveWalletTenant(c.req.raw, identity);
        } catch (error) {
          if (error instanceof MarketSourceError) {
            const status = error.status === 403 ? 403 : 400;
            return c.json(openAiError(error.message, "workspace_unavailable", status).body, status);
          }
          throw error;
        }
        const money = billing();
        const quote = await quoteKcqRequest(money, model, {
          promptTokens: estimatePromptTokens(upstreamBody),
          maxOutputTokens: clamped,
        });
        if (!quote.ok) {
          log.error("kcq.ai.unpriced_model", { model });
          return c.json(openAiError("当前模型暂未开放计费。", "model_unpriced", 503).body, 503);
        }
        const idempotencyKey = `kcq:${requestKey}`;
        if (validKey && (await money.isSettled(tenantId, idempotencyKey))) {
          return c.json(
            openAiError("该请求已处理，未重复扣费。", "duplicate_request", 409).body,
            409,
          );
        }
        const requestId = `kcq_${tenantId}_${requestKey}`;
        const held = await money.reserve({
          tenantId,
          requestId,
          amount: quote.reserve,
          product: KCQ_WALLET_PRODUCT,
        });
        if (!held) {
          record(null, "insufficient_balance");
          return c.json(
            openAiError("KCQ 余额不足，请充值后继续使用 AI。", "insufficient_balance", 402).body,
            402,
          );
        }
        hold = {
          tenantId,
          requestId,
          idempotencyKey,
          reserved: quote.reserve,
          priceRow: quote.priceRow,
        };
      }

      /** Hand the whole hold back; the customer is never charged for a failure. */
      const release = async () => {
        if (!hold) return;
        const h = hold;
        await billing()
          .release({
            tenantId: h.tenantId,
            requestId: h.requestId,
            amount: h.reserved,
            product: KCQ_WALLET_PRODUCT,
          })
          .catch((error: unknown) =>
            log.error("kcq.ai.release_failed", {
              requestId: h.requestId,
              category: error instanceof Error ? error.name : "unknown",
            }),
          );
      };
      /** Charge the actual cost. A settle failure is logged, never shown: the sweep returns the hold. */
      const settle = async (usage: UsageResult | null): Promise<number | null> => {
        if (!hold) return null;
        const h = hold;
        const counts: KcqUsage | null = usage
          ? { promptTokens: usage.promptTokens, completionTokens: usage.completionTokens }
          : null;
        try {
          const done = await settleKcqRequest(billing(), {
            tenantId: h.tenantId,
            userId: identity.userId,
            requestId: h.requestId,
            idempotencyKey: h.idempotencyKey,
            model,
            reserved: h.reserved,
            priceRow: h.priceRow,
            usage: counts,
            latencyMs: Date.now() - started,
            clientRequestId: validKey,
          });
          return done.charged;
        } catch (error) {
          log.error("kcq.ai.settle_failed", {
            requestId: h.requestId,
            category: error instanceof Error ? error.name : "unknown",
          });
          return null;
        }
      };

      let upstream: Response;
      try {
        upstream = await doFetch(`${routerInternalUrl()}/api/internal/v1/chat/completions`, {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
          body: JSON.stringify(upstreamBody),
          signal: AbortSignal.timeout(180_000),
        });
      } catch {
        await release();
        record(null, "unreachable");
        return c.json(openAiError("AI 服务暂时不可用。", "upstream_unreachable", 502).body, 502);
      }

      if (!upstream.ok) {
        await release();
        record(null, `upstream_${upstream.status}`);
        // Router's body can name sources and models; the browser gets a generic envelope.
        const status = upstream.status === 429 ? 429 : upstream.status === 404 ? 404 : 502;
        const message = status === 404 ? "当前模型不可用。" : "AI 服务暂时不可用。";
        return c.json(openAiError(message, "upstream_error", status).body, status);
      }

      if (!rest.stream) {
        const json: unknown = await upstream.json().catch(() => null);
        if (json === null) {
          await release();
          record(null, "invalid_body");
          return c.json(openAiError("AI 服务暂时不可用。", "upstream_error", 502).body, 502);
        }
        const usage = extractUsageFromJson(json, model);
        record(usage, "success", await settle(usage));
        return c.json((json ?? {}) as Record<string, unknown>);
      }

      const body = upstream.body;
      if (!body) {
        await release();
        record(null, "empty_stream");
        return c.json(openAiError("AI 服务暂时不可用。", "upstream_error", 502).body, 502);
      }
      const extractor = createStreamingUsageExtractor(model);
      const decoder = new TextDecoder();
      const reader = body.getReader();
      let closed = false;
      // Settle exactly once, however the stream ends: normal end, upstream error,
      // or the client walking away mid-stream (the upstream billed us regardless).
      const finish = async (status: string) => {
        if (closed) return;
        closed = true;
        const usage = extractor.getUsage();
        record(usage, status, await settle(usage));
      };
      const tapped = new ReadableStream<Uint8Array>({
        async pull(controller) {
          try {
            const { done, value } = await reader.read();
            if (done) {
              await finish("success");
              controller.close();
              return;
            }
            controller.enqueue(value);
            extractor.processChunk(decoder.decode(value, { stream: true }));
          } catch (error) {
            await finish("stream_error");
            controller.error(error);
          }
        },
        async cancel(reason) {
          await reader.cancel(reason).catch(() => undefined);
          await finish("client_cancelled");
        },
      });
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
