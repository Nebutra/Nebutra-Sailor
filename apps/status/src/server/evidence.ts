/**
 * Writing evidence: the one path every reading takes, whether it came from a
 * built-in monitor or was pushed by a caller (a synthetic journey, a device
 * fleet rollup, CI).
 */
import { z } from "zod";
import type { StatusDb } from "./db";
import type { ComponentState, EvidenceCoverage } from "./evaluate";

export const evidenceInputSchema = z.object({
  component: z.string().min(1).max(120),
  source: z
    .string()
    .min(1)
    .max(120)
    .regex(/^[a-z0-9][a-z0-9:._-]*$/i)
    .refine((s) => !s.startsWith("monitor:"), "monitor: is reserved for built-in monitors"),
  coverage: z.enum(["dependency", "synthetic", "device", "upstream", "manual"]),
  state: z.enum(["operational", "degraded", "outage", "maintenance", "unknown"]),
  checkedAt: z.string().datetime({ offset: true }).optional(),
  latencyMs: z.number().int().min(0).max(600_000).optional(),
  note: z.string().max(500).optional(),
  freshnessSeconds: z
    .number()
    .int()
    .min(10)
    .max(7 * 86_400),
});
export type EvidenceInput = z.infer<typeof evidenceInputSchema>;

export interface RecordEvidence {
  componentId: string;
  workspaceId: string;
  source: string;
  coverage: EvidenceCoverage;
  state: ComponentState;
  checkedAt: Date;
  latencyMs: number | null;
  note: string | null;
  freshnessSeconds: number;
}

export interface EvidenceChange {
  componentId: string;
  source: string;
  from: ComponentState | null;
  to: ComponentState;
}

function utcDay(date: Date): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
}

/**
 * Upsert the source's current reading and count it into the day. Returns the
 * change when the source's own state moved, so callers can alert on it.
 * An older reading than the stored one is ignored — pushes can arrive late.
 */
export async function recordEvidence(
  db: StatusDb,
  input: RecordEvidence,
): Promise<EvidenceChange | null> {
  return db.$transaction(async (tx) => {
    const previous = await tx.evidence.findUnique({
      where: { componentId_source: { componentId: input.componentId, source: input.source } },
    });
    if (previous && previous.checkedAt > input.checkedAt) return null;

    const succeeded = input.state === "operational";
    const data = {
      coverage: input.coverage,
      state: input.state,
      checkedAt: input.checkedAt,
      latencyMs: input.latencyMs,
      note: input.note,
      freshnessSeconds: input.freshnessSeconds,
      ...(succeeded ? { lastSuccessAt: input.checkedAt } : {}),
    };
    await tx.evidence.upsert({
      where: { componentId_source: { componentId: input.componentId, source: input.source } },
      create: {
        workspaceId: input.workspaceId,
        componentId: input.componentId,
        source: input.source,
        ...data,
      },
      update: data,
    });

    const day = utcDay(input.checkedAt);
    const bad = {
      degraded: input.state === "degraded" || input.state === "unknown" ? 1 : 0,
      outage: input.state === "outage" ? 1 : 0,
    };
    const latency =
      input.latencyMs == null ? { sum: 0n, count: 0 } : { sum: BigInt(input.latencyMs), count: 1 };
    await tx.dailyStat.upsert({
      where: { componentId_day: { componentId: input.componentId, day } },
      create: {
        componentId: input.componentId,
        day,
        total: 1,
        ...bad,
        latencySum: latency.sum,
        latencyCount: latency.count,
      },
      update: {
        total: { increment: 1 },
        degraded: { increment: bad.degraded },
        outage: { increment: bad.outage },
        latencySum: { increment: latency.sum },
        latencyCount: { increment: latency.count },
      },
    });

    const from = (previous?.state as ComponentState | undefined) ?? null;
    return from === input.state
      ? null
      : { componentId: input.componentId, source: input.source, from, to: input.state };
  });
}

/** Resolve a pushed reading's component key on a page, then record it. */
export async function pushEvidence(
  db: StatusDb,
  pageId: string,
  input: EvidenceInput,
  now: Date = new Date(),
): Promise<{ change: EvidenceChange | null } | { error: "unknown_component" }> {
  const component = await db.component.findUnique({
    where: { pageId_key: { pageId, key: input.component } },
    select: { id: true, workspaceId: true },
  });
  if (!component) return { error: "unknown_component" };
  const checkedAt = input.checkedAt ? new Date(input.checkedAt) : now;
  const change = await recordEvidence(db, {
    componentId: component.id,
    workspaceId: component.workspaceId,
    source: input.source,
    coverage: input.coverage,
    state: input.state,
    // A clock ahead of ours cannot make evidence fresher than "now".
    checkedAt: checkedAt > now ? now : checkedAt,
    latencyMs: input.latencyMs ?? null,
    note: input.note ?? null,
    freshnessSeconds: input.freshnessSeconds,
  });
  return { change };
}
