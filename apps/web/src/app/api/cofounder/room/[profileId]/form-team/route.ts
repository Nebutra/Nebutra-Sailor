import { auditLogger } from "@nebutra/audit";
import { logger } from "@nebutra/logger";
import { NextResponse } from "next/server";
import { hasActivePlan } from "@/lib/billing/active-plan";
import { getCofounderContext } from "@/lib/cofounder/context";
import {
  assertFormTeamEligible,
  buildTransferJournalEntries,
  FormTeamError,
} from "@/lib/cofounder/form-team";
import { getCofounderProfile, listMatches } from "@/lib/cofounder/store";
import {
  createTeamOrganization,
  deriveTeamSlug,
  inviteCofounderToTeam,
  resolveFounderEmail,
} from "@/lib/cofounder/team-provisioning";
import { getTenantDb } from "@/lib/db";
import { companyName } from "@/lib/startup-os/company-context/projection";
import { listStartupProjects, type StartupOSDb } from "@/lib/startup-os/store";

export const dynamic = "force-dynamic";

const ERROR_STATUS: Record<string, number> = {
  "not-a-match": 404,
  unpaid: 403,
  "not-owner": 409,
};

/**
 * Form a team from a mutual match. The initiator's OPC becomes a shared
 * Organization and the compiled company carries over.
 *
 * Because org Tenants are provisioned asynchronously (Clerk webhook -> inngest),
 * this records the intent: create the org, write `pending` transfer-journal rows
 * keyed by the new org id, and invite the cofounder. The async worker re-points
 * the assets once the org tenant exists. Nothing is copied implicitly.
 */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ profileId: string }> },
) {
  const ctx = await getCofounderContext(request, "project:create");
  if ("response" in ctx) return ctx.response;

  const { profileId } = await params;
  const tdb = getTenantDb(ctx.tenantId);

  try {
    const me = await getCofounderProfile(ctx.db, ctx.tenantId);
    if (!me) {
      return NextResponse.json({ error: "Join the cofounder pool first." }, { status: 409 });
    }

    const matches = await listMatches(ctx.db, me.id);
    const match = matches.find((m) => m.id === profileId);

    const projects = await listStartupProjects(tdb as unknown as StartupOSDb, ctx.tenantId);
    const project = projects[0];
    const plan = await hasActivePlan(ctx.tenantId);

    try {
      assertFormTeamEligible({
        isMatch: Boolean(match),
        initiatorPaid: plan.active,
        isInitiatorOwnerOfProject: Boolean(project),
      });
    } catch (error) {
      if (error instanceof FormTeamError) {
        return NextResponse.json(
          { error: error.message },
          { status: ERROR_STATUS[error.code] ?? 400 },
        );
      }
      throw error;
    }
    // Past the guard: match and project are present.
    if (!match || !project) {
      return NextResponse.json({ error: "Cannot form a team yet." }, { status: 409 });
    }

    const name = companyName(project.companyContext);
    const slug = deriveTeamSlug(name, globalThis.crypto.randomUUID().slice(0, 6));

    const org = await createTeamOrganization(request, {
      name,
      slug,
      creatorUserId: ctx.userId,
    });
    if (org.status === "unsupported") {
      return NextResponse.json(
        { error: "Team formation requires an organization-capable auth provider." },
        { status: 501 },
      );
    }

    // Record the transfer intent (pending) keyed by the new org id. The async
    // provisioning worker fills to_tenant_id and applies these once the org
    // tenant exists.
    const entries = buildTransferJournalEntries({
      fromTenantId: ctx.tenantId,
      toOrganizationId: org.organizationId,
      projectId: project.id,
      cofounderProfileId: match.id,
      userId: ctx.userId,
    });
    try {
      await tdb.tenantTransferJournal.createMany({ data: entries });
      await tdb.tenant.update({
        where: { id: ctx.tenantId },
        data: { lifecycleState: "workspace_ready" },
      });
    } catch (error) {
      // The org exists; a journal failure is recoverable (reconcile by org id),
      // so log loudly rather than leaving the user with a 500 and a live org.
      logger.error("[cofounder.form-team] org created but journal/lifecycle write failed", {
        tenantId: ctx.tenantId,
        organizationId: org.organizationId,
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }

    // Invite the matched cofounder (as admin — equal founder) into the new org.
    const email = await resolveFounderEmail(match.userId);
    if (email) {
      try {
        await inviteCofounderToTeam({
          organizationId: org.organizationId,
          email,
          inviterUserId: ctx.userId,
        });
      } catch (error) {
        logger.error("[cofounder.form-team] cofounder invite failed", {
          organizationId: org.organizationId,
          error: error instanceof Error ? error.message : "Unknown error",
        });
      }
    }

    await auditLogger(request, {
      actor: { id: ctx.userId, type: "user" },
      tenantId: ctx.tenantId,
    }).log({
      action: "cofounder.team.formed",
      outcome: "success",
      resource: { type: "organization", id: org.organizationId, name },
      metadata: {
        fromTenantId: ctx.tenantId,
        cofounderProfileId: match.id,
        projectId: project.id,
        invitedCofounder: Boolean(email),
      },
    });

    return NextResponse.json(
      { organizationId: org.organizationId, status: "forming" },
      { status: 201 },
    );
  } catch (error) {
    logger.error("[cofounder.form-team] Failed to form team", {
      tenantId: ctx.tenantId,
      error: error instanceof Error ? error.message : "Unknown error",
    });
    return NextResponse.json({ error: "Failed to form the team." }, { status: 500 });
  }
}
