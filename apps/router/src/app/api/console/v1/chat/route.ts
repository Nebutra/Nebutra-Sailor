import { DEFAULT_PUBLIC_MODEL } from "@nebutra/router-supply";
import { NextResponse } from "next/server";

/**
 * Console trial chat.
 *
 * It forwards to the configured relay with the caller's own key and returns
 * what came back. There is no local simulation and no wallet debit here: the
 * charge is written by the /v1 edge, against the real ledger, for whichever key
 * made the call. When no relay is configured this route says so rather than
 * inventing a reply.
 *
 * `ROUTER_GATEWAY_URL` must point at a **metered** Router edge (this app's own
 * `/v1`), never straight at New-API. Pointed upstream it becomes a second way
 * to reach supply with no reservation, no ledger row and no debit.
 */
export async function POST(request: Request) {
  const body = (await request.json().catch(() => ({}))) as {
    model?: string;
    prompt?: string;
    apiKey?: string;
  };
  const model = body.model ?? DEFAULT_PUBLIC_MODEL;
  const prompt = body.prompt ?? "";
  const gateway = process.env.ROUTER_GATEWAY_URL;

  if (!gateway) {
    return NextResponse.json(
      { error: "上游中转未配置，请设置 ROUTER_GATEWAY_URL。" },
      { status: 501 },
    );
  }
  if (!body.apiKey) {
    return NextResponse.json({ error: "需要一个 API Key 才能发起请求。" }, { status: 401 });
  }

  try {
    const upstream = await fetch(`${gateway.replace(/\/$/, "")}/chat/completions`, {
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
      error?: { message?: string };
    };
    if (!upstream.ok) {
      return NextResponse.json(
        { error: data.error?.message ?? `upstream ${upstream.status}` },
        { status: upstream.status },
      );
    }
    return NextResponse.json({
      content: data.choices?.[0]?.message?.content ?? "",
      model,
      usage: data.usage ?? null,
    });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : String(err) },
      { status: 502 },
    );
  }
}
