import "server-only";

import { verifyServiceToken } from "@nebutra/auth";
import {
  type AdminError,
  roleAtLeast,
  type StaffRole,
  StaffRoleSchema,
} from "@nebutra/contracts/admin";

/**
 * Contract endpoints are called service-to-service by the platform admin
 * (and later by agents). The caller signs `x-service-token` (HS256,
 * SERVICE_SECRET) whose claims must match `x-user-id` / `x-role` field for
 * field — the same primitive the gateway trusts. The role must be on the
 * staff ladder; product roles never reach this surface.
 */
export interface StaffCaller {
  userId: string;
  role: StaffRole;
}

export type StaffGate =
  | { ok: true; caller: StaffCaller }
  | { ok: false; status: 401 | 403; body: AdminError };

export async function gateStaff(
  request: Request,
  required: StaffRole = "platform_readonly",
): Promise<StaffGate> {
  const token = request.headers.get("x-service-token") ?? undefined;
  const userId = request.headers.get("x-user-id") ?? "";
  const roleRaw = request.headers.get("x-role") ?? "";
  const role = StaffRoleSchema.safeParse(roleRaw);
  if (!token || !userId || !role.success) {
    return {
      ok: false,
      status: 401,
      body: err("unauthenticated", "Missing or malformed service token."),
    };
  }
  const valid = await verifyServiceToken(token, userId, undefined, role.data, undefined);
  if (!valid) {
    return { ok: false, status: 401, body: err("unauthenticated", "Service token rejected.") };
  }
  if (!roleAtLeast(role.data, required)) {
    return { ok: false, status: 403, body: err("forbidden", `Requires ${required}.`) };
  }
  return { ok: true, caller: { userId, role: role.data } };
}

export function err(code: AdminError["error"]["code"], message: string): AdminError {
  return { error: { code, message } };
}

export function json(body: unknown, status = 200): Response {
  return Response.json(body, { status, headers: { "cache-control": "no-store" } });
}
