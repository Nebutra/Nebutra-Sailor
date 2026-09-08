import "server-only";

import { NextResponse } from "next/server";
import { StaffAccessError } from "./staff";
import { proxyToCliProxy, SupplyConfigError } from "./supply";

export const runtime = "nodejs";

/** Shared handler body for every proxied CLIProxyAPI path. */
export async function handleSupplyProxy(request: Request, targetPath: string): Promise<Response> {
  try {
    return await proxyToCliProxy(request, targetPath);
  } catch (error) {
    if (error instanceof StaffAccessError) {
      return NextResponse.json({ error: "Not a platform staff member." }, { status: 403 });
    }
    if (error instanceof SupplyConfigError) {
      return NextResponse.json({ error: error.message }, { status: 503 });
    }
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "upstream_failed" },
      { status: 502 },
    );
  }
}
