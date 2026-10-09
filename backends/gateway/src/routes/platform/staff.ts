import { createRoute, OpenAPIHono, z } from "@hono/zod-openapi";
import { auditLogger } from "@nebutra/audit";
import { type PlatformStaffRole as DbRole, getSystemDb } from "@nebutra/db";
import {
  canPlatform,
  normalizePlatformStaffRole,
  PLATFORM_STAFF_ROLES,
  type PlatformStaffRole,
  platformRoleHierarchy,
} from "@nebutra/permissions";
import { PlatformStaffRepository, StaffGuardError, type StaffRow } from "@nebutra/repositories";
import type { Context } from "hono";
import { resolveCallerUserId } from "../../lib/caller-identity.js";
import {
  type PlatformStaffCaller,
  type PlatformStaffEnv,
  requirePlatformRole,
} from "../../middlewares/platformStaff.js";

/**
 * /api/v1/platform/staff — who may operate the platform itself.
 *
 * ONE canonical surface. The CLI (`nebutra admin staff`), the MCP tools
 * (`staff_*`) and the admin console all call these four endpoints; none of them
 * reads or writes PlatformStaff on its own, so the rules below are the rules.
 *
 *   GET  /            any ACTIVE staff   list every grant, tombstones included
 *   GET  /me          any ACTIVE staff   the caller's own standing
 *   POST /            platform_owner     grant (or change) a role; a note is required
 *   POST /:userId/revoke  platform_owner tombstone a grant; a note is required
 *
 * Authorisation is read from the PlatformStaff row on every request, never from
 * a role claim the caller sent: the admin console signs a role into its service
 * token, and that claim is deliberately not consulted here.
 *
 * Refusals that exist for safety, not just for permission:
 *   - nobody grants themselves anything (self_grant);
 *   - nobody grants a role above their own (escalation) — with one owner tier
 *     today this is vacuous, and stays so the day a tier is added above it;
 *   - the last active platform owner can be neither revoked nor demoted
 *     (last_owner), atomically, inside the repository's transaction.
 *
 * A tenant owner, a tenant admin, a valid session with no grant, a revoked
 * grant and an unrecognised role string are all the same answer: 403. Telling
 * them apart discloses who is staff.
 *
 * Template note: this route, the repository and the permissions ladder ship in
 * the customer template (a customer needs a platform owner for their own SaaS).
 * Only the console UI in apps/admin is instance-only.
 */

export interface StaffRouteDeps {
  repo: () => PlatformStaffRepository;
  caller: (c: Context) => Promise<string | null>;
  audit: typeof auditLogger;
}

const defaultDeps: StaffRouteDeps = {
  // AUDIT(no-tenant): PlatformStaff is platform-scope (@rls deny); the system client is correct.
  repo: () => new PlatformStaffRepository(getSystemDb()),
  caller: (c) => resolveCallerUserId(c as Context<{ Variables: { tenant?: { userId?: string } } }>),
  audit: auditLogger,
};

export const STAFF_AUDIT = {
  granted: "platform.staff.granted",
  revoked: "platform.staff.revoked",
} as const;

const errorSchema = z.object({ error: z.string(), code: z.string().optional() });

const grantBody = z
  .object({
    email: z.string().trim().email().optional(),
    userId: z.string().trim().min(1).optional(),
    role: z.string().trim().min(1),
    note: z.string().trim().min(3, "A note is required: say why.").max(500),
  })
  .refine((b) => Boolean(b.email) !== Boolean(b.userId), {
    message: "Give exactly one of email or userId.",
  });

const revokeBody = z.object({
  note: z.string().trim().min(3, "A note is required: say why.").max(500),
});

/** `ab***@example.com` — enough to recognise, not enough to harvest. */
export function maskEmail(email: string | null): string | null {
  if (!email) return null;
  const at = email.lastIndexOf("@");
  if (at < 1) return "***";
  const local = email.slice(0, at);
  return `${local.slice(0, Math.min(2, local.length))}***${email.slice(at)}`;
}

const toRole = (r: string): PlatformStaffRole => normalizePlatformStaffRole(r) as PlatformStaffRole;

export function staffJson(row: StaffRow) {
  return {
    userId: row.userId,
    email: maskEmail(row.email),
    name: row.name,
    role: toRole(row.role),
    active: row.revokedAt === null,
    grantedAt: row.grantedAt.toISOString(),
    grantedBy: row.grantedById
      ? { userId: row.grantedById, email: maskEmail(row.grantedByEmail) }
      : null,
    revokedAt: row.revokedAt ? row.revokedAt.toISOString() : null,
    note: row.note,
  };
}

type Staff = PlatformStaffCaller;

