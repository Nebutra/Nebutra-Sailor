import { logger } from "@nebutra/logger";
import { NextResponse } from "next/server";
import { getCofounderContext } from "@/lib/cofounder/context";
import { deriveCofounderProfileInput } from "@/lib/cofounder/profile";
import {
  getCofounderProfile,
  setCofounderProfileActive,
  upsertCofounderProfile,
} from "@/lib/cofounder/store";
import { getTenantDb } from "@/lib/db";
import { listStartupProjects, type StartupOSDb } from "@/lib/startup-os/store";

export const dynamic = "force-dynamic";

/** Current opt-in status — the pool is opt-OUT by default, so the absence of a row means "not in the pool". */
export async function GET(request: Request) {
  const ctx = await getCofounderContext(request, "project:read");
  if ("response" in ctx) return ctx.response;

  try {
    const profile = await getCofounderProfile(ctx.db, ctx.tenantId);
    return NextResponse.json({
      optedIn: Boolean(profile?.isActive),
      profile: profile
        ? { arena: profile.arena, headline: profile.headline, archetype: profile.archetype }
        : null,
    });
  } catch (error) {
    logger.error("[cofounder.opt-in.GET] Failed to read cofounder profile", {
      tenantId: ctx.tenantId,
      error: error instanceof Error ? error.message : "Unknown error",
    });
    return NextResponse.json({ error: "Failed to read cofounder status." }, { status: 500 });
  }
}

/** Join the pool. The card is derived from the founder's latest compiled company — never hand-entered. */
export async function POST(request: Request) {
  const ctx = await getCofounderContext(request, "project:create");
  if ("response" in ctx) return ctx.response;

  try {
    const startupDb = getTenantDb(ctx.tenantId) as unknown as StartupOSDb;
    const projects = await listStartupProjects(startupDb, ctx.tenantId);
    const latest = projects[0];
    if (!latest) {
      return NextResponse.json(
        { error: "Compile a company before joining the cofounder pool." },
        { status: 409 },
      );
    }

    const profile = await upsertCofounderProfile(ctx.db, {
      tenantId: ctx.tenantId,
      userId: ctx.userId,
      profile: deriveCofounderProfileInput(latest),
      isActive: true,
    });
    return NextResponse.json(
      {
        optedIn: true,
        profile: { arena: profile.arena, headline: profile.headline, archetype: profile.archetype },
      },
      { status: 201 },
    );
  } catch (error) {
    logger.error("[cofounder.opt-in.POST] Failed to opt in", {
      tenantId: ctx.tenantId,
      error: error instanceof Error ? error.message : "Unknown error",
    });
    return NextResponse.json({ error: "Failed to join the cofounder pool." }, { status: 500 });
  }
}

/** Leave the pool. Soft opt-out (keeps the row inactive) so prior matches and signals survive. */
export async function DELETE(request: Request) {
  const ctx = await getCofounderContext(request, "project:create");
  if ("response" in ctx) return ctx.response;

  try {
    const existing = await getCofounderProfile(ctx.db, ctx.tenantId);
    if (!existing) return NextResponse.json({ optedIn: false });
    await setCofounderProfileActive(ctx.db, ctx.tenantId, false);
    return NextResponse.json({ optedIn: false });
  } catch (error) {
    logger.error("[cofounder.opt-in.DELETE] Failed to opt out", {
      tenantId: ctx.tenantId,
      error: error instanceof Error ? error.message : "Unknown error",
    });
    return NextResponse.json({ error: "Failed to leave the cofounder pool." }, { status: 500 });
  }
}
