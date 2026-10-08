/** Physical mappings for the auth edge's Kysely adapter; Prisma owns the schema. */
export const EDGE_ORGANIZATION_OPTIONS = {
  // Organization provisioning remains in the canonical Node product service.
  allowUserToCreateOrganization: false,
  disableOrganizationDeletion: true,
  schema: {
    session: { fields: { activeOrganizationId: "active_organization_id" } },
    organization: {
      modelName: "better_auth.organization",
      fields: { createdAt: "created_at" },
    },
    member: {
      modelName: "better_auth.member",
      fields: { userId: "user_id", organizationId: "organization_id", createdAt: "created_at" },
    },
    invitation: {
      modelName: "better_auth.invitation",
      fields: {
        organizationId: "organization_id",
        inviterId: "inviter_id",
        expiresAt: "expires_at",
        createdAt: "created_at",
      },
    },
  },
};

/** Only the membership-backed workspace selection surface ships on the edge. */
export function isEdgeOrganizationSelectionPath(path: string): boolean {
  return new Set([
    "/api/auth/organization/list",
    "/api/auth/organization/set-active",
    "/api/auth/organization/get-full-organization",
    "/api/auth/organization/get-active-member",
  ]).has(path.replace(/\/$/, ""));
}
