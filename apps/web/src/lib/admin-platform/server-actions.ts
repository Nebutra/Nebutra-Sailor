"use server";

import type { ActionRequest, AdminAction, AdminResource } from "@nebutra/contracts/admin";
import { roleAtLeast } from "@nebutra/contracts/admin";
import { revalidatePath } from "next/cache";
import { cachedFleet } from "./console-data";
import {
  applyAction,
  ContractError,
  listResource,
  loadManifest,
  planAction,
} from "./contract-client";
import { requireStaff, StaffAccessError } from "./staff";

/**
 * The one door from the browser to a product action or resource list — ported
 * from apps/admin's `app/api/contract/{action,resource}/route.ts`.
 *
 * THESE ARE SERVER ACTIONS, NOT ROUTE HANDLERS, ON PURPOSE.
 *
 * `scripts/lint-route-handlers.mjs` keeps business endpoints out of
 * `apps/web` (they belong in `backends/gateway`) with a shrink-only
 * allowlist — no new `app/api/**\/route.ts` files. A Next Server Action is
 * not a route handler (it never appears under `app/api`, it is not in the
 * allowlist, and it is not reachable by an arbitrary HTTP client the way a
 * route is), so it is the correct shape here. Every one of these re-derives
 * `requireStaff()` itself — nothing upstream (the `/admin/platform` layout's
 * redirect) is trusted as the authorization; a stale layout render must not
 * grant a write.
 */

type ContractResult<T> =
  | { ok: true; data: T }
  | { ok: false; error: { code: string; message: string } };

function fail(error: unknown): { ok: false; error: { code: string; message: string } } {
  if (error instanceof StaffAccessError) {
    return { ok: false, error: { code: "forbidden", message: error.message } };
  }
  if (error instanceof ContractError) {
    return { ok: false, error: { code: error.code, message: error.message } };
  }
  return {
    ok: false,
    error: { code: "internal", message: error instanceof Error ? error.message : "internal" },
  };
}

function findAction(
  domains: ReadonlyArray<{ actions: AdminAction[] }>,
  actionId: string,
): AdminAction | null {
  for (const domain of domains) {
    const hit = domain.actions.find((a) => a.id === actionId);
    if (hit) return hit;
  }
  return null;
}

function findResource(
  domains: ReadonlyArray<{ resources: AdminResource[] }>,
  resourceId: string,
): AdminResource | null {
  for (const domain of domains) {
    const hit = domain.resources.find((r) => r.id === resourceId);
    if (hit) return hit;
  }
  return null;
}

export interface RunContractActionInput {
  serviceId: string;
  actionId: string;
  mode: "plan" | "apply";
  planId?: string | undefined;
  input?: Record<string, unknown>;
}

/** Plan or apply a manifest action. Mirrors `handleContractAction`. */
export async function runContractAction(
  body: RunContractActionInput,
): Promise<ContractResult<unknown>> {
  try {
    const staff = await requireStaff();
    const manifest = await loadManifest(body.serviceId);
    if (!manifest) {
      return {
        ok: false,
        error: { code: "not_found", message: `${body.serviceId} has no manifest` },
      };
    }
    const action = findAction(manifest.domains, body.actionId);
    if (!action) {
      return {
        ok: false,
        error: { code: "not_found", message: `unknown action ${body.actionId}` },
      };
    }
    if (!roleAtLeast(staff.role, action.role)) {
      return {
        ok: false,
        error: { code: "forbidden", message: `${action.id} requires ${action.role}` },
      };
    }
    const input = body.input ?? {};
    if (body.mode === "apply" && action.plan && !body.planId) {
      return {
        ok: false,
        error: { code: "plan_required", message: `${action.id} requires a reviewed plan` },
      };
    }
    const caller = { userId: staff.userId, role: staff.role };
    const request: ActionRequest =
      body.mode === "plan"
        ? { mode: "plan", input }
        : { mode: "apply", input, ...(body.planId ? { planId: body.planId } : {}) };
    const result =
      request.mode === "plan"
        ? await planAction(manifest, action.url, request.input, caller)
        : await applyAction(manifest, action.url, request.input, request.planId, caller);
    return { ok: true, data: result };
  } catch (error) {
    return fail(error);
  }
}

/** List a manifest resource. Mirrors `handleContractResource`. */
export async function runContractResource(
  serviceId: string,
  resourceId: string,
): Promise<ContractResult<unknown>> {
  try {
    const staff = await requireStaff();
    const manifest = await loadManifest(serviceId);
    if (!manifest) {
      return { ok: false, error: { code: "not_found", message: `${serviceId} has no manifest` } };
    }
    const resource = findResource(manifest.domains, resourceId);
    if (!resource) {
      return { ok: false, error: { code: "not_found", message: `unknown resource ${resourceId}` } };
    }
    const list = await listResource(manifest, resource.list, {
      userId: staff.userId,
      role: staff.role,
    });
    return { ok: true, data: list };
  } catch (error) {
    return fail(error);
  }
}

/** "Probe now" on the Fleet page — bypasses the 30s cache and re-renders. */
export async function probeFleetNow(): Promise<void> {
  await requireStaff();
  await cachedFleet(true);
  revalidatePath("/admin/platform/fleet");
}
