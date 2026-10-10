/**
 * Model names for the organization plugin on the Node (Prisma) adapter.
 *
 * Better Auth's Prisma adapter resolves a model as `prisma[modelName]`. The
 * plugin defaults are `organization`, `member` and `invitation`:
 * - `member` and `invitation` have no Prisma delegate, so every membership
 *   call threw "Model member does not exist in the database" —
 *   `/api/auth/organization/list` answered 500 and `getUserOrganizations`
 *   returned `[]` on the Node path.
 * - `organization` resolved to the legacy `Organization` model
 *   (`public.organizations`, which requires a `clerk_id` Better Auth never
 *   sends), not to Better Auth's own table.
 *
 * The edge (edge-organization-config.ts) and the gateway (`bAMember` in
 * routes/kcq/scope.ts) already read `better_auth.organization` / `member` /
 * `invitation`. This makes the Node path use the same three tables — a pure
 * name mapping; Prisma fields carry their own `@map` to the snake_case columns.
 */
export const NODE_ORGANIZATION_SCHEMA = {
  organization: { modelName: "bAOrganization" },
  member: { modelName: "bAMember" },
  invitation: { modelName: "bAInvitation" },
} as const;
