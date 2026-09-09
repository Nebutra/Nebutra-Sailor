import { DEFAULT_PUBLIC_MODEL } from "@nebutra/router-supply";
import { NextResponse } from "next/server";
import { requireConsoleTenant } from "@/lib/console-tenant";

export const dynamic = "force-dynamic";

/**
 * Console trial chat.
 *
 * ## `ROUTER_GATEWAY_URL` is gone
 *
 * This route used to forward to whatever `ROUTER_GATEWAY_URL` named. Unset, it
 * did nothing; pointed at New-API it was a second way to reach supply with no
 * reservation, no ledger row and no debit — a guard-free egress whose only
 * protection was a comment asking the operator not to. An escape hatch that
 * costs money when someone gets it wrong is not a configuration option.
 *
 * The target is now this app's own metered `/v1` edge, derived from the
 * incoming request's origin. There is one path to supply and it is the guarded
 * one: key resolution, balance hold, priced ledger row, request log.
 *
 * The caller still supplies their own API key — that key is what the charge is
 * attributed to. Making the playground use the session's key instead is the
 * page rebuild's job (Batch B part 2); what is closed here is the bypass.
 */
export async function POST(request: Request) {
  const ctx = await requireConsoleTenant(request);
  if ("error" in ctx) return ctx.error;

  const body = (await request.json().catch(() => ({}))) as {
    model?: string;
    prompt?: string;
    apiKey?: string;
  };
  const model = body.model ?? DEFAULT_PUBLIC_MODEL;
  const prompt = body.prompt ?? "";

  if (!body.apiKey) {
    return NextResponse.json(
      { error: "需要一个 API Key 才能发起请求，请在 Keys 页面创建一个。" },
      { status: 401 },
    );
  }

  // Same origin, same deployment, same guard. Not configurable.
  const edge = new URL("/v1/chat/completions", request.url);

  try {
    const upstream = await fetch(edge, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${body.apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model,
        messages: [{ role: "user", content: prompt }],
        max_tokens: 256,
      }),
    });
    const data = (await upstream.json()) as {
      choices?: Array<{ message?: { content?: string } }>;
      usage?: { prompt_tokens?: number; completion_tokens?: number };
      error?: { message?: string; code?: string };
    };
    if (!upstream.ok) {
      return NextResponse.json(
        {
          error: data.error?.message ?? `upstream ${upstream.status}`,
          ...(data.error?.code ? { code: data.error.code } : {}),
        },
        { status: upstream.status },
      );
    }
    return NextResponse.json({
      content: data.choices?.[0]?.message?.content ?? "",
      model,
      usage: data.usage ?? null,
      requestId: upstream.headers.get("x-request-id"),
    });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : String(err) },
      { status: 502 },
    );
  }
}
