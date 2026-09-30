import { randomUUID } from "node:crypto";
import type { Prisma, PrismaClient } from "@nebutra/db";

/**
 * The supply capability probing seam (ADR 2026-09-30). One database access
 * point for every discovered source, its per-model capability/state rows and
 * the append-only probe event log — mirroring `RouterBillingRepository`'s
 * role for the money spine: `apps/router` and the Inngest scheduler both go
 * through this, never through Prisma directly.
 *
 * The state-transition *decision* is not here — that is
 * `@nebutra/router-supply`'s `applyOutcome` (pure, unit-tested without a
 * database). This class is the persistence half: it loads the row, calls the
 * pure function, and writes the result plus one event, in a transaction.
 */

export interface SupplySourceRow {
  readonly id: string;
  readonly key: string;
  readonly kind: string;
  readonly protocol: string;
  readonly label: string;
  readonly baseUrl: string;
  readonly credentialRef: string | null;
  readonly enabled: boolean;
  readonly lastDiscoveredAt: Date | null;
  readonly lastDiscoverySummary: unknown;
}

export interface UpsertSourceInput {
  readonly key: string;
  readonly kind: string;
  readonly protocol?: string;
  readonly label: string;
  readonly baseUrl: string;
  readonly credentialRef?: string | null;
  readonly enabled?: boolean;
}

export interface DiscoveredModelInput {
  readonly id: string;
  readonly modality: string;
  readonly capabilities?: Record<string, unknown> | null;
  readonly upstreamPrice?: Record<string, unknown> | null;
}

export interface DiscoveryDiff {
  readonly added: string[];
  readonly reappeared: string[];
  readonly vanished: string[];
  readonly unchanged: string[];
}

export interface SupplyCapabilityRow {
  readonly id: string;
  readonly sourceId: string;
  readonly sourceKey: string;
  readonly upstreamModel: string;
  readonly modality: string;
  readonly publicModel: string | null;
  readonly state: string;
  readonly stateReason: string | null;
  readonly pinned: boolean;
  readonly banned: boolean;
  readonly lastProbeAt: Date | null;
  readonly lastSuccessAt: Date | null;
  readonly lastFailureAt: Date | null;
  readonly nextProbeAt: Date | null;
  readonly vanishedAt: Date | null;
}

export interface RecordProbeInput {
  readonly sourceModelId: string;
  readonly kind: "ACTIVE_PROBE" | "PASSIVE_SIGNAL";
  readonly outcome: "success" | "failure";
  readonly reason?: string | null;
  readonly latencyMs?: number | null;
  readonly now?: Date;
}

export interface ModelAvailability {
  readonly sellable: boolean;
  readonly reason: string | null;
  readonly sources: string[];
}

function bareModelId(id: string): string {
  const i = id.lastIndexOf("/");
  return i >= 0 ? id.slice(i + 1) : id;
}

/** Sellable per `@nebutra/router-supply`'s `isSellableState`, restated locally so this package stays independent of the pure-logic package's build order in tests. */
function isSellable(state: string): boolean {
  return state === "AVAILABLE" || state === "DEGRADED";
}

/** A ban always wins; a pin forces AVAILABLE — the escape hatch, not the mechanism. */
function effective(state: string, pinned: boolean, banned: boolean): string {
  if (banned) return "SUSPENDED";
  if (pinned) return "AVAILABLE";
  return state;
}

