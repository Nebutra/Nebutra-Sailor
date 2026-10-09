import "server-only";

import { signServiceToken } from "@nebutra/auth";
import { brand } from "@nebutra/brand/metadata";

/**
 * The console's only way to read or change PlatformStaff: the gateway's staff
 * endpoints, the same ones `nebutra admin staff` and the MCP tools call. The
 * console holds no staff rules of its own (owner-only, no self-grant, no
 * last-owner removal, the audit entry); it asks, and shows the answer.
 *
 * Identity: Cloudflare Access proved who this is (see ./staff); the request is
 * then signed as that person with the service secret, the same primitive the
 * contract calls use. The gateway takes the user id from the verified token and
 * authorises it against the PlatformStaff row, ignoring the role claim.
 */

export interface StaffGrantView {
  userId: string;
  email: string | null;
  name: string | null;
  role: string;
  active: boolean;
  grantedAt: string;
  grantedBy: { userId: string; email: string | null } | null;
  revokedAt: string | null;
  note: string | null;
  auditId?: string | null;
}

export type StaffApiResult<T> =
  | { ok: true; data: T }
  | { ok: false; status: number; code: string; message: string };

export interface StaffCaller {
  userId: string;
  role: string;
}

export function gatewayOrigin(): string {
  const override = process.env.ADMIN_GATEWAY_URL?.trim();
  return (override || `https://${brand.domains.api}`).replace(/\/+$/, "");
}

async function call<T>(
  caller: StaffCaller,
  method: "GET" | "POST",
  path: string,
  body: unknown,
  fetchImpl: typeof fetch,
): Promise<StaffApiResult<T>> {
  let res: Response;
  try {
    const token = await signServiceToken({ userId: caller.userId, role: caller.role });
    res = await fetchImpl(`${gatewayOrigin()}/api/v1/platform/staff${path}`, {
      method,
      headers: {
        "x-service-token": token,
        "x-user-id": caller.userId,
        "x-role": caller.role,
        accept: "application/json",
        ...(body === undefined ? {} : { "content-type": "application/json" }),
      },
      ...(body === undefined ? {} : { body: JSON.stringify(body) }),
      signal: AbortSignal.timeout(15_000),
      cache: "no-store",
    });
  } catch (error) {
    return {
      ok: false,
      status: 503,
      code: "network",
      message: error instanceof Error ? error.message : "The gateway is unreachable.",
    };
  }
  const payload = (await res.json().catch(() => null)) as Record<string, unknown> | null;
  if (!res.ok) {
    return {
      ok: false,
      status: res.status,
      code: typeof payload?.code === "string" ? payload.code : `http_${res.status}`,
      message:
        typeof payload?.error === "string" ? payload.error : `The gateway answered ${res.status}.`,
    };
  }
  return { ok: true, data: payload as T };
}

export function listStaffGrants(caller: StaffCaller, fetchImpl: typeof fetch = fetch) {
  return call<{ staff: StaffGrantView[] }>(caller, "GET", "", undefined, fetchImpl);
}

export function grantStaffRole(
  caller: StaffCaller,
  input: { email: string; role: string; note: string },
  fetchImpl: typeof fetch = fetch,
) {
  return call<StaffGrantView>(caller, "POST", "", input, fetchImpl);
}

export function revokeStaffGrant(
  caller: StaffCaller,
  userId: string,
  note: string,
  fetchImpl: typeof fetch = fetch,
) {
  return call<StaffGrantView>(
    caller,
    "POST",
    `/${encodeURIComponent(userId)}/revoke`,
    { note },
    fetchImpl,
  );
}
