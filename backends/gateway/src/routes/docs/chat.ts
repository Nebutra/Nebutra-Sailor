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
 * Answers with `{ configured: false }` (200, not an error status — this is
 * an expected, documented state, not a failure) when no LLM provider key is
 * present, so the docs UI can hide/disable the chat entry point instead of
 * showing a broken control.
 */
import { createRoute, OpenAPIHono, z } from "@hono/zod-openapi";
import { runWithFallback } from "@nebutra/agents";
import { logger } from "@nebutra/logger";
import { streamText as aiStreamText } from "ai";
import { createEndpointRateLimit } from "../../middlewares/rateLimit.js";
import { retrieveContext } from "./context.js";
import { docsCors } from "./cors.js";

export const docsChatRoutes = new OpenAPIHono();

docsChatRoutes.use("/chat", docsCors());
// A generous-for-a-human, tight-for-a-scraper ceiling: this is a public,
// unauthenticated LLM-backed endpoint, so the cost of an unbounded caller is
// real (token spend), unlike most read endpoints. Keyed by IP via `tenant`
// (tenantContextMiddleware runs globally in app.ts before route mounting).
docsChatRoutes.use("/chat", createEndpointRateLimit(20));

const ENV_KEY_BY_PROVIDER = [
  "OPENROUTER_API_KEY",
  "ANTHROPIC_API_KEY",
  "OPENAI_API_KEY",
  "AI302_API_KEY",
] as const;

function hasAnyLlmProviderKey(): boolean {
  return ENV_KEY_BY_PROVIDER.some((key) => Boolean(process.env[key]));
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
    "(llms-full.txt). Returns { configured: false } when no LLM provider key is set.",
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
    502: { description: "Every configured LLM provider failed" },
  },
});

const SYSTEM_PROMPT = [
  "You are the Nebutra Sailor documentation assistant.",
  "Answer only from the provided documentation context. If the context does not contain the answer, say you don't know and suggest which docs section to check.",
  "Be concise. Prefer short paragraphs and code fences over long prose.",
].join(" ");

docsChatRoutes.openapi(chatRoute, async (c) => {
  if (!hasAnyLlmProviderKey()) {
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

  try {
    const { result, provider } = await runWithFallback(
      (model) =>
        Promise.resolve(
          aiStreamText({
            model,
            system,
            messages: messages.map((m) => ({ role: m.role, content: m.content })),
          }),
        ),
      { model: "fast" },
    );

    const reply = await result.text;
    logger.info("docs assistant reply", { provider, replyLength: reply.length });
    return c.json({ configured: true as const, reply }, 200);
  } catch (error) {
    logger.error("docs assistant: all providers failed", { error });
    return c.json({ error: "The docs assistant is temporarily unavailable." }, 502) as never;
  }
});
