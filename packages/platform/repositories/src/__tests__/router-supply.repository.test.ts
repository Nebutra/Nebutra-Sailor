/**
 * `RouterSupplyRepository` against a real Prisma client, over PGlite — same
 * posture as `router-billing.repository.test.ts`: the generated client, its
 * query compiler and the driver adapter, unchanged.
 *
 * The last test in this file reproduces the 2026-09-30 incident end to end:
 * a source advertises `gpt-image-2.5-flare`, three consecutive probe failures
 * with `auth_not_found` suspend it (and it drops off the shelf availability
 * map), and one later success restores it — automatically, no manual
 * delisting or relisting anywhere in the path.
 */
import { createPglitePrismaClient, type PrismaTestDatabase } from "@nebutra/db/testing";
import { applyOutcome } from "@nebutra/router-supply";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { RouterSupplyRepository } from "../router-supply.repository";
import { SUPPLY_DDL } from "./supply-schema";

describe("RouterSupplyRepository (real Prisma over PGlite)", () => {
  let database: PrismaTestDatabase;
  let repository: RouterSupplyRepository;

  beforeAll(async () => {
    database = await createPglitePrismaClient();
    await database.prisma.$executeRawUnsafe(SUPPLY_DDL);
    repository = new RouterSupplyRepository(database.prisma);
  }, 60_000);

  afterAll(async () => {
    await database?.close();
  });

  beforeEach(async () => {
    await database.prisma.$executeRawUnsafe(
      "TRUNCATE supply_probe_events, supply_source_models, supply_sources CASCADE",
    );
  });

  it("upserts a source idempotently by key", async () => {
    const first = await repository.upsertSource({
      key: "cliproxyapi",
      kind: "CLIPROXYAPI",
      label: "Account pool · CLIProxyAPI",
      baseUrl: "http://nebutra-cliproxyapi.internal:8317",
    });
    const second = await repository.upsertSource({
      key: "cliproxyapi",
      kind: "CLIPROXYAPI",
      label: "Account pool · CLIProxyAPI (renamed)",
      baseUrl: "http://nebutra-cliproxyapi.internal:8317",
    });
    expect(second.id).toBe(first.id);
    expect(second.label).toContain("renamed");
    expect(await repository.listSources()).toHaveLength(1);
  });

  it("discovery creates PENDING rows, defaults publicModel to the bare id, and diffs vanished/reappeared models", async () => {
    const source = await repository.upsertSource({
      key: "cliproxyapi",
      kind: "CLIPROXYAPI",
      label: "Account pool",
      baseUrl: "http://x",
    });

    const first = await repository.applyDiscovery(source.id, [
      { id: "gpt-image-2.5-flare", modality: "IMAGE" },
      { id: "claude-sonnet-5", modality: "TEXT" },
    ]);
    expect(first.added.sort()).toEqual(["claude-sonnet-5", "gpt-image-2.5-flare"]);

    const capsAfterFirst = await repository.listCapabilities({ sourceId: source.id });
    const flare = capsAfterFirst.find((c) => c.upstreamModel === "gpt-image-2.5-flare");
    expect(flare?.state).toBe("PENDING");
    expect(flare?.publicModel).toBe("gpt-image-2.5-flare");

    // Second run drops claude-sonnet-5 — it should be marked vanished, never deleted.
    const second = await repository.applyDiscovery(source.id, [
      { id: "gpt-image-2.5-flare", modality: "IMAGE" },
    ]);
    expect(second.vanished).toEqual(["claude-sonnet-5"]);
    expect(second.unchanged).toEqual(["gpt-image-2.5-flare"]);
    const stillThere = await repository.listCapabilities({ sourceId: source.id });
    expect(stillThere).toHaveLength(2);
    const vanishedRow = stillThere.find((c) => c.upstreamModel === "claude-sonnet-5");
    expect(vanishedRow?.vanishedAt).not.toBeNull();

    // Third run: claude-sonnet-5 comes back — reappeared, vanishedAt cleared.
    const third = await repository.applyDiscovery(source.id, [
      { id: "gpt-image-2.5-flare", modality: "IMAGE" },
      { id: "claude-sonnet-5", modality: "TEXT" },
    ]);
    expect(third.reappeared).toEqual(["claude-sonnet-5"]);
    const reappearedRow = (await repository.listCapabilities({ sourceId: source.id })).find(
      (c) => c.upstreamModel === "claude-sonnet-5",
    );
    expect(reappearedRow?.vanishedAt).toBeNull();
  });

  it("manual override: a pin forces the row available and is logged as an event", async () => {
    const source = await repository.upsertSource({
      key: "cliproxyapi",
      kind: "CLIPROXYAPI",
      label: "Account pool",
      baseUrl: "http://x",
    });
    await repository.applyDiscovery(source.id, [{ id: "gpt-image-2", modality: "IMAGE" }]);
    const [row] = await repository.listCapabilities({ sourceId: source.id });
    await repository.setManualOverride(row.id, { pinned: true });
    const [after] = await repository.listCapabilities({ sourceId: source.id });
    expect(after.pinned).toBe(true);

    const count = await database.prisma.supplyProbeEvent.count({
      where: { sourceModelId: row.id, kind: "MANUAL_OVERRIDE" },
    });
    expect(count).toBe(1);
  });

  it(
    "incident scenario: advertised model suspends after 3 auth_not_found failures, " +
      "drops off the shelf, then a later success restores it automatically",
    async () => {
      const source = await repository.upsertSource({
        key: "cliproxyapi",
        kind: "CLIPROXYAPI",
        label: "Account pool · CLIProxyAPI",
        baseUrl: "http://nebutra-cliproxyapi.internal:8317",
      });
      // The New-API channel advertises it (discovery), matching the incident.
      await repository.applyDiscovery(source.id, [
        { id: "gpt-image-2.5-flare", modality: "IMAGE" },
      ]);
      const [row] = await repository.listCapabilities({ sourceId: source.id });
      expect(row.publicModel).toBe("gpt-image-2.5-flare");

      // A brand-new, never-probed model is not on the shelf yet either way —
      // sanity check before the failures start.
      let availability = await repository.availabilityFor(["gpt-image-2.5-flare"]);
      expect(availability.get("gpt-image-2.5-flare")?.sellable).toBe(false);

      // Three real probes, each answering the incident's exact error.
      const current = row.id;
      for (let i = 0; i < 3; i += 1) {
        await repository.recordProbe(
          {
            sourceModelId: current,
            kind: "ACTIVE_PROBE",
            outcome: "failure",
            reason: "auth_not_found",
            latencyMs: 42,
          },
          applyOutcome,
        );
      }
      const [afterFailures] = await repository.listCapabilities({ sourceId: source.id });
      expect(afterFailures.state).toBe("SUSPENDED");
      expect(afterFailures.stateReason).toBe("auth_not_found");
      expect(afterFailures.nextProbeAt).not.toBeNull();

      availability = await repository.availabilityFor(["gpt-image-2.5-flare"]);
      expect(availability.get("gpt-image-2.5-flare")?.sellable).toBe(false);
      expect(availability.get("gpt-image-2.5-flare")?.reason).toBe("auth_not_found");

      // The account gets fixed; the next probe succeeds.
      await repository.recordProbe(
        { sourceModelId: current, kind: "ACTIVE_PROBE", outcome: "success", latencyMs: 10 },
        applyOutcome,
      );
      const [restored] = await repository.listCapabilities({ sourceId: source.id });
      expect(restored.state).toBe("AVAILABLE");
      expect(restored.stateReason).toBeNull();

      availability = await repository.availabilityFor(["gpt-image-2.5-flare"]);
      expect(availability.get("gpt-image-2.5-flare")?.sellable).toBe(true);

      const events = await database.prisma.supplyProbeEvent.findMany({
        where: { sourceModelId: current },
        orderBy: { at: "asc" },
      });
      expect(events).toHaveLength(4);
      expect(events.map((e) => e.outcome)).toEqual(["FAILURE", "FAILURE", "FAILURE", "SUCCESS"]);
      expect(events[2]?.toState).toBe("SUSPENDED");
      expect(events[3]?.toState).toBe("AVAILABLE");
      void current;
    },
  );

  it("passive signal ingestion (free health data from the real relay path) drives the same state machine as an active probe", async () => {
    const source = await repository.upsertSource({
      key: "cliproxyapi",
      kind: "CLIPROXYAPI",
      label: "Account pool",
      baseUrl: "http://x",
    });
    await repository.applyDiscovery(source.id, [{ id: "claude-sonnet-5", modality: "TEXT" }]);
    const [row] = await repository.listCapabilities({ sourceId: source.id });

    // A relayed request that succeeded, reported passively — no active probe involved.
    await repository.recordProbe(
      { sourceModelId: row.id, kind: "PASSIVE_SIGNAL", outcome: "success", latencyMs: 900 },
      applyOutcome,
    );
    const events = await database.prisma.supplyProbeEvent.findMany({
      where: { sourceModelId: row.id },
    });
    expect(events).toHaveLength(1);
    expect(events[0]?.kind).toBe("PASSIVE_SIGNAL");
    const [after] = await repository.listCapabilities({ sourceId: source.id });
    expect(after.state).toBe("AVAILABLE");
  });

  it("findBySourceKeyAndUpstreamModel resolves the (source, model) pair passive signals key off", async () => {
    const source = await repository.upsertSource({
      key: "cliproxyapi",
      kind: "CLIPROXYAPI",
      label: "Account pool",
      baseUrl: "http://x",
    });
    await repository.applyDiscovery(source.id, [{ id: "claude-sonnet-5", modality: "TEXT" }]);
    const found = await repository.findBySourceKeyAndUpstreamModel(
      "cliproxyapi",
      "claude-sonnet-5",
    );
    expect(found?.upstreamModel).toBe("claude-sonnet-5");
    expect(await repository.findBySourceKeyAndUpstreamModel("cliproxyapi", "nope")).toBeNull();
  });

  it("listSuspendedDueForRetry only returns rows whose backoff has elapsed", async () => {
    const source = await repository.upsertSource({
      key: "cliproxyapi",
      kind: "CLIPROXYAPI",
      label: "Account pool",
      baseUrl: "http://x",
    });
    await repository.applyDiscovery(source.id, [{ id: "gpt-image-2", modality: "IMAGE" }]);
    const [row] = await repository.listCapabilities({ sourceId: source.id });
    for (let i = 0; i < 3; i += 1) {
      await repository.recordProbe(
        { sourceModelId: row.id, kind: "ACTIVE_PROBE", outcome: "failure", reason: "unauthorized" },
        applyOutcome,
      );
    }
    const dueNow = await repository.listSuspendedDueForRetry(new Date());
    expect(dueNow).toHaveLength(0); // nextProbeAt is ~1h out

    const dueLater = await repository.listSuspendedDueForRetry(
      new Date(Date.now() + 2 * 60 * 60 * 1000),
    );
    expect(dueLater.map((r) => r.id)).toContain(row.id);
  });
});
