import { logger } from "@nebutra/logger";
import { NextResponse } from "next/server";
import { z } from "zod";
import { getAuth } from "@/lib/auth";
import { getTenantDb } from "@/lib/db";
import { hasPermission, resolveRole } from "@/lib/permissions";
import { generateField, invokeGenerateModel } from "@/lib/startup-os/company-context/generate";
import { ensureTower } from "@/lib/startup-os/company-context/migrate";
import { InMemoryCompanyContextRepository } from "@/lib/startup-os/company-context/repository";
import { hasStartupOSAIProviderKey } from "@/lib/startup-os/execution";
import { isStartupOSPrototypeEnabled } from "@/lib/startup-os/feature-flag";
import {
  getStartupProject,
  type StartupOSDb,
  saveStartupProjectRecord,
} from "@/lib/startup-os/store";

export const dynamic = "force-dynamic";

/**
 * Human edit of a single Company Context field. The nine-layer tower lives
 * inside `StartupOSProject.companyContext` (persisted in the AtelierCanvas
 * scene), so a field write = load the project, `upsertField` through the
 * repository seam, then persist the whole project. Provenance is always "user"
 * here — this is the human-facing edit surface; agents write via their own
 * tool path. The mutated context flows downstream to every consumer (generated
 * app, artifacts, LLM prompts, cofounder card).
 */

const LAYER_IDS = ["L1", "L2", "L3", "L4", "L5", "L6", "L7", "L8", "L9"] as const;

const UpsertFieldSchema = z.object({
  layerId: z.enum(LAYER_IDS),
  fieldKey: z.string().min(1).max(64),
  value: z.unknown(),
});

const GenerateFieldSchema = z.object({
  layerId: z.enum(LAYER_IDS),
  fieldKey: z.string().min(1).max(64),
});

interface RouteContext {
  readonly params: Promise<{ readonly projectId: string }>;
}

function disabledResponse() {
  return NextResponse.json({ error: "Startup OS is not enabled." }, { status: 404 });
}

async function getRequestContext(request: Request) {
  if (!isStartupOSPrototypeEnabled()) {
    return { response: disabledResponse() } as const;
  }

  const auth = await getAuth(request);
  if (!auth.isSignedIn || !auth.userId) {
    return {
      response: NextResponse.json({ error: "Authentication required." }, { status: 401 }),
    } as const;
  }
  if (!auth.orgId) {
    return {
      response: NextResponse.json({ error: "Organization required." }, { status: 403 }),
    } as const;
  }
  const role = resolveRole(auth.sessionClaims?.org_role as string | undefined);
  if (!hasPermission(role, "project:update")) {
    return {
      response: NextResponse.json({ error: "Forbidden" }, { status: 403 }),
    } as const;
  }

  return {
    auth,
    orgId: auth.orgId,
    db: getTenantDb(auth.orgId) as unknown as StartupOSDb,
  } as const;
}

export async function PATCH(request: Request, context: RouteContext) {
  const requestContext = await getRequestContext(request);
  if ("response" in requestContext) return requestContext.response;

  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const parsed = UpsertFieldSchema.safeParse(payload);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid field edit.", details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const { projectId } = await context.params;
  const decodedProjectId = decodeURIComponent(projectId);

  try {
    const project = await getStartupProject(
      requestContext.db,
      requestContext.orgId,
      decodedProjectId,
    );
    if (project === null) {
      return NextResponse.json({ error: "Startup OS project not found." }, { status: 404 });
    }

    const now = new Date().toISOString();
    const tower = ensureTower(project.companyContext, decodedProjectId, now);
    const repo = new InMemoryCompanyContextRepository();
    repo.save(tower);
    const nextContext = repo.upsertField(
      tower.projectId,
      parsed.data.layerId,
      parsed.data.fieldKey,
      parsed.data.value,
      { provenance: "user", now },
    );

    const saved = await saveStartupProjectRecord(requestContext.db, requestContext.orgId, {
      ...project,
      companyContext: nextContext,
      updatedAt: now,
    });

    return NextResponse.json({ context: saved.project.companyContext });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    if (message.includes("Unknown field") || message.includes("locked")) {
      return NextResponse.json({ error: message }, { status: 400 });
    }
    logger.error("[startup-os.projects.context.PATCH] Failed to upsert company context field", {
      organizationId: requestContext.orgId,
      userId: requestContext.auth.userId,
      projectId: decodedProjectId,
      error: message,
    });
    return NextResponse.json({ error: "Failed to update the company context." }, { status: 500 });
  }
}

/**
 * AI-fill a single field. Honest about keys: without a configured provider this
 * returns `{ needsProvider: true }` (200) instead of fabricating a value. With a
 * provider, the model fills the field (provenance "ai") and the tower persists.
 */
export async function POST(request: Request, context: RouteContext) {
  const requestContext = await getRequestContext(request);
  if ("response" in requestContext) return requestContext.response;

  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const parsed = GenerateFieldSchema.safeParse(payload);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid generate request.", details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  if (!hasStartupOSAIProviderKey()) {
    return NextResponse.json({ needsProvider: true }, { status: 200 });
  }

  const { projectId } = await context.params;
  const decodedProjectId = decodeURIComponent(projectId);

  try {
    const project = await getStartupProject(
      requestContext.db,
      requestContext.orgId,
      decodedProjectId,
    );
    if (project === null) {
      return NextResponse.json({ error: "Startup OS project not found." }, { status: 404 });
    }

    const now = new Date().toISOString();
    const tower = ensureTower(project.companyContext, decodedProjectId, now);
    const value = await generateField({
      context: tower,
      layerId: parsed.data.layerId,
      fieldKey: parsed.data.fieldKey,
      invokeModel: invokeGenerateModel,
    });
    if (value === null) {
      return NextResponse.json({ error: "The model returned no value." }, { status: 502 });
    }

    const repo = new InMemoryCompanyContextRepository();
    repo.save(tower);
    const nextContext = repo.upsertField(
      tower.projectId,
      parsed.data.layerId,
      parsed.data.fieldKey,
      value,
      { provenance: "ai", now },
    );

    const saved = await saveStartupProjectRecord(requestContext.db, requestContext.orgId, {
      ...project,
      companyContext: nextContext,
      updatedAt: now,
    });

    return NextResponse.json({ context: saved.project.companyContext });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    logger.error("[startup-os.projects.context.POST] Failed to generate company context field", {
      organizationId: requestContext.orgId,
      userId: requestContext.auth.userId,
      projectId: decodedProjectId,
      error: message,
    });
    return NextResponse.json({ error: "Failed to generate the field." }, { status: 500 });
  }
}
