import "server-only";

import { type AdminError, type AdminResource, cdnSafeStatus } from "@nebutra/contracts/admin";
import { z } from "zod";
import { ContractError, listResource, loadManifest } from "./contract-client";
import { requireStaff, StaffAccessError } from "./staff";

/**
 * Browser → product resource list. Same door as the action route, read side:
 * the caller must be platform staff, the resource must be declared in the
 * product's manifest, and the upstream call is signed with the caller's role.
 * Used by client components that need to poll (e.g. a sign-in in progress).
 */
export const ContractResourceQuerySchema = z.object({
  serviceId: z.string().min(1),
  resourceId: z.string().min(1),
});

type ErrorCode = AdminError["error"]["code"] | "network";

const STATUS_FOR_CODE: Record<ErrorCode, number> = {
  unauthenticated: 401,
  forbidden: 403,
  not_found: 404,
  invalid_input: 400,
  plan_required: 409,
  plan_expired: 409,
  upstream_unavailable: 503,
  internal: 500,
  network: 503,
};

function errorResponse(code: ErrorCode, message: string, status: number): Response {
  return Response.json({ error: { code, message } }, { status });
}

export function findResource(
  domains: ReadonlyArray<{ resources: AdminResource[] }>,
  resourceId: string,
): AdminResource | null {
  for (const domain of domains) {
    const hit = domain.resources.find((r) => r.id === resourceId);
    if (hit) return hit;
  }
  return null;
}

export async function handleContractResource(raw: unknown): Promise<Response> {
  const parsed = ContractResourceQuerySchema.safeParse(raw);
  if (!parsed.success) return errorResponse("invalid_input", parsed.error.message, 400);
  const { serviceId, resourceId } = parsed.data;

  try {
    const staff = await requireStaff();
    const manifest = await loadManifest(serviceId);
    if (!manifest) return errorResponse("not_found", `${serviceId} has no manifest`, 404);
    const resource = findResource(manifest.domains, resourceId);
    if (!resource) return errorResponse("not_found", `unknown resource ${resourceId}`, 404);
    const list = await listResource(manifest, resource.list, {
      userId: staff.userId,
      role: staff.role,
    });
    return Response.json(list, { headers: { "cache-control": "no-store" } });
  } catch (error) {
    if (error instanceof StaffAccessError) return errorResponse("forbidden", error.message, 403);
    if (error instanceof ContractError) {
      return errorResponse(
        error.code,
        error.message,
        cdnSafeStatus(error.status, STATUS_FOR_CODE[error.code]),
      );
    }
    return errorResponse("internal", error instanceof Error ? error.message : "internal", 500);
  }
}
