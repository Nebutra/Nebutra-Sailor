import { DEFAULT_PUBLIC_MODEL } from "@nebutra/router-supply";
import { NextResponse } from "next/server";
import { getWallet } from "@/lib/demo-store";

/**
 * Demo chat: if ROUTER_GATEWAY_URL + apiKey set, forward to gateway;
 * else mock response and optional debit for demo metering feel.
 */
export async function POST(request: Request) {
  const body = (await request.json()) as {
    model?: string;
    prompt?: string;
    apiKey?: string;
  };
  const model = body.model ?? DEFAULT_PUBLIC_MODEL;
  const prompt = body.prompt ?? "";
  const gateway = process.env.ROUTER_GATEWAY_URL;

  if (gateway && body.apiKey) {
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
        error?: { message?: string };
      };
      if (!upstream.ok) {
        return NextResponse.json(
          { error: data.error?.message ?? `upstream ${upstream.status}` },
          { status: upstream.status },
        );
      }
      return NextResponse.json({
        mode: "gateway",
        content: data.choices?.[0]?.message?.content ?? "",
      });
    } catch (err) {
      return NextResponse.json(
        { error: err instanceof Error ? err.message : String(err) },
        { status: 502 },
      );
    }
  }

  const wallet = getWallet();
  const cost = 0.001;
  if (await wallet.hasBalance("demo", cost)) {
    await wallet.debit({ tenantId: "demo", amount: cost, description: "playground mock" });
  }

  return NextResponse.json({
    mode: "demo",
    content: `（demo）${model} 收到：${prompt.slice(0, 200)}。配置 ROUTER_GATEWAY_URL 可转发真实中转。`,
  });
}
