import { NextResponse } from "next/server";
import { getForgeRegistry } from "@/lib/registry";

/** GET /api/v1/tools — machine-readable tool catalog */
export async function GET() {
  const registry = getForgeRegistry();
  return NextResponse.json({
    tools: registry.list(),
    categories: registry.categories(),
  });
}
