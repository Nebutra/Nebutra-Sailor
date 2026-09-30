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
  /**
   * `PUBLIC` (default) is sellable on the shelf and reachable by the customer
   * relay, same as every source before this field existed. `INTERNAL` is
   * never counted toward public shelf availability (`availabilityFor`
   * excludes it) and never used for the customer relay path — only the
   * internal service-token relay (`findInternalRoute`) reads it.
   */
  readonly visibility: string;
  readonly lastDiscoveredAt: Date | null;
  readonly lastDiscoverySummary: unknown;
  /** Declared plan windows (ADR 2026-09-30 addendum, quota layer §1c) — see `PlanWindowConfig`. */
  readonly planConfig: unknown;
}

export interface UpsertSourceInput {
  readonly key: string;
  readonly kind: string;
  readonly protocol?: string;
  readonly label: string;
  readonly baseUrl: string;
  readonly credentialRef?: string | null;
  readonly enabled?: boolean;
  /** Defaults to `PUBLIC` — every source before this field existed behaves unchanged. */
  readonly visibility?: string;
  readonly planConfig?: unknown;
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
  /** Adapter-shaped, as discovery reported it — e.g. `{ context_length, supported_endpoints, name }`. Threaded into `probeModel` so verification can pick the right call shape (see `verify.ts`). */
  readonly capabilities: unknown;
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
  /**
   * Quota headroom (ADR 2026-09-30 addendum), distinct from `sellable`:
   * `"throttled"` when every sellable backing source has at least one quota
   * window in THROTTLED/EXHAUSTED, `"ok"` when at least one does not. Never
   * downgrades `sellable` — headroom only biases routing preference among
   * the customer's own candidate models, it never delists one.
   */
  readonly headroom: "ok" | "throttled";
}

// ---------------------------------------------------------------- quota layer (ADR 2026-09-30 addendum)

export interface PlanWindowConfig {
  readonly name: string;
  readonly unit: string;
  readonly limitAmount: number | null;
  readonly windowSeconds: number | null;
}

export interface QuotaWindowRow {
  readonly id: string;
  readonly sourceId: string;
  readonly sourceKey: string;
  readonly name: string;
  readonly unit: string;
  readonly limitAmount: number | null;
  readonly usedAmount: number;
  readonly resetsAt: Date | null;
  readonly windowSeconds: number | null;
  readonly sourceOfTruth: string;
  readonly state: string;
  readonly burnRatePerHour: number | null;
  readonly forecastExhaustAt: Date | null;
  readonly lastAlertLevel: string;
  readonly lastAlertAt: Date | null;
  readonly lastForecastAlertAt: Date | null;
  readonly lastSampleAt: Date | null;
  readonly nextPullAt: Date | null;
  readonly pullIntervalSeconds: number | null;
}

/** The narrow window shape `@nebutra/router-supply`'s pure `quota.ts` functions read and return. */
export interface QuotaSnapshotInput {
  readonly unit: string;
  readonly limit: number | null;
  readonly used: number;
  readonly resetsAt: Date | null;
  readonly windowSeconds: number | null;
  readonly sourceOfTruth: string;
  readonly state: string;
  readonly burnRatePerHour: number | null;
  readonly forecastExhaustAt: Date | null;
  readonly lastAlertLevel: string;
  readonly lastForecastAlertAt: Date | null;
  readonly lastSampleAt: Date | null;
}

export interface QuotaObservationInput {
  readonly used?: number | null;
  readonly remaining?: number | null;
  readonly deltaUsed?: number | null;
  readonly limit?: number | null;
  readonly resetsAt?: Date | null;
  readonly sourceOfTruth: "HEADER" | "ENDPOINT" | "SELF_METERED";
  readonly forceExhaustedUntil?: Date | null;
  /** Only read when the named window does not exist yet. */
  readonly unit?: string;
  readonly windowSeconds?: number | null;
}

/**
 * `@nebutra/router-supply` `applyQuotaObservation`, injected so this package
 * stays a devDependency-only consumer of that package (same posture as
 * `recordProbe`'s injected `applyOutcome`).
 */
