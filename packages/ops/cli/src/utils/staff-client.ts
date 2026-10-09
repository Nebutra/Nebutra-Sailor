import { getBrandOrigin } from "@nebutra/brand/metadata-helpers";
import { resolveAccessToken } from "./credentials-store";

/**
 * The client half of the platform staff surface (`/api/v1/platform/staff`).
 * `nebutra admin staff` is the only caller here; the MCP tools carry their own
 * copy of the same four requests because @nebutra/mcp cannot depend on the CLI.
 * Neither reads PlatformStaff itself: the gateway is the one implementation.
 */

export const STAFF_ROLES = [
  "platform_owner",
  "platform_operator",
  "platform_support",
  "platform_readonly",
] as const;
export type StaffRole = (typeof STAFF_ROLES)[number];

/** `owner` and `PLATFORM_OWNER` both mean platform_owner. Anything else is null. */
export function parseStaffRole(input: string): StaffRole | null {
  const v = input.trim().toLowerCase();
  const full = v.startsWith("platform_") ? v : `platform_${v}`;
  return (STAFF_ROLES as readonly string[]).includes(full) ? (full as StaffRole) : null;
}

export interface StaffGrant {
  userId: string;
  email: string | null;
  name: string | null;
  role: StaffRole;
  active: boolean;
  grantedAt: string;
  grantedBy: { userId: string; email: string | null } | null;
  revokedAt: string | null;
  note: string | null;
  auditId?: string | null;
}

export interface StaffStanding extends Partial<StaffGrant> {
  userId: string;
  role: StaffRole;
  canGrant: boolean;
  canRevoke: boolean;
}

export class StaffApiError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    message: string,
  ) {
    super(message);
    this.name = "StaffApiError";
  }
}

export interface StaffClientDeps {
  fetch?: typeof fetch;
  /** The bearer token; defaults to the `nebutra login` session. Never printed. */
  token?: () => Promise<string | null>;
  baseUrl?: string;
}

async function defaultToken(): Promise<string | null> {
  const resolved = await resolveAccessToken();
  return resolved && !resolved.expired ? resolved.token : null;
}

export function staffApiBase(): string {
  return (process.env.NEBUTRA_API_URL ?? getBrandOrigin("api")).replace(/\/+$/, "");
}

export function createStaffClient(deps: StaffClientDeps = {}) {
  const doFetch = deps.fetch ?? fetch;
  const getToken = deps.token ?? defaultToken;

  async function request<T>(method: string, path: string, body?: unknown): Promise<T> {
    const token = await getToken();
    if (!token) {
      throw new StaffApiError(401, "not_logged_in", "Not logged in. Run `nebutra login` first.");
    }
    const res = await doFetch(`${deps.baseUrl ?? staffApiBase()}/api/v1/platform/staff${path}`, {
      method,
      headers: {
        authorization: `Bearer ${token}`,
        ...(body === undefined ? {} : { "content-type": "application/json" }),
      },
      ...(body === undefined ? {} : { body: JSON.stringify(body) }),
      signal: AbortSignal.timeout(15_000),
    });
    const payload = (await res.json().catch(() => null)) as Record<string, unknown> | null;
    if (!res.ok) {
      const code = typeof payload?.code === "string" ? payload.code : `http_${res.status}`;
      const message =
        typeof payload?.error === "string" ? payload.error : `The gateway answered ${res.status}.`;
      throw new StaffApiError(res.status, code, message);
    }
    return payload as T;
  }

  return {
    list: async () => (await request<{ staff: StaffGrant[] }>("GET", "")).staff,
    me: () => request<StaffStanding>("GET", "/me"),
    grant: (input: { email: string; role: StaffRole; note: string }) =>
      request<StaffGrant>("POST", "", input),
    revoke: (email: string, note: string) =>
      request<StaffGrant>("POST", `/${encodeURIComponent(email)}/revoke`, { note }),
  };
}

export type StaffClient = ReturnType<typeof createStaffClient>;
