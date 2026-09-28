import { z } from "zod";
import { getStatusKv } from "./store";

const INCIDENTS_KEY = "status:incidents:v1";

export const incidentImpactSchema = z.enum(["none", "minor", "major", "critical"]);
export const incidentStatusSchema = z.enum([
  "investigating",
  "identified",
  "monitoring",
  "resolved",
]);

/**
 * An incident is reported after the fact; maintenance is announced before it.
 * Maintenance status follows its window (scheduled → in progress → completed)
 * unless it is resolved early, so nobody has to remember to flip it.
 */
export const incidentKindSchema = z.enum(["incident", "maintenance"]);

export const incidentUpdateSchema = z.object({
  at: z.string().datetime(),
  status: incidentStatusSchema,
  message: z.string().min(1).max(4000),
});

export const statusIncidentSchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1).max(200),
  impact: incidentImpactSchema,
  status: incidentStatusSchema,
  message: z.string().min(1).max(4000),
  affectedServiceIds: z.array(z.string()).default([]),
  updates: z.array(incidentUpdateSchema).default([]),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
  resolvedAt: z.string().datetime().optional(),
  kind: incidentKindSchema.default("incident"),
  scheduledStart: z.string().datetime().optional(),
  scheduledEnd: z.string().datetime().optional(),
});

export type StatusIncident = z.infer<typeof statusIncidentSchema>;
export type IncidentStatus = z.infer<typeof incidentStatusSchema>;
export type IncidentImpact = z.infer<typeof incidentImpactSchema>;
export type IncidentKind = z.infer<typeof incidentKindSchema>;

export const createIncidentInputSchema = z.object({
  title: z.string().min(1).max(200),
  impact: incidentImpactSchema.default("minor"),
  status: incidentStatusSchema.default("investigating"),
  message: z.string().min(1).max(4000),
  affectedServiceIds: z.array(z.string()).default([]),
  kind: incidentKindSchema.default("incident"),
  scheduledStart: z.string().datetime().optional(),
  scheduledEnd: z.string().datetime().optional(),
});

export const updateIncidentInputSchema = z.object({
  id: z.string().min(1),
  status: incidentStatusSchema.optional(),
  impact: incidentImpactSchema.optional(),
  message: z.string().min(1).max(4000).optional(),
  affectedServiceIds: z.array(z.string()).optional(),
});

async function readAll(): Promise<StatusIncident[]> {
  const raw = await getStatusKv().get(INCIDENTS_KEY);
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw) as unknown;
    const result = z.array(statusIncidentSchema).safeParse(parsed);
    return result.success ? result.data : [];
  } catch {
    return [];
  }
}

async function writeAll(incidents: StatusIncident[]): Promise<void> {
  await getStatusKv().set(INCIDENTS_KEY, JSON.stringify(incidents));
}

export async function listIncidents(): Promise<StatusIncident[]> {
  const all = await readAll();
  return all.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}

export async function getIncident(id: string): Promise<StatusIncident | null> {
  return (await readAll()).find((i) => i.id === id) ?? null;
}

/** Open incidents only — maintenance is listed by `listMaintenance`. */
export async function listActiveIncidents(): Promise<StatusIncident[]> {
  return (await listIncidents()).filter((i) => i.kind === "incident" && i.status !== "resolved");
}

export type MaintenancePhase = "scheduled" | "in_progress" | "completed";

export function maintenancePhase(
  incident: StatusIncident,
  now: Date = new Date(),
): MaintenancePhase {
  if (incident.status === "resolved") return "completed";
  const t = now.getTime();
  if (incident.scheduledEnd && t >= Date.parse(incident.scheduledEnd)) return "completed";
  if (incident.scheduledStart && t < Date.parse(incident.scheduledStart)) return "scheduled";
  return "in_progress";
}

/** Maintenance that has not finished, soonest first. */
export async function listOpenMaintenance(now: Date = new Date()): Promise<StatusIncident[]> {
  return (await listIncidents())
    .filter((i) => i.kind === "maintenance" && maintenancePhase(i, now) !== "completed")
    .sort((a, b) =>
      (a.scheduledStart ?? a.createdAt).localeCompare(b.scheduledStart ?? b.createdAt),
    );
}

export async function createIncident(
  input: z.input<typeof createIncidentInputSchema>,
  now: Date = new Date(),
): Promise<StatusIncident> {
  const parsed = createIncidentInputSchema.parse(input);
  const at = now.toISOString();
  const incident: StatusIncident = {
    id: crypto.randomUUID(),
    title: parsed.title,
    impact: parsed.impact,
    status: parsed.status,
    message: parsed.message,
    affectedServiceIds: parsed.affectedServiceIds,
    kind: parsed.kind,
    ...(parsed.scheduledStart ? { scheduledStart: parsed.scheduledStart } : {}),
    ...(parsed.scheduledEnd ? { scheduledEnd: parsed.scheduledEnd } : {}),
    updates: [{ at, status: parsed.status, message: parsed.message }],
    createdAt: at,
    updatedAt: at,
    ...(parsed.status === "resolved" ? { resolvedAt: at } : {}),
  };
  const all = await readAll();
  all.unshift(incident);
  await writeAll(all);
  return incident;
}

export async function updateIncident(
  input: z.input<typeof updateIncidentInputSchema>,
  now: Date = new Date(),
): Promise<StatusIncident | null> {
  const parsed = updateIncidentInputSchema.parse(input);
  const all = await readAll();
  const index = all.findIndex((i) => i.id === parsed.id);
  if (index < 0) return null;

  const current = all[index] as StatusIncident;
  const at = now.toISOString();
  const nextStatus = parsed.status ?? current.status;
  const nextMessage = parsed.message ?? current.message;
  const updated: StatusIncident = {
    ...current,
    status: nextStatus,
    impact: parsed.impact ?? current.impact,
    message: nextMessage,
    affectedServiceIds: parsed.affectedServiceIds ?? current.affectedServiceIds,
    updates: [
      ...current.updates,
      ...(parsed.status || parsed.message
        ? [{ at, status: nextStatus, message: nextMessage }]
        : []),
    ],
    updatedAt: at,
    resolvedAt: nextStatus === "resolved" ? (current.resolvedAt ?? at) : current.resolvedAt,
  };

  all[index] = updated;
  await writeAll(all);
  return updated;
}

/** Group incidents by UTC calendar day for the past-N-days feed. */
export function groupIncidentsByDay(
  incidents: StatusIncident[],
  dayKeys: string[],
): Record<string, StatusIncident[]> {
  const set = new Set(dayKeys);
  const out: Record<string, StatusIncident[]> = Object.fromEntries(dayKeys.map((d) => [d, []]));

  for (const incident of incidents) {
    const day = incident.createdAt.slice(0, 10);
    if (!set.has(day)) continue;
    const bucket = out[day];
    if (bucket) bucket.push(incident);
  }
  return out;
}
