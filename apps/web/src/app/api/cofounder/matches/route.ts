import { logger } from "@nebutra/logger";
import { NextResponse } from "next/server";
import { getCofounderContext } from "@/lib/cofounder/context";
import { getCofounderProfile, listMatches } from "@/lib/cofounder/store";

export const dynamic = "force-dynamic";

/** Mutual matches — founders who signalled interest in each other. The Cofounder Room opens from here. */
export async function GET(request: Request) {
  const ctx = await getCofounderContext(request, "project:read");
  if ("response" in ctx) return ctx.response;

  try {
    const me = await getCofounderProfile(ctx.db, ctx.tenantId);
    if (!me) {
      return NextResponse.json({ matches: [] });
    }

    const matches = await listMatches(ctx.db, me.id);
    return NextResponse.json({
      matches: matches.map((p) => ({
        profileId: p.id,
        companyName: p.headline.split(" — ")[0] ?? p.headline,
        arena: p.arena,
        oneLiner: p.headline,
        archetype: p.archetype ?? undefined,
      })),
    });
  } catch (error) {
    logger.error("[cofounder.matches.GET] Failed to load matches", {
      tenantId: ctx.tenantId,
      error: error instanceof Error ? error.message : "Unknown error",
    });
    return NextResponse.json({ error: "Failed to load your matches." }, { status: 500 });
  }
}
