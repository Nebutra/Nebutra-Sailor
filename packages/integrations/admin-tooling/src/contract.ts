/**
 * Canonical REST contract for external admin tooling (Retool, Forest Admin,
 * Appsmith, in-house). Every adapter speaks this shape so the underlying
 * tool can be swapped without touching server handlers.
 *
 * The contract is intentionally small:
 *   - List: read with pagination + sort + filter
 *   - Mutate: create / update / delete / soft-delete with a REQUIRED human
 *     reason so audit logs have intent attached.
 */

import { z } from "zod";

export const SortOrderSchema = z.enum(["asc", "desc"]);
export type SortOrder = z.infer<typeof SortOrderSchema>;

export const SortSpecSchema = z.object({
  field: z.string().min(1),
  order: SortOrderSchema.default("asc"),
});
export type SortSpec = z.infer<typeof SortSpecSchema>;

/**
 * Filter is a flat key→primitive map. Keep it shallow on purpose — adapters
 * translate it into their native query DSL. Deep filters belong in custom
 * resource endpoints, not the generic list contract.
 */
export const FilterMapSchema = z.record(
  z.string(),
  z.union([z.string(), z.number(), z.boolean(), z.null()]),
);
export type FilterMap = z.infer<typeof FilterMapSchema>;

export const ListResourceRequestSchema = z.object({
  resource: z.string().min(1),
  page: z.number().int().min(1).default(1),
  pageSize: z.number().int().min(1).max(200).default(25),
  sort: z.array(SortSpecSchema).optional(),
  filter: FilterMapSchema.optional(),
});
export type ListResourceRequest = z.infer<typeof ListResourceRequestSchema>;

export function makeListResourceResponseSchema<T extends z.ZodTypeAny>(item: T) {
  return z.object({
    items: z.array(item),
    total: z.number().int().min(0),
    page: z.number().int().min(1),
    pageSize: z.number().int().min(1),
  });
}
export type ListResourceResponse<T> = {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
};

export const MutationOpSchema = z.enum(["create", "update", "delete", "soft-delete"]);
export type MutationOp = z.infer<typeof MutationOpSchema>;

export const MutateResourceRequestSchema = z
  .object({
    resource: z.string().min(1),
    op: MutationOpSchema,
    id: z.string().min(1).optional(),
    payload: z.record(z.string(), z.unknown()).optional(),
    /**
     * Required free-form justification. Surfaced verbatim in the audit log.
     * Empty strings rejected — admins must explain *why*, not just *what*.
     */
    reason: z.string().trim().min(3, "reason must explain the change"),
  })
  .superRefine((val, ctx) => {
    if ((val.op === "update" || val.op === "delete" || val.op === "soft-delete") && !val.id) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: `op "${val.op}" requires id`,
        path: ["id"],
      });
    }
    if ((val.op === "create" || val.op === "update") && !val.payload) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: `op "${val.op}" requires payload`,
        path: ["payload"],
      });
    }
  });
export type MutateResourceRequest = z.infer<typeof MutateResourceRequestSchema>;

export const MutateResourceResponseSchema = z.object({
  success: z.literal(true),
  resource: z.string(),
  op: MutationOpSchema,
  id: z.string(),
  audit_log_id: z.string().nullable(),
});
export type MutateResourceResponse = z.infer<typeof MutateResourceResponseSchema>;

/**
 * Standard error envelope. Adapters MUST translate native errors into this
 * shape so the admin tool gets predictable UX.
 */
export const ErrorEnvelopeSchema = z.object({
  success: z.literal(false),
  error: z.object({
    code: z.string().min(1),
    message: z.string().min(1),
    details: z.record(z.string(), z.unknown()).optional(),
  }),
});
export type ErrorEnvelope = z.infer<typeof ErrorEnvelopeSchema>;

export const ADMIN_TOOLING_ERROR_CODES = {
  VALIDATION: "admin.validation_failed",
  UNAUTHORIZED: "admin.unauthorized",
  FORBIDDEN: "admin.forbidden",
  NOT_FOUND: "admin.not_found",
  CONFLICT: "admin.conflict",
  RATE_LIMITED: "admin.rate_limited",
  INTERNAL: "admin.internal_error",
} as const;
export type AdminToolingErrorCode =
  (typeof ADMIN_TOOLING_ERROR_CODES)[keyof typeof ADMIN_TOOLING_ERROR_CODES];