export type ApplyQuotaObservationFn = (
  window: QuotaSnapshotInput,
  observation: {
    used?: number | null;
    remaining?: number | null;
    deltaUsed?: number | null;
    limit?: number | null;
    resetsAt?: Date | null;
    sourceOfTruth: string;
    forceExhaustedUntil?: Date | null;
  },
  now: Date,
) => {
  snapshot: QuotaSnapshotInput;
  sample: { usedAmount: number; deltaAmount: number | null };
};

/** `@nebutra/router-supply` `ratioAlertLevel` / `shouldAlertRatio`, injected the same way. */
export type QuotaAlertDecisionFns = {
  ratioAlertLevel: (used: number, limit: number | null) => string;
  shouldAlertRatio: (prior: string, next: string) => boolean;
  forecastWithinHours: (forecastExhaustAt: Date | null, now: Date, hours: number) => boolean;
  shouldAlertForecast: (
    forecastSoon: boolean,
    lastForecastAlertAt: Date | null,
    now: Date,
    cooldownMs: number,
  ) => boolean;
  nextPullDelaySeconds: (state: string, forecastSoon: boolean) => number;
};

export interface QuotaObservationResult {
  readonly window: QuotaWindowRow;
  readonly ratioAlert: { fired: boolean; level: string };
  readonly forecastAlert: { fired: boolean };
}

