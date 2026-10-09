import { getBrandOrigin } from "@nebutra/brand/metadata-helpers";

/**
 * Platform staff for an agent (the same surface as `nebutra admin staff`):
 * list who may operate the platform, grant a role, revoke one.
 *
 * The gateway (`/api/v1/platform/staff`) is the one implementation; these tools
 * only translate. It authorises the CALLER from the PlatformStaff table, so the
 * session in `NEBUTRA_TOKEN` (the `nebutra login` token, passed along by
 * `nebutra mcp`) must belong to an active platform owner for the mutations. The
 * rules (owner-only, no self-grant, no removing the last owner, audit entry)
 * live there and are not repeated here.
 *
 * Mutations need `confirm: true`, and a tool call without it does NOTHING: no
 * request is made. An agent must have the person's agreement first, because
 * these calls change who can read across every tenant.
 */

export const STAFF_ROLES = [
  "platform_owner",
  "platform_operator",
  "platform_support",
  "platform_readonly",
] as const;

const ROLE_HELP =
  "platform_owner (grants and revokes staff, releases, flags), platform_operator (supply, queues, tenant suspension), platform_support (tenant lookup, impersonation, invites), platform_readonly (dashboards only).";

export const STAFF_TOOLS = [
  {
    name: "staff_list",
    description:
      "List every platform staff grant, including revoked ones (revokedAt set). Emails are masked. Works for any active platform staff; use it to check who has access before proposing a change. Read-only.",
    inputSchema: { type: "object", properties: {}, required: [] },
    annotations: { readOnlyHint: true },
  },
  {
    name: "staff_grant",
    description: `Give a person a platform staff role, or change their role. Only an active platform_owner may call this; nobody can grant themselves a role. The person must already have a Nebutra account. This widens who can operate the platform: ask the human to approve the exact email and role first, then call with confirm=true. Without confirm=true nothing happens. Returns the stored grant and an auditId. Roles: ${ROLE_HELP}`,
    inputSchema: {
      type: "object",
      properties: {
        email: { type: "string", description: "Account email of the person receiving the role." },
        role: { type: "string", enum: [...STAFF_ROLES], description: "The role to grant." },
        note: {
          type: "string",
          description: "Why (ticket, rotation, on-call handover). Required, kept with the grant.",
        },
        confirm: {
          type: "boolean",
          description: "Must be true, and only after the human approved this exact change.",
        },
      },
      required: ["email", "role", "note", "confirm"],
    },
    annotations: { destructiveHint: true },
  },
  {
    name: "staff_revoke",
    description:
      "End a person's platform staff access (the grant is kept as a tombstone, never deleted). Only an active platform_owner may call this. The last active platform_owner cannot be revoked: grant another owner first. Ask the human to approve the exact email first, then call with confirm=true. Without confirm=true nothing happens. Returns the tombstoned grant and an auditId.",
    inputSchema: {
      type: "object",
      properties: {
        email: { type: "string", description: "Account email of the person losing access." },
        note: { type: "string", description: "Why the access ends. Required." },
        confirm: {
          type: "boolean",
          description: "Must be true, and only after the human approved this exact change.",
        },
      },
      required: ["email", "note", "confirm"],
    },
    annotations: { destructiveHint: true },
  },
];

export interface StaffToolDeps {
  fetch?: typeof fetch;
  token?: () => string | undefined;
  baseUrl?: () => string;
}

type ToolResult = { content: Array<{ type: "text"; text: string }>; isError?: boolean };

const text = (value: unknown, isError = false): ToolResult => ({
  content: [
    { type: "text", text: typeof value === "string" ? value : JSON.stringify(value, null, 2) },
  ],
  ...(isError ? { isError: true } : {}),
});

export function isStaffTool(name: string): boolean {
  return name.startsWith("staff_");
}

export async function callStaffTool(
  name: string,
  args: Record<string, unknown>,
  deps: StaffToolDeps = {},
): Promise<ToolResult> {
  const str = (key: string) => (typeof args[key] === "string" ? (args[key] as string).trim() : "");
  const mutating = name === "staff_grant" || name === "staff_revoke";

  // Validate and gate BEFORE any network call.
  if (mutating) {
    if (!str("email")) return text("email is required.", true);
    if (str("note").length < 3) return text("note is required: say why.", true);
    if (name === "staff_grant" && !(STAFF_ROLES as readonly string[]).includes(str("role"))) {
      return text(`role must be one of: ${STAFF_ROLES.join(", ")}.`, true);
    }
    if (args.confirm !== true) {
      return text(
        `Refused: confirm must be true. Nothing was changed. Ask the person to approve ${
          name === "staff_grant"
            ? `granting ${str("role")} to ${str("email")}`
            : `revoking platform access for ${str("email")}`
        }, then call again with confirm=true.`,
        true,
      );
    }
  } else if (name !== "staff_list") {
    throw new Error(`Unknown tool: ${name}`);
  }

  const token = (deps.token ?? (() => process.env.NEBUTRA_TOKEN?.trim()))();
  if (!token) {
    return text("Not logged in. Run `nebutra login` (nebutra mcp passes the session on).", true);
  }
  const base = (deps.baseUrl?.() ?? process.env.NEBUTRA_API_URL ?? getBrandOrigin("api")).replace(
    /\/+$/,
    "",
  );
  const root = `${base}/api/v1/platform/staff`;

  const [path, body]: [string, unknown?] =
    name === "staff_list"
      ? [root]
      : name === "staff_grant"
        ? [root, { email: str("email"), role: str("role"), note: str("note") }]
        : [`${root}/${encodeURIComponent(str("email"))}/revoke`, { note: str("note") }];

  try {
    const res = await (deps.fetch ?? fetch)(path, {
      method: body === undefined ? "GET" : "POST",
      headers: {
        authorization: `Bearer ${token}`,
        ...(body === undefined ? {} : { "content-type": "application/json" }),
      },
      ...(body === undefined ? {} : { body: JSON.stringify(body) }),
      signal: AbortSignal.timeout(15_000),
    });
    const payload = (await res.json().catch(() => null)) as Record<string, unknown> | null;
    if (!res.ok) {
      const code = typeof payload?.code === "string" ? ` (${payload.code})` : "";
      return text(
        `${String(payload?.error ?? `The gateway answered ${res.status}.`)}${code}`,
        true,
      );
    }
    return text(payload);
  } catch (error) {
    return text(
      `Could not reach the gateway: ${error instanceof Error ? error.message : String(error)}`,
      true,
    );
  }
}
