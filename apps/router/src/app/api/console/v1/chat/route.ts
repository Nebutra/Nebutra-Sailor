import { DEFAULT_PUBLIC_MODEL } from "@nebutra/router-supply";
import { NextResponse } from "next/server";
import { z } from "zod";
import { createRouterGuard, createRouterRateLimiter } from "@/lib/billing-edge";
import { requireConsoleTenant } from "@/lib/console-tenant";
import type { EdgeIdentity } from "@/lib/openai-edge";
import { proxyOpenAiCompatible, RouterSupplyUnavailableError, refuse } from "@/lib/openai-edge";
import { getApiKeyRepository } from "@/lib/router-keys";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 180;

/**
 * Console trial chat — 快捷使用.
 *
 * ## The customer no longer pastes their own key
 *
 * The page used to ask for a plaintext API key in a text box, on a screen the
 * customer had already signed in to. That is a credential prompt inside an
 * authenticated session: it teaches people to paste secrets into forms, and it
 * left `/use` unusable for anyone who had (correctly) saved their key somewhere
 * this browser could not reach.
 *
 * The session identifies the tenant; the tenant's newest **active** key
 * identifies where the charge lands. Plaintext is never involved — only the
 * key's id is, which is all `EdgeIdentity` carries anyway. When the tenant has
 * no usable key the answer is a 409 naming that fact, not a silent 401 from the
 * edge.
 *
 * ## It is still the metered edge
 *
 * `ROUTER_GATEWAY_URL` is gone and does not come back: there is one path to
 * supply and it is the guarded one — reservation, priced ledger row, request
 * log, debit. This route only supplies the identity the /v1 edge would have
 * resolved from a bearer token, and streams the answer back untouched.
 */

const ChatBody = z.object({
  model: z.string().trim().min(1).max(128).optional(),
  prompt: z.string().max(32_000).optional(),
  messages: z
    .array(
      z.object({
        role: z.enum(["system", "user", "assistant"]),
        content: z.string().max(32_000),
      }),
    )
    .min(1)
    .max(64)
    .optional(),
  maxTokens: z.number().int().positive().max(8192).optional(),
});

const guard = createRouterGuard();
const rateLimit = createRouterRateLimiter();

export async function POST(request: Request) {
  const ctx = await requireConsoleTenant(request);
  if ("error" in ctx) return ctx.error;

  const parsed = ChatBody.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "请求格式不对。" },
      { status: 400 },
    );
  }
  const body = parsed.data;
  const messages = body.messages ?? [{ role: "user" as const, content: body.prompt ?? "" }];
  if (messages.every((message) => message.content.trim() === "")) {
    return NextResponse.json({ error: "先写点内容再发送。" }, { status: 400 });
  }

  const keys = await getApiKeyRepository().listDetailByTenant(ctx.tenantId);
  const key = keys.find((candidate) => candidate.status === "active");
  if (!key) {
    return NextResponse.json(
      {
        error: "这个账号还没有可用的 Key。到 Keys 页面创建一把，费用会记在它名下。",
        code: "no_active_key",
      },
      { status: 409 },
    );
  }

  const identity: EdgeIdentity = {
    keyId: key.id,
    tenantId: ctx.tenantId,
    userId: ctx.userId,
  };

  const edge = new URL("/v1/chat/completions", request.url);
  const upstreamRequest = new Request(edge, {
    method: "POST",
    headers: {
      // The resolver below ignores the credential; the session already
      // authenticated the caller. It is present because the edge requires the
      // header's shape before it looks at anything else.
      Authorization: "Bearer console-session",
      "Content-Type": "application/json",
      Accept: "text/event-stream",
    },
    body: JSON.stringify({
      model: body.model ?? DEFAULT_PUBLIC_MODEL,
      messages,
      max_tokens: body.maxTokens ?? 1024,
      stream: true,
      // Ask the upstream for the usage block on the final chunk, so the page can
      // show tokens the moment the stream ends instead of guessing them.
      stream_options: { include_usage: true },
    }),
  });

  try {
    const response = await proxyOpenAiCompatible(upstreamRequest, ["chat", "completions"], {
      resolveKey: async () => identity,
      guard,
      rateLimit,
    });
    response.headers.set("x-nebutra-key-id", key.id);
    response.headers.set("x-nebutra-key-name", encodeURIComponent(key.name));
    return response;
  } catch (error) {
    if (error instanceof RouterSupplyUnavailableError) {
      return refuse(503, "router_unconfigured", "供给尚未接通，稍后再试。");
    }
    return refuse(
      // 502 never leaves the origin: Cloudflare swaps it for an HTML error page.
      503,
      "upstream_failed",
      error instanceof Error ? error.message : "上游没有响应。",
    );
  }
}
