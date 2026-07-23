import { createForgeMcpHandlers } from "@nebutra/forge-runtime";
import { NextResponse } from "next/server";
import { getForgeRegistry } from "@/lib/registry";

/**
 * Minimal MCP-over-HTTP JSON surface for Agents.
 *
 * POST body:
 *   { "method": "tools/list" }
 *   { "method": "tools/call", "params": { "name": "text__word-count", "arguments": { "text": "hi" } } }
 */
export async function POST(request: Request) {
  let body: {
    method?: string;
    params?: { name?: string; arguments?: unknown };
  };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }

  const mcp = createForgeMcpHandlers(getForgeRegistry());

  if (body.method === "tools/list") {
    return NextResponse.json({ tools: mcp.listTools() });
  }

  if (body.method === "tools/call") {
    const name = body.params?.name;
    if (!name) {
      return NextResponse.json({ error: "params.name required" }, { status: 400 });
    }
    const result = await mcp.callTool(name, body.params?.arguments ?? {});
    return NextResponse.json(result);
  }

  return NextResponse.json(
    { error: "unsupported_method", supported: ["tools/list", "tools/call"] },
    { status: 400 },
  );
}

export async function GET() {
  return NextResponse.json({
    protocol: "nebutra-forge-mcp-http",
    methods: ["tools/list", "tools/call"],
    note: "JSON HTTP bridge; full MCP stdio can wrap createForgeMcpHandlers()",
  });
}
