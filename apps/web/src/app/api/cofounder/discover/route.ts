import { logger } from "@nebutra/logger";
import { NextResponse } from "next/server";
import { getCofounderContext } from "@/lib/cofounder/context";
import { getCofounderProfile, listDiscoverPool } from "@/lib/cofounder/store";

export const dynamic = "force-dynamic";

/**
 * The swipe deck: active pool profiles the viewer hasn't acted on. Requires the
 * viewer to be in the pool (you browse only once you're discoverable too).
 * Honest empty — an empty pool returns `{ cards: [] }`, never a fabricated card.
 */
export async function GET(request: Request) {
  const ctx = await getCofounderContext(request, "project:read");
  if ("response" in ctx) return ctx.response;

  try {
    const me = await getCofounderProfile(ctx.db, ctx.tenantId);
    if (!me?.isActive) {
      return NextResponse.json({ cards: [], reason: "not-opted-in" });
    }

    const pool = await listDiscoverPool(ctx.db, { viewerProfileId: me.id });
    const cards = pool.map((p) => ({
      profileId: p.id,
      companyName: p.headline.split(" — ")[0] ?? p.headline,
      arena: p.arena,
      oneLiner: p.headline,
      archetype: p.archetype ?? undefined,
      // Complementarity is engine-computed from activity data (not yet wired);
      // omitted here rather than fabricated.
      trustVerified: true,
    }));
    return NextResponse.json({ cards });
  } catch (error) {
    logger.error("[cofounder.discover.GET] Failed to load discover pool", {
      tenantId: ctx.tenantId,
      error: error instanceof Error ? error.message : "Unknown error",
    });
    return NextResponse.json({ error: "Failed to load the cofounder pool." }, { status: 500 });
  }
}
