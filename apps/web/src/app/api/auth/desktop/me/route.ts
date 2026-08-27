import { resolveDesktopSession } from "@nebutra/auth/desktop";
import { logger } from "@nebutra/logger";
import { NextResponse } from "next/server";
import { db } from "@/lib/db";

function jsonNoStore(body: unknown, init?: ResponseInit) {
  const response = NextResponse.json(body, init);
  response.headers.set("cache-control", "no-store");
  return response;
}

export async function GET(request: Request) {
  try {
    const session = await resolveDesktopSession({ client: db, request });
    if (!session) {
      return jsonNoStore({ error: "Authentication required." }, { status: 401 });
    }

    return jsonNoStore(session);
  } catch (error) {
    logger.error("[auth:desktop] Failed to resolve desktop session", {
      error: error instanceof Error ? error.message : "Unknown error",
    });

    return jsonNoStore({ error: "Failed to resolve desktop session." }, { status: 500 });
  }
}