const guardStatus: Record<string, 404 | 409> = {
  last_owner: 409,
  already_revoked: 409,
  not_found: 404,
};

export function createPlatformStaffRoutes(deps: StaffRouteDeps = defaultDeps) {
  const routes = new OpenAPIHono<PlatformStaffEnv>();
  const guardDeps = { repo: deps.repo, caller: deps.caller };
  const canRead = requirePlatformRole(guardDeps, "read", "PlatformStaff");
  // A refused grant/revoke by someone with a live grant is audited as 'denied'.
  const deniedAudit =
    (action: string) =>
    async (c: Context, who: { userId: string; role: PlatformStaffRole | null }) => {
      const body = (await c.req.json().catch(() => ({}))) as Record<string, unknown>;
      const target = String(body.userId ?? body.email ?? c.req.param("userId") ?? "unknown");
      await audited(
        c,
        { userId: who.userId, role: who.role as PlatformStaffRole },
        {
          action,
          outcome: "denied",
          targetUserId: target,
          metadata: { role: body.role ?? null, note: body.note ?? null, reason: "forbidden" },
        },
      );
    };
  const canGrant = requirePlatformRole(
    { ...guardDeps, onDenied: deniedAudit(STAFF_AUDIT.granted) },
    "grant",
    "PlatformStaff",
  );
  const canRevoke = requirePlatformRole(
    { ...guardDeps, onDenied: deniedAudit(STAFF_AUDIT.revoked) },
    "revoke",
    "PlatformStaff",
  );

  async function audited(
    c: Context,
    staff: Staff,
    input: {
      action: string;
      outcome: "success" | "denied" | "failure";
      targetUserId: string;
      metadata: Record<string, unknown>;
    },
  ): Promise<string | null> {
    return deps
      .audit(c.req.raw, { actor: { id: staff.userId, type: "user" }, tenantId: "system" })
      .log({
        action: input.action,
        outcome: input.outcome,
        severity: "warning",
        resource: { type: "platform_staff", id: input.targetUserId },
        metadata: input.metadata,
      });
  }

  const staffSchema = z.object({}).passthrough().openapi("PlatformStaffGrant");

  routes.openapi(
    createRoute({
      method: "get",
      path: "/",
      tags: ["Platform"],
      summary: "List platform staff grants (active staff only)",
      middleware: [canRead] as const,
      responses: {
        200: {
          description: "Grants",
          content: { "application/json": { schema: z.object({ staff: z.array(staffSchema) }) } },
        },
        401: {
          description: "Not signed in",
          content: { "application/json": { schema: errorSchema } },
        },
        403: { description: "Not staff", content: { "application/json": { schema: errorSchema } } },
      },
    }),
    async (c) => {
      const rows = await deps.repo().list();
      return c.json({ staff: rows.map(staffJson) }, 200);
    },
  );

  routes.openapi(
    createRoute({
      method: "get",
      path: "/me",
      tags: ["Platform"],
      summary: "The caller's own platform standing",
      middleware: [canRead] as const,
      responses: {
        200: {
          description: "Standing",
          content: { "application/json": { schema: z.object({}).passthrough() } },
        },
        401: {
          description: "Not signed in",
          content: { "application/json": { schema: errorSchema } },
        },
        403: { description: "Not staff", content: { "application/json": { schema: errorSchema } } },
      },
    }),
    async (c) => {
      const staff = c.get("platformStaff");
      const row = await deps.repo().get(staff.userId);
      return c.json(
        {
          ...(row ? staffJson(row) : { userId: staff.userId, role: staff.role }),
          canGrant: canPlatform(staff.role, "grant", "PlatformStaff"),
          canRevoke: canPlatform(staff.role, "revoke", "PlatformStaff"),
        },
        200,
      );
    },
  );

  routes.openapi(
    createRoute({
      method: "post",
      path: "/",
      tags: ["Platform"],
      summary: "Grant or change a platform staff role (platform_owner only)",
      middleware: [canGrant] as const,
      request: { body: { content: { "application/json": { schema: grantBody } } } },
      responses: {
        201: {
          description: "Granted",
          content: { "application/json": { schema: z.object({}).passthrough() } },
        },
        400: { description: "Invalid", content: { "application/json": { schema: errorSchema } } },
        401: {
          description: "Not signed in",
          content: { "application/json": { schema: errorSchema } },
        },
        403: { description: "Refused", content: { "application/json": { schema: errorSchema } } },
        404: {
          description: "No such user",
          content: { "application/json": { schema: errorSchema } },
        },
        409: { description: "Guard", content: { "application/json": { schema: errorSchema } } },
      },
    }),
    async (c) => {
      const staff = c.get("platformStaff");
      const body = c.req.valid("json");
      const repo = deps.repo();

      const role = normalizePlatformStaffRole(body.role);
      if (!role) {
        return c.json(
          {
            error: `Unknown role. Use one of: ${PLATFORM_STAFF_ROLES.join(", ")}.`,
            code: "invalid_role",
          },
          400,
        );
      }

      const target = body.userId
        ? await repo.findUserById(body.userId)
        : await repo.findUserByEmail(body.email as string);
      const targetKey = target?.id ?? body.userId ?? body.email ?? "unknown";
      const attempt = {
        role,
        note: body.note,
        targetEmail: maskEmail(target?.email ?? body.email ?? null),
      };

      const refuse = async (code: string, error: string) => {
        await audited(c, staff, {
          action: STAFF_AUDIT.granted,
          outcome: "denied",
          targetUserId: targetKey,
          metadata: { ...attempt, reason: code },
        });
        return c.json({ error, code }, 403);
      };

      if (target?.id === staff.userId) {
        return refuse("self_grant", "Nobody grants themselves a role.");
      }
      if (!platformRoleHierarchy(staff.role).includes(role)) {
        return refuse("escalation", `Role ${staff.role} may not grant ${role}.`);
      }
      if (!target) {
        return c.json(
          {
            error: "No account with that email or id. They must sign up first.",
            code: "no_such_user",
          },
          404,
        );
      }

      try {
        const { row, previous } = await repo.grant({
          userId: target.id,
          role: role.toUpperCase() as DbRole,
          grantedById: staff.userId,
          note: body.note,
        });
        const auditId = await audited(c, staff, {
          action: STAFF_AUDIT.granted,
          outcome: "success",
          targetUserId: target.id,
          metadata: {
            ...attempt,
            previousRole: previous ? toRole(previous.role) : null,
            previouslyRevoked: previous?.revokedAt != null,
          },
        });
        return c.json({ ...staffJson(row), auditId }, 201);
      } catch (error) {
        if (error instanceof StaffGuardError) {
          await audited(c, staff, {
            action: STAFF_AUDIT.granted,
            outcome: "denied",
            targetUserId: target.id,
            metadata: { ...attempt, reason: error.reason },
          });
          return c.json(
            { error: error.message, code: error.reason },
            guardStatus[error.reason] ?? 409,
          );
        }
        throw error;
      }
    },
  );

  routes.openapi(
    createRoute({
      method: "post",
      path: "/{userId}/revoke",
      tags: ["Platform"],
      summary: "Revoke a platform staff grant by tombstone (platform_owner only)",
      middleware: [canRevoke] as const,
      request: {
        params: z.object({ userId: z.string().min(1) }),
        body: { content: { "application/json": { schema: revokeBody } } },
      },
      responses: {
        200: {
          description: "Revoked",
          content: { "application/json": { schema: z.object({}).passthrough() } },
        },
        401: {
          description: "Not signed in",
          content: { "application/json": { schema: errorSchema } },
        },
        403: { description: "Refused", content: { "application/json": { schema: errorSchema } } },
        404: {
          description: "Never staff",
          content: { "application/json": { schema: errorSchema } },
        },
        409: { description: "Guard", content: { "application/json": { schema: errorSchema } } },
      },
    }),
    async (c) => {
      const staff = c.get("platformStaff");
      const { userId: param } = c.req.valid("param");
      const { note } = c.req.valid("json");
      const repo = deps.repo();

      // The path carries a user id; an email is accepted so a person or an agent
      // that only knows the address can name them (list masks emails).
      const target = param.includes("@") ? await repo.findUserByEmail(param) : { id: param };
      if (!target)
        return c.json({ error: "No account with that email.", code: "no_such_user" }, 404);

      try {
        const row = await repo.revoke({ userId: target.id, note });
        const auditId = await audited(c, staff, {
          action: STAFF_AUDIT.revoked,
          outcome: "success",
          targetUserId: target.id,
          metadata: { note, revokedRole: toRole(row.role), selfRevoke: target.id === staff.userId },
        });
        return c.json({ ...staffJson(row), auditId }, 200);
      } catch (error) {
        if (error instanceof StaffGuardError) {
          await audited(c, staff, {
            action: STAFF_AUDIT.revoked,
            outcome: "denied",
            targetUserId: target.id,
            metadata: { note, reason: error.reason },
          });
          return c.json(
            { error: error.message, code: error.reason },
            guardStatus[error.reason] ?? 409,
          );
        }
        throw error;
      }
    },
  );

  return routes;
}

export const platformStaffRoutes = createPlatformStaffRoutes();
