import { NextResponse } from "next/server";

/**
 * Proxy to the forge-dns-leak control API on the product host.
 * When infrastructure is down, return 503 with a clear code so the UI falls
 * back to multi-resolver / DoH mode without lying.
 */
const CONTROL = process.env.FORGE_DNS_LEAK_URL ?? "http://127.0.0.1:3953";

export async function POST(request: Request) {
  let body: unknown = {};
  try {
    body = await request.json();
  } catch {
    body = {};
  }
  try {
    const res = await fetch(`${CONTROL}/sessions`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body ?? {}),
      signal: AbortSignal.timeout(4_000),
      cache: "no-store",
    });
    const json: unknown = await res.json();
    return NextResponse.json(json, { status: res.status });
  } catch (err) {
    return NextResponse.json(
      {
        ok: false,
        code: "infrastructure_unavailable",
        message: err instanceof Error ? err.message : "DNS leak authority control API unreachable",
        honesty:
          "Authoritative leak zone not running on this host. Multi-resolver / DoH mode still works on /t/dns-leak.",
      },
      { status: 503 },
    );
  }
}

export async function GET() {
  try {
    const res = await fetch(`${CONTROL}/health`, {
      signal: AbortSignal.timeout(2_000),
      cache: "no-store",
    });
    const json: unknown = await res.json();
    return NextResponse.json(json, { status: res.status });
  } catch {
    return NextResponse.json({ ok: false, code: "infrastructure_unavailable" }, { status: 503 });
  }
}
