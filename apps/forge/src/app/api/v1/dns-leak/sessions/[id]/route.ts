import { NextResponse } from "next/server";

const CONTROL = process.env.FORGE_DNS_LEAK_URL ?? "http://127.0.0.1:3953";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(_request: Request, context: Ctx) {
  const { id } = await context.params;
  if (!/^[a-f0-9]{8,32}$/i.test(id)) {
    return NextResponse.json({ ok: false, code: "invalid_id" }, { status: 400 });
  }
  try {
    const res = await fetch(`${CONTROL}/sessions/${id}`, {
      signal: AbortSignal.timeout(3_000),
      cache: "no-store",
    });
    const json: unknown = await res.json();
    return NextResponse.json(json, { status: res.status });
  } catch (err) {
    return NextResponse.json(
      {
        ok: false,
        code: "infrastructure_unavailable",
        message: err instanceof Error ? err.message : "control API unreachable",
      },
      { status: 503 },
    );
  }
}
