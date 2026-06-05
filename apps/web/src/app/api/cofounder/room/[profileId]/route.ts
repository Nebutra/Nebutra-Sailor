import { logger } from "@nebutra/logger";
import { NextResponse } from "next/server";
import { hasActivePlan } from "@/lib/billing/active-plan";
import { getCofounderContext } from "@/lib/cofounder/context";
import { getCofounderProfile, listMatches } from "@/lib/cofounder/store";

export const dynamic = "force-dynamic";

function companyNameFromHeadline(headline: string): string {
  return headline.split(" — ")[0] ?? headline;
}

/**
 * Cofounder Room access. The Room is gated by the INITIATOR (viewer) holding a
 * paid plan — per product decision, opening a Room requires the same paid
 * subscription as the landing plan; there is no separate per-room charge.
 *
 * Returns the matched founder plus whether the viewer's plan grants access.
 * Only a real mutual match is addressable (404 otherwise) — RLS + the match
 * check prevent peeking at non-matched profiles.
 */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ profileId: string }> },
) {
  const ctx = await getCofounderContext(request, "project:read");
  if ("response" in ctx) return ctx.response;

  const { profileId } = await params;

  try {
    const me = await getCofounderProfile(ctx.db, ctx.tenantId);
    if (!me) {
      return NextResponse.json({ error: "Join the cofounder pool first." }, { status: 409 });
    }

    const matches = await listMatches(ctx.db, me.id);
    const match = matches.find((m) => m.id === profileId);
    if (!match) {
      return NextResponse.json({ error: "Not a match." }, { status: 404 });
    }

    const plan = await hasActivePlan(ctx.tenantId);

    return NextResponse.json({
      match: {
        profileId: match.id,
        companyName: companyNameFromHeadline(match.headline),
        arena: match.arena,
        oneLiner: match.headline,
        archetype: match.archetype ?? undefined,
      },
      access: {
        granted: plan.active,
        planName: plan.planName,
        status: plan.status,
      },
    });
  } catch (error) {
    logger.error("[cofounder.room.GET] Failed to resolve room access", {
      tenantId: ctx.tenantId,
      error: error instanceof Error ? error.message : "Unknown error",
    });
    return NextResponse.json({ error: "Failed to open the Cofounder Room." }, { status: 500 });
  }
}
