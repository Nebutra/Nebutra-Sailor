import { logger } from "@nebutra/logger";
import { NextResponse } from "next/server";
import { z } from "zod";
import { getCofounderContext } from "@/lib/cofounder/context";
import { getCofounderProfile, recordInterest } from "@/lib/cofounder/store";

export const dynamic = "force-dynamic";

const InterestSchema = z.object({
  toProfileId: z.string().min(1),
  kind: z.enum(["PASS", "INTERESTED", "PITCH"]),
  pitch: z.string().trim().max(1000).optional(),
});

const isInterested = (kind: string) => kind === "INTERESTED" || kind === "PITCH";

/** Record a swipe decision (Pass / Interested / Pitch). Mutual interest opens a match. */
export async function POST(request: Request) {
  const ctx = await getCofounderContext(request, "project:create");
  if ("response" in ctx) return ctx.response;

  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const parsed = InterestSchema.safeParse(payload);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid input.", details: parsed.error.flatten() },
      { status: 400 },
    );
  }
  const { toProfileId, kind, pitch } = parsed.data;

  try {
    const me = await getCofounderProfile(ctx.db, ctx.tenantId);
    if (!me?.isActive) {
      return NextResponse.json({ error: "Join the cofounder pool first." }, { status: 409 });
    }
    if (toProfileId === me.id) {
      return NextResponse.json(
        { error: "You cannot signal interest in yourself." },
        { status: 400 },
      );
    }

    await recordInterest(ctx.db, { fromProfileId: me.id, toProfileId, kind, pitch });

    // A match is mutual interest: did the target already signal interest in me?
    let matched = false;
    if (isInterested(kind)) {
      const reciprocal = await ctx.db.cofounderInterest.findMany({
        where: { fromProfileId: toProfileId, toProfileId: me.id },
      });
      matched = reciprocal.some((r) => isInterested(r.kind));
    }

    return NextResponse.json({ recorded: true, matched });
  } catch (error) {
    logger.error("[cofounder.interest.POST] Failed to record interest", {
      tenantId: ctx.tenantId,
      error: error instanceof Error ? error.message : "Unknown error",
    });
    return NextResponse.json({ error: "Failed to record your decision." }, { status: 500 });
  }
}
