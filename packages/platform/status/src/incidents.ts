import { z } from "zod";
import { getStatusKv } from "./store";

/**
 * One hash field per incident, so a write touches only its own incident.
 * v1 kept every incident in one JSON blob: two concurrent writes lost one of
 * them, and a blob that failed validation read as [] — after which the next
 * write replaced the whole history with a single incident.
 */
const INCIDENTS_KEY = "status:incidents:v2";
const LEGACY_INCIDENTS_KEY = "status:incidents:v1";

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

function parseIncident(raw: string): StatusIncident | null {
  try {
    const result = statusIncidentSchema.safeParse(JSON.parse(raw));
    return result.success ? result.data : null;
  } catch {
    return null;
  }
}

/** Copy v1 blob entries into the per-incident hash. The v1 key is left in place. */
async function migrateLegacy(): Promise<StatusIncident[]> {
  const kv = getStatusKv();
  const raw = await kv.get(LEGACY_INCIDENTS_KEY);
  if (!raw) return [];
  let entries: unknown[];
  try {
    const parsed = JSON.parse(raw) as unknown;
    entries = Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
  const incidents: StatusIncident[] = [];
  for (const entry of entries) {
    const result = statusIncidentSchema.safeParse(entry);
    if (!result.success) continue;
    incidents.push(result.data);
    await kv.hset(INCIDENTS_KEY, result.data.id, JSON.stringify(result.data));
  }
  return incidents;
}

async function readAll(): Promise<StatusIncident[]> {
  const fields = await getStatusKv().hgetall(INCIDENTS_KEY);
  const raws = Object.values(fields);
  if (raws.length === 0) return migrateLegacy();
  // An unreadable entry is skipped on its own; it never hides the rest.
  return raws.map(parseIncident).filter((i): i is StatusIncident => i !== null);
}

async function writeOne(incident: StatusIncident): Promise<void> {
  await getStatusKv().hset(INCIDENTS_KEY, incident.id, JSON.stringify(incident));
}

async function readOne(id: string): Promise<StatusIncident | null> {
  const fields = await getStatusKv().hgetall(INCIDENTS_KEY);
  if (Object.keys(fields).length === 0) {
    return (await migrateLegacy()).find((i) => i.id === id) ?? null;
  }
  const raw = fields[id];
  return raw ? parseIncident(raw) : null;
}

export async function listIncidents(): Promise<StatusIncident[]> {
  const all = await readAll();
  return all.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}

export async function getIncident(id: string): Promise<StatusIncident | null> {
  return readOne(id);
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
  await writeOne(incident);
  return incident;
}

export async function updateIncident(
  input: z.input<typeof updateIncidentInputSchema>,
  now: Date = new Date(),
): Promise<StatusIncident | null> {
  const parsed = updateIncidentInputSchema.parse(input);
  const current = await readOne(parsed.id);
  if (!current) return null;

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

  await writeOne(updated);
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