export class RouterSupplyRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async upsertSource(input: UpsertSourceInput): Promise<SupplySourceRow> {
    const row = await this.prisma.supplySource.upsert({
      where: { key: input.key },
      create: {
        id: `supsrc_${randomUUID()}`,
        key: input.key,
        kind: input.kind as never,
        protocol: (input.protocol ?? "UNKNOWN") as never,
        label: input.label,
        baseUrl: input.baseUrl,
        credentialRef: input.credentialRef ?? null,
        enabled: input.enabled ?? true,
      },
      update: {
        label: input.label,
        baseUrl: input.baseUrl,
        ...(input.protocol ? { protocol: input.protocol as never } : {}),
        ...(input.credentialRef !== undefined ? { credentialRef: input.credentialRef } : {}),
        ...(input.enabled !== undefined ? { enabled: input.enabled } : {}),
      },
    });
    return toSourceRow(row);
  }

  async getSourceByKey(key: string): Promise<SupplySourceRow | null> {
    const row = await this.prisma.supplySource.findUnique({ where: { key } });
    return row ? toSourceRow(row) : null;
  }

  async listSources(): Promise<SupplySourceRow[]> {
    const rows = await this.prisma.supplySource.findMany({ orderBy: { key: "asc" } });
    return rows.map(toSourceRow);
  }

  /**
   * Apply one discovery run: upsert every model this pass found (creating new
   * rows as `PENDING`, defaulting `publicModel` to the bare upstream id — the
   * same 1:1 convention `router-supply/alias.ts`'s default alias table
   * already assumes), clear `vanishedAt` on any that reappeared, and mark
   * `vanishedAt` on every previously-seen, not-yet-vanished model this run did
   * not list. Nothing is ever deleted.
   */
  async applyDiscovery(
    sourceId: string,
    models: readonly DiscoveredModelInput[],
    now: Date = new Date(),
  ): Promise<DiscoveryDiff> {
    const existing = await this.prisma.supplySourceModel.findMany({
      where: { sourceId },
      select: { id: true, upstreamModel: true, vanishedAt: true },
    });
    const existingByModel = new Map(existing.map((r) => [r.upstreamModel, r]));
    const seen = new Set(models.map((m) => m.id));

    const added: string[] = [];
    const reappeared: string[] = [];
    const unchanged: string[] = [];

    for (const model of models) {
      const prior = existingByModel.get(model.id);
      if (!prior) {
        await this.prisma.supplySourceModel.create({
          data: {
            id: `supmod_${randomUUID()}`,
            sourceId,
            upstreamModel: model.id,
            modality: model.modality as never,
            publicModel: bareModelId(model.id),
            state: "PENDING",
            discoveredAt: now,
            ...(model.capabilities
              ? { capabilities: model.capabilities as Prisma.InputJsonValue }
              : {}),
            ...(model.upstreamPrice
              ? { upstreamPrice: model.upstreamPrice as Prisma.InputJsonValue }
              : {}),
          },
        });
        added.push(model.id);
        continue;
      }
      if (prior.vanishedAt) {
        await this.prisma.supplySourceModel.update({
          where: { id: prior.id },
          data: {
            vanishedAt: null,
            ...(model.capabilities
              ? { capabilities: model.capabilities as Prisma.InputJsonValue }
              : {}),
          },
        });
        reappeared.push(model.id);
      } else {
        if (model.capabilities) {
          await this.prisma.supplySourceModel.update({
            where: { id: prior.id },
            data: { capabilities: model.capabilities as Prisma.InputJsonValue },
          });
        }
        unchanged.push(model.id);
      }
    }

    const vanished: string[] = [];
    for (const row of existing) {
      if (!seen.has(row.upstreamModel) && !row.vanishedAt) {
        await this.prisma.supplySourceModel.update({
          where: { id: row.id },
          data: { vanishedAt: now },
        });
        vanished.push(row.upstreamModel);
      }
    }

    await this.prisma.supplySource.update({
      where: { id: sourceId },
      data: {
        lastDiscoveredAt: now,
        lastDiscoverySummary: {
          added: added.length,
          reappeared: reappeared.length,
          vanished: vanished.length,
          unchanged: unchanged.length,
        } as Prisma.InputJsonValue,
      },
    });

    return { added, reappeared, vanished, unchanged };
  }

  /**
   * Load the row, run the pure state machine (`@nebutra/router-supply`
   * `applyOutcome`, injected so this package does not depend on it directly),
   * write the new counters/state and one probe event, in a transaction.
   */
  async recordProbe(
    input: RecordProbeInput,
    applyOutcome: (
      counters: {
        state: string;
        consecutiveFailures: number;
        consecutiveSuccesses: number;
        backoffSeconds: number;
      },
      outcome: "success" | "failure",
      reason: string | null,
      now: Date,
    ) => {
      state: string;
      stateReason: string | null;
      consecutiveFailures: number;
      consecutiveSuccesses: number;
      backoffSeconds: number;
      nextProbeAt: Date | null;
      transitioned: boolean;
    },
  ): Promise<{ fromState: string; toState: string; transitioned: boolean }> {
    const now = input.now ?? new Date();
    return this.prisma.$transaction(async (tx) => {
      const row = await tx.supplySourceModel.findUniqueOrThrow({
        where: { id: input.sourceModelId },
      });
      const next = applyOutcome(
        {
          state: row.state,
          consecutiveFailures: row.consecutiveFailures,
          consecutiveSuccesses: row.consecutiveSuccesses,
          backoffSeconds: row.backoffSeconds,
        },
        input.outcome,
        input.reason ?? null,
        now,
      );

      await tx.supplySourceModel.update({
        where: { id: input.sourceModelId },
        data: {
          state: next.state as never,
          stateReason: next.stateReason,
          consecutiveFailures: next.consecutiveFailures,
          consecutiveSuccesses: next.consecutiveSuccesses,
          backoffSeconds: next.backoffSeconds,
          nextProbeAt: next.nextProbeAt,
          lastProbeAt: now,
          ...(input.outcome === "success" ? { lastSuccessAt: now } : { lastFailureAt: now }),
        },
      });

      await tx.supplyProbeEvent.create({
        data: {
          id: `supevt_${randomUUID()}`,
          sourceModelId: input.sourceModelId,
          at: now,
          kind: input.kind as never,
          outcome: (input.outcome === "success" ? "SUCCESS" : "FAILURE") as never,
          reason: input.reason ?? null,
          fromState: row.state as never,
          toState: next.state as never,
          latencyMs: input.latencyMs ?? null,
        },
      });

      return { fromState: row.state, toState: next.state, transitioned: next.transitioned };
    });
  }

  async setManualOverride(
    sourceModelId: string,
    override: { pinned?: boolean; banned?: boolean },
    now: Date = new Date(),
  ): Promise<void> {
    const row = await this.prisma.supplySourceModel.findUniqueOrThrow({
      where: { id: sourceModelId },
    });
    await this.prisma.supplySourceModel.update({
      where: { id: sourceModelId },
      data: {
        ...(override.pinned !== undefined ? { pinned: override.pinned } : {}),
        ...(override.banned !== undefined ? { banned: override.banned } : {}),
      },
    });
    await this.prisma.supplyProbeEvent.create({
      data: {
        id: `supevt_${randomUUID()}`,
        sourceModelId,
        at: now,
        kind: "MANUAL_OVERRIDE" as never,
        outcome: "SUCCESS" as never,
        reason: JSON.stringify(override),
        fromState: row.state as never,
        toState: row.state as never,
      },
    });
  }

  /** AVAILABLE/DEGRADED models with no probe in the last `idleMs` — the daily idle-verification sweep. */
  async listDueForActiveProbe(
    now: Date = new Date(),
    idleMs = 24 * 60 * 60 * 1000,
    limit = 200,
  ): Promise<SupplyCapabilityRow[]> {
    const cutoff = new Date(now.getTime() - idleMs);
    const rows = await this.prisma.supplySourceModel.findMany({
      where: {
        state: { in: ["AVAILABLE", "DEGRADED"] },
        vanishedAt: null,
        OR: [{ lastProbeAt: null }, { lastProbeAt: { lt: cutoff } }],
      },
      include: { source: true },
      orderBy: { lastProbeAt: "asc" },
      take: limit,
    });
    return rows.map(toCapabilityRow);
  }

  /** Suspended models whose backoff has elapsed — retried forever, never abandoned. */
  async listSuspendedDueForRetry(
    now: Date = new Date(),
    limit = 200,
  ): Promise<SupplyCapabilityRow[]> {
    const rows = await this.prisma.supplySourceModel.findMany({
      where: {
        state: "SUSPENDED",
        vanishedAt: null,
        OR: [{ nextProbeAt: null }, { nextProbeAt: { lte: now } }],
      },
      include: { source: true },
      orderBy: { nextProbeAt: "asc" },
      take: limit,
    });
    return rows.map(toCapabilityRow);
  }

  /** Passive-signal lookup: which capability row does this (source, upstream model) pair mean? */
  async findBySourceKeyAndUpstreamModel(
    sourceKey: string,
    upstreamModel: string,
  ): Promise<SupplyCapabilityRow | null> {
    const row = await this.prisma.supplySourceModel.findFirst({
      where: { upstreamModel, source: { key: sourceKey } },
      include: { source: true },
    });
    return row ? toCapabilityRow(row) : null;
  }

  async listCapabilities(filter?: {
    sourceId?: string;
    state?: string;
  }): Promise<SupplyCapabilityRow[]> {
    const rows = await this.prisma.supplySourceModel.findMany({
      where: {
        ...(filter?.sourceId ? { sourceId: filter.sourceId } : {}),
        ...(filter?.state ? { state: filter.state as never } : {}),
      },
      include: { source: true },
      orderBy: [{ publicModel: "asc" }, { upstreamModel: "asc" }],
    });
    return rows.map(toCapabilityRow);
  }

  /**
   * Shelf gate: a public model is sellable when *any* backing source-model
   * resolves (after pin/ban) to AVAILABLE or DEGRADED. A public model with no
   * row at all is not in this map — the caller decides the default (this
   * repository ships no opinion on "unknown", because the right default
   * differs between the shelf, which should fail open during rollout, and a
   * signal, which should flag it).
   */
  async availabilityFor(publicModels: readonly string[]): Promise<Map<string, ModelAvailability>> {
    if (publicModels.length === 0) return new Map();
    const rows = await this.prisma.supplySourceModel.findMany({
      where: { publicModel: { in: [...publicModels] }, vanishedAt: null },
      include: { source: true },
    });
    const byModel = new Map<string, typeof rows>();
    for (const row of rows) {
      const list = byModel.get(row.publicModel as string) ?? [];
      list.push(row);
      byModel.set(row.publicModel as string, list);
    }
    const result = new Map<string, ModelAvailability>();
    for (const [publicModel, group] of byModel) {
      let sellable = false;
      let reason: string | null = null;
      const sources: string[] = [];
      for (const row of group) {
        const state = effective(row.state, row.pinned, row.banned);
        if (isSellable(state)) {
          sellable = true;
          sources.push(row.source.key);
        } else if (!reason) {
          reason = row.stateReason;
        }
      }
      result.set(publicModel, { sellable, reason: sellable ? null : reason, sources });
    }
    return result;
  }
}

