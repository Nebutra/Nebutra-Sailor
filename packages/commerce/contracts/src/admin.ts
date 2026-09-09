import { z } from "zod";

/**
 * Admin Contract — `nebutra.admin/v1`.
 *
 * Every Nebutra SaaS exposes one manifest describing the admin surface it
 * owns: resources (nouns), actions (audited verbs, plan → apply), signals
 * (probed facts) and policies (actions the system runs by itself). The
 * platform admin renders any product from its manifest; an agent derives
 * tools from it. Nothing product-specific lives in the renderer.
 *
 * See docs/plans/2026-09-08-admin-of-admins-model.md.
 */

export const ADMIN_CONTRACT_VERSION = "nebutra.admin/v1" as const;

/** One status vocabulary. `unknown` is first-class and never renders green. */
export const AdminStatusSchema = z.enum(["healthy", "degraded", "down", "unknown"]);
export type AdminStatus = z.infer<typeof AdminStatusSchema>;

/** One role ladder; product roles map onto it, staff grants mean the same everywhere. */
export const StaffRoleSchema = z.enum([
  "platform_readonly",
  "platform_support",
  "platform_operator",
  "platform_owner",
]);
export type StaffRole = z.infer<typeof StaffRoleSchema>;
export const STAFF_ROLE_RANK: Record<StaffRole, number> = {
  platform_readonly: 0,
  platform_support: 1,
  platform_operator: 2,
  platform_owner: 3,
};
export function roleAtLeast(role: StaffRole, required: StaffRole): boolean {
  return STAFF_ROLE_RANK[role] >= STAFF_ROLE_RANK[required];
}

export const AdminSeveritySchema = z.enum(["info", "warn", "critical"]);
export type AdminSeverity = z.infer<typeof AdminSeveritySchema>;

/** The canonical eleven. A product declares the subset it has. */
export const AdminDomainIdSchema = z.enum([
  "identity",
  "access",
  "commerce",
  "usage",
  "catalog",
  "operations",
  "integrations",
  "trust",
  "support",
  "growth",
  "settings",
  // Platform-only cross-cutting domain: shared AI supply (router).
  "supply",
]);
export type AdminDomainId = z.infer<typeof AdminDomainIdSchema>;

const IdSchema = z
  .string()
  .min(1)
  .max(64)
  .regex(/^[a-z][a-z0-9._-]*$/, "ids are lowercase dotted identifiers");
