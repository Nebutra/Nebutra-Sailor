/**
 * POST /api/v1/docs/chat — public, unauthenticated docs assistant.
 *
 * Restores the AI chat feature dropped from apps/sailor-docs when it moved
 * to a pure static export (commit dd792c5aa) — the old `src/app/api/chat/
 * route.ts` was a Next Edge Route Handler, which `output: "export"` cannot
 * build. Business endpoints live in the gateway (CLAUDE.md,
 * scripts/lint-route-handlers.mjs), so this replaces it there instead of
 * bringing back a docs server.
 *
 * Model provider: Nebutra Router (New-API, fronting upstream supplier keys
 * and reverse-proxied accounts) — the same upstream set the gateway's own
 * `/api/v1/ai/gateway` route already uses (`defaultEnvUpstreams()` in
 * ../ai/gateway.ts: `nebutra-router` first when `SERVICE_SECRET` is set —
 * Router's own internal endpoint, zero new secrets — then the hand-configured
 * env upstreams as fallbacks: `newapi`, sub2api, openai-env, ...).
 * This intentionally does NOT go through `@nebutra/agents`' `runWithFallback`
 * with third-party keys (OPENROUTER_API_KEY etc.) — that path bypasses the
 * Router and bills provider keys directly, which is what ADR
 * 2026-09-24 (Sailor convergence) removed. `fetchUpstreamWithFallback` is the
 * exact upstream-selection/retry code path `createAiGatewayRoutes` uses,
 * shared rather than duplicated.
 *
 * Answers with `{ configured: false }` (200, not an error status — this is
 * an expected, documented state, not a failure) when no Router upstream is
 * configured, so the docs UI can hide/disable the chat entry point instead
 * of showing a broken control.
 */
import { createRoute, OpenAPIHono, z } from "@hono/zod-openapi";
import { brand } from "@nebutra/brand/metadata";
import { logger } from "@nebutra/logger";
import { DEFAULT_PUBLIC_MODEL } from "@nebutra/router-supply";
import { createEndpointRateLimit } from "../../middlewares/rateLimit.js";
import { defaultEnvUpstreams, fetchUpstreamWithFallback } from "../ai/gateway.js";
import { retrieveContext } from "./context.js";
import { docsCors } from "./cors.js";

export const docsChatRoutes = new OpenAPIHono();

docsChatRoutes.use("/chat", docsCors());
// A generous-for-a-human, tight-for-a-scraper ceiling: this is a public,
// unauthenticated LLM-backed endpoint, so the cost of an unbounded caller is
// real (token spend), unlike most read endpoints. Keyed by IP via `tenant`
// (tenantContextMiddleware runs globally in app.ts before route mounting).
docsChatRoutes.use("/chat", createEndpointRateLimit(20));

/**
 * The model id sent verbatim in the `model` field of the OpenAI-compatible
 * `/chat/completions` request to whichever Router upstream
 * `defaultEnvUpstreams()` selects. Override per-deployment if the configured
 * New-API instance's channels use a different id — `nebutra status` / the
 * New-API admin console lists what a given deployment's channels actually
 * expose.
 *
 * `gpt-4o-mini` is the direct-to-New-API fallback default — not one of this
 * gateway's own outward public aliases
 * (`packages/platform/router-supply/src/frontier-defaults.ts`'s
 * `gpt-5.6-luna` etc. are a *different* naming layer: public alias ids that
 * only resolve to a real upstream model through `router-supply`'s alias
 * table). A direct-to-New-API upstream (`newapi`, `sub2api`, ...) bypasses
 * that table and would not understand a public alias, so it stays this small,
 * cheap, always-New-API-recognized id — what `infra/nebutra-router/scripts/
 * smoke-chat.sh` (this repo's own smoke test for this exact call shape)
 * already defaults to.
 *
 * `usingRouterAliasPath` is true exactly when `nebutra-router` — Router's own
 * internal endpoint, which *does* resolve the alias table
 * (`apps/router/src/lib/internal-service.ts`'s `resolveNewApiModel`) before
 * forwarding to New-API — is the upstream `fetchUpstreamWithFallback` will
 * try first. Only then is `DEFAULT_PUBLIC_MODEL` (`gpt-5.6-luna`) safe to use
 * as the fallback default: it is understood on that path and, on the common
 * "only `SERVICE_SECRET` is set" deployment, `nebutra-router` is the only
 * upstream in the list at all. A deployment that layers a hand-configured
 * `newapi` fallback behind `nebutra-router` should set `DOCS_ASSISTANT_MODEL`
 * explicitly to a plain New-API id, since that fallback still gets this same
 * request body verbatim if `nebutra-router` itself fails mid-request.
 */