function toSourceRow(row: {
  id: string;
  key: string;
  kind: string;
  protocol: string;
  label: string;
  baseUrl: string;
  credentialRef: string | null;
  enabled: boolean;
  lastDiscoveredAt: Date | null;
  lastDiscoverySummary: unknown;
}): SupplySourceRow {
  return {
    id: row.id,
    key: row.key,
    kind: row.kind,
    protocol: row.protocol,
    label: row.label,
    baseUrl: row.baseUrl,
    credentialRef: row.credentialRef,
    enabled: row.enabled,
    lastDiscoveredAt: row.lastDiscoveredAt,
    lastDiscoverySummary: row.lastDiscoverySummary,
  };
}

function toCapabilityRow(row: {
  id: string;
  sourceId: string;
  source: { key: string };
  upstreamModel: string;
  modality: string;
  publicModel: string | null;
  state: string;
  stateReason: string | null;
  pinned: boolean;
  banned: boolean;
  lastProbeAt: Date | null;
  lastSuccessAt: Date | null;
  lastFailureAt: Date | null;
  nextProbeAt: Date | null;
  vanishedAt: Date | null;
}): SupplyCapabilityRow {
  return {
    id: row.id,
    sourceId: row.sourceId,
    sourceKey: row.source.key,
    upstreamModel: row.upstreamModel,
    modality: row.modality,
    publicModel: row.publicModel,
    state: row.state,
    stateReason: row.stateReason,
    pinned: row.pinned,
    banned: row.banned,
    lastProbeAt: row.lastProbeAt,
    lastSuccessAt: row.lastSuccessAt,
    lastFailureAt: row.lastFailureAt,
    nextProbeAt: row.nextProbeAt,
    vanishedAt: row.vanishedAt,
  };
}
