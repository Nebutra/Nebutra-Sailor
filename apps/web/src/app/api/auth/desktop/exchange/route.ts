import { consumeDesktopAuthHandoff } from "@nebutra/auth/desktop";
import { logger } from "@nebutra/logger";
import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";

const bodySchema = z.object({
  token: z.string().trim().min(1),
});

function jsonNoStore(body: unknown, init?: ResponseInit) {
  const response = NextResponse.json(body, init);
  response.headers.set("cache-control", "no-store");
  return response;
}

export async function POST(request: Request) {
  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return jsonNoStore({ error: "Invalid desktop handoff request." }, { status: 400 });
  }

  try {
    const exchange = await consumeDesktopAuthHandoff({
      client: db,
      token: parsed.data.token,
      request,
    });

    if (!exchange) {
      return jsonNoStore({ error: "Invalid desktop handoff token." }, { status: 401 });
    }

    return jsonNoStore(exchange);
  } catch (error) {
    logger.error("[auth:desktop] Failed to exchange desktop handoff token", {
      error: error instanceof Error ? error.message : "Unknown error",
    });

    return jsonNoStore({ error: "Failed to exchange desktop handoff token." }, { status: 500 });
  }
}