const UrlPathSchema = z.string().min(1).regex(/^\//, "contract urls are origin-relative paths");

export const AdminColumnSchema = z.object({
  key: z.string().min(1),
  label: z.string().min(1),
  kind: z.enum(["text", "mono", "status", "badge", "number", "time", "link"]).default("text"),
  /** Right-align numbers; the renderer does not guess from values. */
  align: z.enum(["start", "end"]).default("start"),
});
export type AdminColumn = z.infer<typeof AdminColumnSchema>;

export const AdminResourceSchema = z.object({
  id: IdSchema,
  label: z.string().min(1),
  /** `GET list` → ResourceList */
  list: UrlPathSchema,
  /** `GET detail` with `{id}` placeholder → one item */
  detail: UrlPathSchema.optional(),
  columns: z.array(AdminColumnSchema).min(1),
  /** Column key that identifies a row. */
  key: z.string().min(1).default("id"),
  search: z.boolean().default(false),
  /** Action ids applicable per row. */
  actions: z.array(IdSchema).default([]),
});
export type AdminResource = z.infer<typeof AdminResourceSchema>;

export const AdminActionSchema = z.object({
  id: IdSchema,
  verb: z.string().min(1),
  /** Resource the action belongs to; omitted = domain-level action. */
  resource: IdSchema.optional(),
  /** Minimum staff role. Read-only tier never sees write controls. */
  role: StaffRoleSchema,
  /** `POST url` with ActionRequest (`mode: plan | apply`). */
  url: UrlPathSchema,
  /** Plan step is mandatory; `false` only for idempotent, non-destructive refreshes. */
  plan: z.boolean().default(true),
  destructive: z.boolean().default(false),
  /** JSON Schema for `input`; doubles as the MCP tool inputSchema. */
  input: z.record(z.string(), z.unknown()).optional(),
  description: z.string().optional(),
});
export type AdminAction = z.infer<typeof AdminActionSchema>;

export const AdminSignalSchema = z.object({
  id: IdSchema,
  label: z.string().min(1),
  severity: AdminSeveritySchema,
  /** `GET probe` → SignalReading. Probed, never configured. */
  probe: UrlPathSchema,
  resource: IdSchema.optional(),
  /** Action that resolves the signal when raised. */
  action: IdSchema.optional(),
});
export type AdminSignal = z.infer<typeof AdminSignalSchema>;

export const AdminPolicySchema = z.object({
  id: IdSchema,
  label: z.string().min(1),
  /** Event name (`nebutra/<domain>.<thing>.<verb>`) that triggers the policy. */
  on: z.string().min(1),
  runs: IdSchema,
  enabled: z.boolean().default(true),
  /** Natural-language intent the policy was compiled from, when it was. */
  intent: z.string().optional(),
});
export type AdminPolicy = z.infer<typeof AdminPolicySchema>;

export const AdminDomainSchema = z.object({
  id: AdminDomainIdSchema,
  label: z.string().min(1),
  resources: z.array(AdminResourceSchema).default([]),
  actions: z.array(AdminActionSchema).default([]),
  signals: z.array(AdminSignalSchema).default([]),
  policies: z.array(AdminPolicySchema).default([]),
  /** Product-owned browser surface for what the generic renderer cannot express. */
  slot: UrlPathSchema.optional(),
});
export type AdminDomain = z.infer<typeof AdminDomainSchema>;

export const AdminManifestSchema = z
  .object({
    contract: z.literal(ADMIN_CONTRACT_VERSION),
    product: IdSchema,
    label: z.string().min(1),
    version: z.string().min(1),
    /** Absolute origin every relative url resolves against. */
    origin: z.string().url(),
    graph: z.enum(["core", "runtime", "labs"]),
    status: z.enum(["stable", "foundation", "wip", "experimental"]),
    /** `GET health` → @nebutra/health HealthCheckResult. */
    health: UrlPathSchema,
    /** `GET audit?…` → audit events (nebutra.audit/v1). */
    audit: UrlPathSchema.optional(),
    domains: z.array(AdminDomainSchema).min(1),
  })
  .superRefine((m, ctx) => {
    for (const d of m.domains) {
      const actionIds = new Set(d.actions.map((a) => a.id));
      const resourceIds = new Set(d.resources.map((r) => r.id));
      for (const r of d.resources) {
        for (const a of r.actions) {
          if (!actionIds.has(a)) {
            ctx.addIssue({
              code: "custom",
              message: `resource ${r.id} references unknown action ${a}`,
            });
          }
        }
      }
      for (const s of d.signals) {
        if (s.action && !actionIds.has(s.action)) {
          ctx.addIssue({
            code: "custom",
            message: `signal ${s.id} references unknown action ${s.action}`,
          });
        }
        if (s.resource && !resourceIds.has(s.resource)) {
          ctx.addIssue({
            code: "custom",
            message: `signal ${s.id} references unknown resource ${s.resource}`,
          });
        }
      }
      for (const p of d.policies) {
        if (!actionIds.has(p.runs)) {
          ctx.addIssue({ code: "custom", message: `policy ${p.id} runs unknown action ${p.runs}` });
        }
      }
    }
  });
export type AdminManifest = z.infer<typeof AdminManifestSchema>;

// -----------------------------------------------------------------------------
// Wire envelopes
// -----------------------------------------------------------------------------

export const ResourceListSchema = z.object({
  items: z.array(z.record(z.string(), z.unknown())),
  total: z.number().int().min(0),
  /** When the list was produced from live probes; omitted for pure reads. */
  probedAt: z.string().datetime().optional(),
});
export type ResourceList = z.infer<typeof ResourceListSchema>;

export const ActionRequestSchema = z.discriminatedUnion("mode", [
  z.object({ mode: z.literal("plan"), input: z.record(z.string(), z.unknown()).default({}) }),
  z.object({
    mode: z.literal("apply"),
    input: z.record(z.string(), z.unknown()).default({}),
    /** Required when the action is destructive; ties the apply to a reviewed plan. */
    planId: z.string().min(1).optional(),
  }),
]);
export type ActionRequest = z.infer<typeof ActionRequestSchema>;

export const PlanDiffEntrySchema = z.object({
  op: z.enum(["add", "remove", "change"]),
  path: z.string().min(1),
  from: z.unknown().optional(),
  to: z.unknown().optional(),
});
export const ActionPlanSchema = z.object({
  planId: z.string().min(1),
  summary: z.string().min(1),
  diff: z.array(PlanDiffEntrySchema),
  affected: z
    .array(z.object({ resource: IdSchema, id: z.string(), label: z.string().optional() }))
    .default([]),
  warnings: z.array(z.string()).default([]),
  /** Plans expire; an apply after this is refused. */
  expiresAt: z.string().datetime(),
});
export type ActionPlan = z.infer<typeof ActionPlanSchema>;

export const ActionResultSchema = z.object({
  /** Audit event id written by the product for this apply. */
  auditId: z.string().min(1),
  summary: z.string().min(1),
  result: z.record(z.string(), z.unknown()).optional(),
});
export type ActionResult = z.infer<typeof ActionResultSchema>;

export const SignalReadingSchema = z.object({
  id: IdSchema,
  status: z.enum(["ok", "raised", "unknown"]),
  severity: AdminSeveritySchema,
  probedAt: z.string().datetime(),
  title: z.string().optional(),
  detail: z.string().optional(),
  resource: IdSchema.optional(),
  action: IdSchema.optional(),
  data: z.record(z.string(), z.unknown()).optional(),
});
export type SignalReading = z.infer<typeof SignalReadingSchema>;

/** Standard error body for contract endpoints. */
export const AdminErrorSchema = z.object({
  error: z.object({
    code: z.enum([
      "unauthenticated",
      "forbidden",
      "not_found",
      "invalid_input",
      "plan_required",
      "plan_expired",
      "upstream_unavailable",
      "internal",
    ]),
    message: z.string(),
  }),
});
export type AdminError = z.infer<typeof AdminErrorSchema>;

/** Validate an apply against its action: destructive applies must reference a plan. */
export function assertApplyAllowed(action: AdminAction, request: ActionRequest): AdminError | null {
  if (request.mode !== "apply") return null;
  if ((action.destructive || action.plan) && !request.planId) {
    return {
      error: {
        code: "plan_required",
        message: `${action.id} requires a reviewed plan before apply`,
      },
    };
  }
  return null;
}

/** Resolve a contract path against the manifest origin. */
export function resolveContractUrl(manifest: Pick<AdminManifest, "origin">, path: string): string {
  return new URL(path, manifest.origin).toString();
}
