import "server-only";

import {
  type ActionRequest,
  type AdminAction,
  type AdminError,
  cdnSafeStatus,
  roleAtLeast,
} from "@nebutra/contracts/admin";
import { z } from "zod";
import { applyAction, ContractError, loadManifest, planAction } from "./contract-client";
import { requireStaff, StaffAccessError } from "./staff";

/**
 * The one door from the browser to a product action. Resolves the staff
 * caller, finds the action in the product's manifest, refuses anything above
 * the caller's role BEFORE the product is contacted, then forwards plan/apply
 * signed with that role. The product enforces the ladder again; this check
 * exists so a read-only tier never produces an upstream call at all.
 */
export const ContractActionBodySchema = z.object({
  serviceId: z.string().min(1),
  actionId: z.string().min(1),
  mode: z.enum(["plan", "apply"]),
  planId: z.string().min(1).optional(),
  input: z.record(z.string(), z.unknown()).default({}),
});
export type ContractActionBody = z.infer<typeof ContractActionBodySchema>;

type ErrorCode = AdminError["error"]["code"] | "network";

function errorResponse(code: ErrorCode, message: string, status: number): Response {
  return Response.json({ error: { code, message } }, { status });
}

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

export function findAction(
  domains: ReadonlyArray<{ actions: AdminAction[] }>,
  actionId: string,
): AdminAction | null {
  for (const domain of domains) {
    const hit = domain.actions.find((a) => a.id === actionId);
    if (hit) return hit;
  }
  return null;
}

export async function handleContractAction(raw: unknown): Promise<Response> {
  const parsed = ContractActionBodySchema.safeParse(raw);
  if (!parsed.success) return errorResponse("invalid_input", parsed.error.message, 400);
  const body = parsed.data;

  try {
    const staff = await requireStaff();
    const manifest = await loadManifest(body.serviceId);
    if (!manifest) return errorResponse("not_found", `${body.serviceId} has no manifest`, 404);
    const action = findAction(manifest.domains, body.actionId);
    if (!action) return errorResponse("not_found", `unknown action ${body.actionId}`, 404);
    if (!roleAtLeast(staff.role, action.role)) {
      return errorResponse("forbidden", `${action.id} requires ${action.role}`, 403);
    }
    if (body.mode === "apply" && action.plan && !body.planId) {
      return errorResponse("plan_required", `${action.id} requires a reviewed plan`, 409);
    }
    const caller = { userId: staff.userId, role: staff.role };
    const request: ActionRequest =
      body.mode === "plan"
        ? { mode: "plan", input: body.input }
        : { mode: "apply", input: body.input, ...(body.planId ? { planId: body.planId } : {}) };
    const result =
      request.mode === "plan"
        ? await planAction(manifest, action.url, request.input, caller)
        : await applyAction(manifest, action.url, request.input, request.planId, caller);
    return Response.json(result);
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