export interface InternalRouteRow {
  readonly source: SupplySourceRow;
  readonly upstreamModel: string;
  /** Adapter-shaped, as discovery reported it — e.g. `{ context_length, supported_endpoints, name }`. */
  readonly capabilities: unknown;
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
        visibility: (input.visibility ?? "PUBLIC") as never,
        ...(input.planConfig !== undefined
          ? { planConfig: input.planConfig as Prisma.InputJsonValue }
          : {}),
      },
      update: {
        label: input.label,
        baseUrl: input.baseUrl,
        ...(input.protocol ? { protocol: input.protocol as never } : {}),
        ...(input.credentialRef !== undefined ? { credentialRef: input.credentialRef } : {}),
        ...(input.enabled !== undefined ? { enabled: input.enabled } : {}),
        ...(input.visibility !== undefined ? { visibility: input.visibility as never } : {}),
        ...(input.planConfig !== undefined
          ? { planConfig: input.planConfig as Prisma.InputJsonValue }
          : {}),
      },
    });
    return toSourceRow(row);
  }

  /** Admin `source.plan.update` (§5): edit a source's declared plan windows without touching anything else. */
  async updatePlanConfig(
    key: string,
    planConfig: readonly PlanWindowConfig[],
  ): Promise<SupplySourceRow> {
    const row = await this.prisma.supplySource.update({
      where: { key },
      data: { planConfig: planConfig as unknown as Prisma.InputJsonValue },
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

  /** PENDING models, plus AVAILABLE/DEGRADED ones with no probe in the last `idleMs` — the idle-verification sweep. */
  async listDueForActiveProbe(
    now: Date = new Date(),
    idleMs = 24 * 60 * 60 * 1000,
    limit = 200,
  ): Promise<SupplyCapabilityRow[]> {
    const cutoff = new Date(now.getTime() - idleMs);
    const rows = await this.prisma.supplySourceModel.findMany({
      where: {
        vanishedAt: null,
        OR: [
          // Never verified yet: probe on the next sweep, whatever its age.
          { state: "PENDING" },
          {
            state: { in: ["AVAILABLE", "DEGRADED"] },
            OR: [{ lastProbeAt: null }, { lastProbeAt: { lt: cutoff } }],
          },
        ],
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
   *
   * `INTERNAL` sources are excluded from this query entirely — this is the one
   * method both the shelf (`shelf-prices.ts`) and the customer relay
   * (`billing-edge.ts` `admit`) call, so an internal-only source (e.g. a
   * team-use-only plan key whose terms forbid resale) can never make a model
   * read as sellable to a customer, or as available inventory on the public
   * shelf, no matter how healthy its probes are. The internal service-token
   * relay reads `findInternalRoute` instead, which is the mirror image: only
   * `INTERNAL` sources.
   */
  async availabilityFor(publicModels: readonly string[]): Promise<Map<string, ModelAvailability>> {
    if (publicModels.length === 0) return new Map();
    const rows = await this.prisma.supplySourceModel.findMany({
      where: {
        publicModel: { in: [...publicModels] },
        vanishedAt: null,
        source: { visibility: "PUBLIC" },
      },
      include: { source: { include: { quotaWindows: true } } },
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
      let headroom: "ok" | "throttled" = "throttled";
      const sources: string[] = [];
      for (const row of group) {
        const state = effective(row.state, row.pinned, row.banned);
        if (isSellable(state)) {
          sellable = true;
          sources.push(row.source.key);
          // Quota headroom (ADR 2026-09-30 addendum): a source with no
          // THROTTLED/EXHAUSTED window has headroom — one such source among
          // several sellable ones is enough to call the model "ok".
          const throttledHere = row.source.quotaWindows.some(
            (w) => w.state === "THROTTLED" || w.state === "EXHAUSTED",
          );
          if (!throttledHere) headroom = "ok";
        } else if (!reason) {
          reason = row.stateReason;
        }
      }
      result.set(publicModel, { sellable, reason: sellable ? null : reason, sources, headroom });
    }
    return result;
  }

  /**
   * The internal service-token relay's routing decision (ADR 2026-09-30 +
   * internal-source follow-up): the one AVAILABLE/DEGRADED capability row,
   * backed by an `INTERNAL`-visibility source, for `model` — matched against
   * either the resolved public id or the raw upstream id, since an internal
   * caller may send either. `null` when no `INTERNAL` source currently serves
   * it (not discovered, not yet probed, or suspended) — the caller falls back
   * to the existing New-API relay.
   *
   * Mirror image of `availabilityFor`: that one reads only `PUBLIC` sources,
   * this one reads only `INTERNAL` ones. A model can be backed by both without
   * either query ever mixing the two.
   */
  async findInternalRoute(model: string): Promise<InternalRouteRow | null> {
    const rows = await this.prisma.supplySourceModel.findMany({
      where: {
        vanishedAt: null,
        OR: [{ publicModel: model }, { upstreamModel: model }],
        source: { visibility: "INTERNAL", enabled: true },
      },
      include: { source: true },
    });
    for (const row of rows) {
      const state = effective(row.state, row.pinned, row.banned);
      if (isSellable(state)) {
        return {
          source: toSourceRow(row.source),
          upstreamModel: row.upstreamModel,
          capabilities: row.capabilities,
        };
      }
    }
    return null;
  }

  // -------------------------------------------------------------- quota layer (ADR 2026-09-30 addendum)

  /**
   * Upsert one `SupplyQuotaWindow` row per declared plan entry — self-metering's
   * input (§1c). Creating fills in the declared shape; an existing row keeps
   * its live counters (`usedAmount`/`state`/…) and only adopts the edited
   * `unit`/`limitAmount`/`windowSeconds` — an admin edit changes the target, not
   * the window's current progress.
   */
  async ensureQuotaWindowsFromPlan(
    sourceId: string,
    planConfig: readonly PlanWindowConfig[],
    now: Date = new Date(),
  ): Promise<void> {
    for (const plan of planConfig) {
      const resetsAt = plan.windowSeconds
        ? new Date(now.getTime() + plan.windowSeconds * 1000)
        : null;
      await this.prisma.supplyQuotaWindow.upsert({
        where: { sourceId_name: { sourceId, name: plan.name } },
        create: {
          id: `supqw_${randomUUID()}`,
          sourceId,
          name: plan.name,
          unit: plan.unit as never,
          limitAmount: plan.limitAmount,
          windowSeconds: plan.windowSeconds,
          sourceOfTruth: "SELF_METERED" as never,
          resetsAt,
        },
        update: {
          unit: plan.unit as never,
          limitAmount: plan.limitAmount,
          windowSeconds: plan.windowSeconds,
        },
      });
    }
  }

  async listQuotaWindows(filter?: { sourceId?: string }): Promise<QuotaWindowRow[]> {
    const rows = await this.prisma.supplyQuotaWindow.findMany({
      where: { ...(filter?.sourceId ? { sourceId: filter.sourceId } : {}) },
      include: { source: true },
      orderBy: [{ state: "desc" }, { name: "asc" }],
    });
    return rows.map(toQuotaWindowRow);
  }

  async listSelfMeteredWindowsForSource(sourceId: string): Promise<QuotaWindowRow[]> {
    const rows = await this.prisma.supplyQuotaWindow.findMany({
      where: { sourceId, sourceOfTruth: "SELF_METERED" as never },
      include: { source: true },
    });
    return rows.map(toQuotaWindowRow);
  }

  /** Adaptive active-pull scheduling (§6): windows whose next pull is due. */
  async listQuotaWindowsDueForPull(now: Date = new Date(), limit = 200): Promise<QuotaWindowRow[]> {
    const rows = await this.prisma.supplyQuotaWindow.findMany({
      where: {
        sourceOfTruth: { in: ["ENDPOINT", "SELF_METERED"] as never },
        OR: [{ nextPullAt: null }, { nextPullAt: { lte: now } }],
      },
      include: { source: true },
      orderBy: { nextPullAt: "asc" },
      take: limit,
    });
    return rows.map(toQuotaWindowRow);
  }

  /**
   * Load-or-create the named window, run the pure reducer
   * (`@nebutra/router-supply` `applyQuotaObservation`, injected), persist the
   * new snapshot plus one append-only sample, decide (via the injected pure
   * dedupe functions) whether this apply crossed a new ratio-alert rung or a
   * fresh forecast-soon window, and record that decision in the same write —
   * all in one transaction. Returns `null` when the source key is unknown.
   */
  async applyQuotaObservation(
    sourceKey: string,
    windowName: string,
    observation: QuotaObservationInput,
    applyFn: ApplyQuotaObservationFn,
    decide: QuotaAlertDecisionFns,
    now: Date = new Date(),
    forecastAlertHours = 6,
    forecastAlertCooldownMs = 12 * 60 * 60 * 1000,
  ): Promise<QuotaObservationResult | null> {
    const source = await this.prisma.supplySource.findUnique({ where: { key: sourceKey } });
    if (!source) return null;

    return this.prisma.$transaction(async (tx) => {
      let row = await tx.supplyQuotaWindow.findUnique({
        where: { sourceId_name: { sourceId: source.id, name: windowName } },
      });
      if (!row) {
        const windowSeconds = observation.windowSeconds ?? null;
        row = await tx.supplyQuotaWindow.create({
          data: {
            id: `supqw_${randomUUID()}`,
            sourceId: source.id,
            name: windowName,
            unit: (observation.unit ?? "REQUESTS") as never,
            limitAmount: observation.limit ?? null,
            windowSeconds,
            sourceOfTruth: observation.sourceOfTruth as never,
            resetsAt:
              observation.resetsAt ??
              (windowSeconds ? new Date(now.getTime() + windowSeconds * 1000) : null),
          },
        });
      }

      const before: QuotaSnapshotInput = {
        unit: row.unit,
        limit: row.limitAmount,
        used: row.usedAmount,
        resetsAt: row.resetsAt,
        windowSeconds: row.windowSeconds,
        sourceOfTruth: row.sourceOfTruth,
        state: row.state,
        burnRatePerHour: row.burnRatePerHour,
        forecastExhaustAt: row.forecastExhaustAt,
        lastAlertLevel: row.lastAlertLevel,
        lastForecastAlertAt: row.lastForecastAlertAt,
        lastSampleAt: row.lastSampleAt,
      };

      const transition = applyFn(before, observation, now);
      const next = transition.snapshot;

      // `next.lastAlertLevel` is the reducer's own rollover-aware carry-over
      // (reset to NONE when this apply just rolled the window over, else the
      // same value the row had) — the right "prior" to escalate from. Using
      // the raw row value instead would compare a fresh cycle's ratio against
      // the previous cycle's last-fired level, which can only ever suppress
      // an alert that should fire (e.g. a rollover followed immediately by a
      // burst straight to 90% must still alert).
      const priorRatioLevel = next.lastAlertLevel;
      const nextRatioLevel = decide.ratioAlertLevel(next.used, next.limit);
      const ratioFired = decide.shouldAlertRatio(priorRatioLevel, nextRatioLevel);

      const forecastSoon = decide.forecastWithinHours(
        next.forecastExhaustAt,
        now,
        forecastAlertHours,
      );
      const forecastFired = decide.shouldAlertForecast(
        forecastSoon,
        next.lastForecastAlertAt,
        now,
        forecastAlertCooldownMs,
      );

      const nextPullAt = new Date(
        now.getTime() + decide.nextPullDelaySeconds(next.state, forecastSoon) * 1000,
      );

      const updated = await tx.supplyQuotaWindow.update({
        where: { id: row.id },
        data: {
          unit: next.unit as never,
          limitAmount: next.limit,
          usedAmount: next.used,
          resetsAt: next.resetsAt,
          sourceOfTruth: next.sourceOfTruth as never,
          state: next.state as never,
          burnRatePerHour: next.burnRatePerHour,
          forecastExhaustAt: next.forecastExhaustAt,
          lastAlertLevel: (ratioFired ? nextRatioLevel : next.lastAlertLevel) as never,
          lastAlertAt: ratioFired ? now : row.lastAlertAt,
          lastForecastAlertAt: forecastFired ? now : next.lastForecastAlertAt,
          lastSampleAt: now,
          nextPullAt,
        },
        include: { source: true },
      });

      await tx.supplyQuotaSample.create({
        data: {
          id: `supqs_${randomUUID()}`,
          quotaWindowId: row.id,
          at: now,
          usedAmount: transition.sample.usedAmount,
          limitAmount: next.limit,
          deltaAmount: transition.sample.deltaAmount,
          sourceOfTruth: observation.sourceOfTruth as never,
        },
      });

      return {
        window: toQuotaWindowRow(updated),
        ratioAlert: { fired: ratioFired, level: nextRatioLevel },
        forecastAlert: { fired: forecastFired },
      };
    });
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
  visibility: string;
  lastDiscoveredAt: Date | null;
  lastDiscoverySummary: unknown;
  planConfig?: unknown;
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
    visibility: row.visibility,
    lastDiscoveredAt: row.lastDiscoveredAt,
    lastDiscoverySummary: row.lastDiscoverySummary,
    planConfig: row.planConfig ?? null,
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
  capabilities: unknown;
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
    capabilities: row.capabilities,
  };
}

function toQuotaWindowRow(row: {
  id: string;
  sourceId: string;
  source: { key: string };
  name: string;
  unit: string;
  limitAmount: number | null;
  usedAmount: number;
  resetsAt: Date | null;
  windowSeconds: number | null;
  sourceOfTruth: string;
  state: string;
  burnRatePerHour: number | null;
  forecastExhaustAt: Date | null;
  lastAlertLevel: string;
  lastAlertAt: Date | null;
  lastForecastAlertAt: Date | null;
  lastSampleAt: Date | null;
  nextPullAt: Date | null;
  pullIntervalSeconds: number | null;
}): QuotaWindowRow {
  return {
    id: row.id,
    sourceId: row.sourceId,
    sourceKey: row.source.key,
    name: row.name,
    unit: row.unit,
    limitAmount: row.limitAmount,
    usedAmount: row.usedAmount,
    resetsAt: row.resetsAt,
    windowSeconds: row.windowSeconds,
    sourceOfTruth: row.sourceOfTruth,
    state: row.state,
    burnRatePerHour: row.burnRatePerHour,
    forecastExhaustAt: row.forecastExhaustAt,
    lastAlertLevel: row.lastAlertLevel,
    lastAlertAt: row.lastAlertAt,
    lastForecastAlertAt: row.lastForecastAlertAt,
    lastSampleAt: row.lastSampleAt,
    nextPullAt: row.nextPullAt,
    pullIntervalSeconds: row.pullIntervalSeconds,
  };
}