const DEFAULT_DOCS_ASSISTANT_MODEL = "gpt-4o-mini";

function docsAssistantModel(usingRouterAliasPath: boolean): string {
  const override = process.env.DOCS_ASSISTANT_MODEL?.trim();
  if (override) return override;
  return usingRouterAliasPath ? DEFAULT_PUBLIC_MODEL : DEFAULT_DOCS_ASSISTANT_MODEL;
}

const ChatMessageSchema = z.object({
  role: z.enum(["user", "assistant"]),
  content: z.string().min(1).max(4000),
});

const ChatRequestSchema = z.object({
  messages: z.array(ChatMessageSchema).min(1).max(20),
});

const ChatResponseSchema = z.object({
  configured: z.literal(true),
  reply: z.string(),
});

const NotConfiguredSchema = z.object({
  configured: z.literal(false),
  message: z.string(),
});

const chatRoute = createRoute({
  method: "post",
  path: "/chat",
  tags: ["Docs"],
  summary: "Ask the docs assistant a question",
  description:
    "Public, rate-limited (20/min/IP), unauthenticated. Answers from the live docs corpus " +
    "(llms-full.txt) via the configured Router upstream. Returns { configured: false } " +
    "when no Router upstream is configured.",
  request: {
    body: { content: { "application/json": { schema: ChatRequestSchema } } },
  },
  responses: {
    200: {
      description: "Assistant reply, or a not-configured notice",
      content: {
        "application/json": { schema: z.union([ChatResponseSchema, NotConfiguredSchema]) },
      },
    },
    429: { description: "Rate limit exceeded" },
    502: { description: "Every configured Router upstream failed" },
  },
});

const SYSTEM_PROMPT = [
  `You are the ${brand.name} Sailor documentation assistant.`,
  "Answer only from the provided documentation context. If the context does not contain the answer, say you don't know and suggest which docs section to check.",
  "Be concise. Prefer short paragraphs and code fences over long prose.",
].join(" ");

interface UpstreamChatCompletion {
  choices?: Array<{ message?: { content?: string | null } }>;
}

docsChatRoutes.openapi(chatRoute, async (c) => {
  const upstreams = await defaultEnvUpstreams();

  if (upstreams.length === 0) {
    return c.json(
      {
        configured: false as const,
        message: "The docs assistant is not configured on this deployment.",
      },
      200,
    );
  }

  const { messages } = c.req.valid("json");
  const lastUserMessage = [...messages].reverse().find((m) => m.role === "user");
  const context = lastUserMessage ? await retrieveContext(lastUserMessage.content) : "";

  const system = context
    ? `${SYSTEM_PROMPT}\n\n--- Documentation context ---\n${context}`
    : SYSTEM_PROMPT;

  const model = docsAssistantModel(upstreams[0]?.id === "nebutra-router");
  const upstreamBody = JSON.stringify({
    model,
    messages: [{ role: "system", content: system }, ...messages],
    stream: false,
  });

  const outcome = await fetchUpstreamWithFallback(
    upstreams,
    (upstream) => ({
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${upstream.apiKey}`,
        ...(upstream.headers ?? {}),
      },
      body: upstreamBody,
    }),
    {
      onFetchFailed: (event) => {
        logger.error("docs assistant: upstream fetch failed", {
          provider: event.upstream.id,
          error: event.error,
        });
      },
      onUpstreamError: (event) => {
        logger.error("docs assistant: upstream error", {
          provider: event.upstream.id,
          status: event.status,
          error: event.error,
        });
      },
    },
  );

  if (!outcome.ok) {
    logger.error("docs assistant: all providers failed", { message: outcome.message });
    return c.json({ error: "The docs assistant is temporarily unavailable." }, 502) as never;
  }

  const json = (await outcome.response.json().catch(() => null)) as UpstreamChatCompletion | null;
  const reply = json?.choices?.[0]?.message?.content ?? "";

  logger.info("docs assistant reply", {
    provider: outcome.upstream.id,
    model,
    replyLength: reply.length,
  });
  return c.json({ configured: true as const, reply }, 200);
});
