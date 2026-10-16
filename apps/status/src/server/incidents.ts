/**
 * Incidents and maintenance. Each write is one transaction on its own rows, so
 * two people updating different incidents never touch each other's data.
 */
import { z } from "zod";
import type { StatusDb } from "./db";

const impact = z.enum(["none", "minor", "major", "critical"]);
const status = z.enum(["investigating", "identified", "monitoring", "resolved"]);
const i18n = z.record(z.string().min(2).max(16), z.string().min(1).max(4000));

export const createIncidentSchema = z
  .object({
    kind: z.enum(["incident", "maintenance"]).default("incident"),
    title: z.string().trim().min(1).max(200),
    impact: impact.default("minor"),
    status: status.default("investigating"),
    message: z.string().trim().min(1).max(4000),
    messageI18n: i18n.optional(),
    components: z.array(z.string().min(1)).max(100).default([]),
    scheduledStart: z.string().datetime({ offset: true }).optional(),
    scheduledEnd: z.string().datetime({ offset: true }).optional(),
  })
  .refine((v) => v.kind === "incident" || (v.scheduledStart && v.scheduledEnd), {
    message: "Maintenance needs scheduledStart and scheduledEnd",
  })
  .refine((v) => !v.scheduledStart || !v.scheduledEnd || v.scheduledStart < v.scheduledEnd, {
    message: "scheduledEnd must be after scheduledStart",
  });

export const updateIncidentSchema = z.object({
  status: status.optional(),
  impact: impact.optional(),
  title: z.string().trim().min(1).max(200).optional(),
  message: z.string().trim().min(1).max(4000).optional(),
  messageI18n: i18n.optional(),
  components: z.array(z.string().min(1)).max(100).optional(),
});

export type CreateIncidentInput = z.input<typeof createIncidentSchema>;
export type UpdateIncidentInput = z.input<typeof updateIncidentSchema>;

async function componentIds(db: StatusDb, pageId: string, keys: string[]): Promise<string[]> {
  if (keys.length === 0) return [];
  const rows = await db.component.findMany({
    where: { pageId, key: { in: keys } },
    select: { id: true, key: true },
  });
  const missing = keys.filter((k) => !rows.some((r) => r.key === k));
  if (missing.length > 0) throw new IncidentError(`Unknown components: ${missing.join(", ")}`);
  return rows.map((r) => r.id);
}

export class IncidentError extends Error {}

const withDetail = {
  updates: { orderBy: { createdAt: "asc" as const } },
  components: { include: { component: { select: { key: true, name: true } } } },
};

export async function createIncident(
  db: StatusDb,
  page: { id: string; workspaceId: string },
  raw: CreateIncidentInput,
  now: Date = new Date(),
) {
  const input = createIncidentSchema.parse(raw);
  const ids = await componentIds(db, page.id, input.components);
  return db.incident.create({
    data: {
      workspaceId: page.workspaceId,
      pageId: page.id,
      kind: input.kind,
      title: input.title,
      impact: input.impact,
      status: input.status,
      scheduledStart: input.scheduledStart ? new Date(input.scheduledStart) : null,
      scheduledEnd: input.scheduledEnd ? new Date(input.scheduledEnd) : null,
      resolvedAt: input.status === "resolved" ? now : null,
      createdAt: now,
      updates: {
        create: {
          status: input.status,
          message: input.message,
          messageI18n: input.messageI18n,
          createdAt: now,
        },
      },
      components: { create: ids.map((componentId) => ({ componentId })) },
    },
    include: withDetail,
  });
}

/**
 * A status or message change appends to the timeline; impact, title and
 * component changes alone do not, so the public timeline only carries what
 * was said to customers.
 */
export async function updateIncident(
  db: StatusDb,
  pageId: string,
  incidentId: string,
  raw: UpdateIncidentInput,
  now: Date = new Date(),
) {
  const input = updateIncidentSchema.parse(raw);
  return db.$transaction(async (tx) => {
    const current = await tx.incident.findFirst({ where: { id: incidentId, pageId } });
    if (!current) return null;
    const nextStatus = input.status ?? current.status;
    if (input.components) {
      const ids = await componentIds(tx as unknown as StatusDb, pageId, input.components);
      await tx.incidentComponent.deleteMany({ where: { incidentId } });
      await tx.incidentComponent.createMany({
        data: ids.map((componentId) => ({ incidentId, componentId })),
      });
    }
    if (input.status || input.message) {
      const last = await tx.incidentUpdate.findFirst({
        where: { incidentId },
        orderBy: { createdAt: "desc" },
      });
      await tx.incidentUpdate.create({
        data: {
          incidentId,
          status: nextStatus,
          message: input.message ?? last?.message ?? current.title,
          messageI18n: input.messageI18n,
          createdAt: now,
        },
      });
    }
    return tx.incident.update({
      where: { id: incidentId },
      data: {
        status: nextStatus,
        ...(input.impact ? { impact: input.impact } : {}),
        ...(input.title ? { title: input.title } : {}),
        resolvedAt: nextStatus === "resolved" ? (current.resolvedAt ?? now) : null,
        updatedAt: now,
      },
      include: withDetail,
    });
  });
}

export type MaintenancePhase = "scheduled" | "in_progress" | "completed";

export function maintenancePhase(
  incident: { status: string; scheduledStart: Date | null; scheduledEnd: Date | null },
  now: Date,
): MaintenancePhase {
  if (incident.status === "resolved") return "completed";
  if (incident.scheduledEnd && now >= incident.scheduledEnd) return "completed";
  if (incident.scheduledStart && now < incident.scheduledStart) return "scheduled";
  return "in_progress";
}
