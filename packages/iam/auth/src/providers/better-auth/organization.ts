import type { OrganizationCapability, SetActiveResult } from "../../types";
import { normalizeOrganization } from "./mappers";
import type { BetterAuthApi } from "./types";

// ─── Capability builders (Phase 1.3) ───
//
// Each builder maps the canonical AuthProvider capability shape onto Better
// Auth's plugin endpoints surfaced via `auth.api`. The builders are called
// only when the capability probe confirmed the corresponding plugin is
// mounted, so callers can assume the named endpoints exist.

export function buildOrganizationsCapability(
  getApi: () => Promise<BetterAuthApi>,
): OrganizationCapability {
  return {
    async create({ name, slug, metadata }) {
      const api = await getApi();
      const fn = api.createOrganization;
      if (!fn) throw new Error("Better Auth: createOrganization endpoint missing.");
      const raw = (await fn({
        body: {
          name,
          slug: slug ?? name.toLowerCase().replace(/\s+/g, "-"),
          ...(metadata !== undefined ? { metadata } : {}),
        },
      })) as Record<string, unknown> | null;
      if (!raw) throw new Error("Better Auth: createOrganization returned null.");
      return normalizeOrganization(raw);
    },

    async list(userId, request) {
      const api = await getApi();
      const fn = api.listOrganizations;
      if (!fn) return [];
      const raw = (await fn({
        query: { userId },
        ...(request ? { headers: request.headers } : {}),
      })) as unknown;
      const rawRecord = raw && typeof raw === "object" && !Array.isArray(raw) ? raw : null;
      const items = Array.isArray(raw)
        ? raw
        : rawRecord &&
            "data" in rawRecord &&
            Array.isArray((rawRecord as Record<string, unknown>).data)
          ? ((rawRecord as Record<string, unknown>).data as unknown[])
          : rawRecord &&
              "organizations" in rawRecord &&
              Array.isArray((rawRecord as Record<string, unknown>).organizations)
            ? ((rawRecord as Record<string, unknown>).organizations as unknown[])
            : [];
      return items
        .filter((org): org is Record<string, unknown> => Boolean(org) && typeof org === "object")
        .map(normalizeOrganization);
    },

    async setActive(req, organizationId): Promise<SetActiveResult> {
      const api = await getApi();
      const fn = api.setActiveOrganization;
      if (!fn) {
        throw new Error("Better Auth: setActiveOrganization endpoint missing.");
      }
      // BA expects headers for session resolution and body for the org id.
      // `returnHeaders: true` flips BA's API into the `{ headers, response }`
      // shape so we can forward its `Set-Cookie` (rotating the session token
      // to bind it to the new active org) up to the HTTP layer.
      const raw = (await fn({
        headers: req.headers,
        body: { organizationId },
        returnHeaders: true,
      })) as { headers?: unknown; response?: unknown } | null | undefined;

      // Normalize: BA returns a Headers instance in normal builds, but some
      // transports / older versions surface a plain record. Either way we
      // hand back a real Headers so callers can `new Response(..., result)`.
      const rawHeaders = raw?.headers;
      const headers =
        rawHeaders instanceof Headers
          ? rawHeaders
          : new Headers((rawHeaders as Record<string, string> | undefined) ?? {});
      return { headers };
    },

    async invite({ email, organizationId, role }) {
      const api = await getApi();
      const fn = api.createInvitation;
      if (!fn) {
        throw new Error("Better Auth: createInvitation endpoint missing.");
      }
      const raw = (await fn({
        body: {
          email,
          organizationId,
          ...(role ? { role } : {}),
        },
      })) as { id?: string; invitationId?: string } | null;
      const invitationId = raw?.id ?? raw?.invitationId;
      if (!invitationId) {
        throw new Error("Better Auth: createInvitation returned no invitation id.");
      }
      return { invitationId: String(invitationId) };
    },

    async acceptInvite(invitationId, userId) {
      const api = await getApi();
      const fn = api.acceptInvitation;
      if (!fn) {
        throw new Error("Better Auth: acceptInvitation endpoint missing.");
      }
      const raw = (await fn({
        body: { invitationId, userId },
      })) as { organizationId?: string; organization?: { id?: string } } | null;
      const organizationId = raw?.organizationId ?? raw?.organization?.id;
      if (!organizationId) {
        throw new Error("Better Auth: acceptInvitation returned no organizationId.");
      }
      return { organizationId: String(organizationId) };
    },

    async members(organizationId) {
      const api = await getApi();
      const fn = api.listMembers;
      if (!fn) return [];
      const raw = (await fn({ query: { organizationId } })) as Array<
        Record<string, unknown>
      > | null;
      if (!raw) return [];
      return raw.map((m) => ({
        userId: String(m.userId ?? m.id ?? ""),
        role: String(m.role ?? ""),
        joinedAt: m.createdAt
          ? new Date(m.createdAt as string | number)
          : m.joinedAt
            ? new Date(m.joinedAt as string | number)
            : new Date(),
      }));
    },

    async removeMember(organizationId, userId) {
      const api = await getApi();
      const fn = api.removeMember;
      if (!fn) throw new Error("Better Auth: removeMember endpoint missing.");
      await fn({ body: { organizationId, userId, memberIdOrEmail: userId } });
    },

    async updateMemberRole(organizationId, userId, role) {
      const api = await getApi();
      const fn = api.updateMemberRole;
      if (!fn) throw new Error("Better Auth: updateMemberRole endpoint missing.");
      await fn({ body: { organizationId, userId, role, memberId: userId } });
    },
  };
}
