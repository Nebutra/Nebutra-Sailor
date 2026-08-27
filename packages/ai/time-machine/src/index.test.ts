import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { ContentStore } from "@nebutra/content-store";
import { EventLog } from "@nebutra/event-log";
import { afterEach, describe, expect, it } from "vitest";
import { readTimeMachineDebug, TimeMachine } from "./index";

let root: string | undefined;
let machine: TimeMachine | undefined;

afterEach(async () => {
  if (machine) await machine.close();
  if (root) await rm(root, { recursive: true, force: true });
  root = undefined;
  machine = undefined;
});

async function seed(): Promise<{ runtime: TimeMachine; first: string; second: string }> {
  root = await mkdtemp(join(tmpdir(), "time-machine-"));
  const tenantId = "tenant_a";
  const contentStore = await ContentStore.open(join(root, "content"), { tenantId });
  const eventLog = await EventLog.open(join(root, "event-log"), { tenantId });
  const first = await eventLog.commit({
    traceId: "brand",
    kind: "content_write",
    affected: ["company/BRAND.md"],
    parent: null,
    snapshot: { "company/BRAND.md": "name: Loop\npalette: blue\n" },
  });
  const second = await eventLog.commit({
    traceId: "film",
    kind: "content_write",
    affected: ["company/film_60s.mp4", "company/BRAND.md"],
    parent: first,
    snapshot: { "company/BRAND.md": "name: Loop\npalette: purple\n" },
  });
  machine = await TimeMachine.fromStores({
    tenantId,
    root,
    contentStore,
    eventLog,
  });
  return { runtime: machine, first, second };
}

describe("time-machine", () => {
  it("projects event-log records into a founder timeline without owning truth", async () => {
    const { runtime, first, second } = await seed();

    const view = await runtime.timelineView();

    expect(view.nodes.map((node) => node.eventId)).toEqual([first, second]);
    expect(view.nodes[0]).toMatchObject({
      kind: "milestone",
      branchId: "main",
      affectedAssets: ["company/BRAND.md"],
    });
    expect(view.truthSource).toBe("event-log");
  });

  it("branches, stars, compares, and keeps rollback as dry-run only", async () => {
    const { runtime, first, second } = await seed();

    const branch = await runtime.branchFrom(first, "purple version");
    const annotation = await runtime.star(first, "first brand");
    const comparison = await runtime.compare(first, second);
    const rollback = await runtime.rollbackDryRun(first);

    expect(branch).toMatchObject({ name: "purple version", fromEventId: first });
    expect(annotation.path).toBe(`time-machine/annotations/${first}.json`);
    expect(comparison.changedAssets).toContain("company/film_60s.mp4");
    expect(comparison.narrative).toContain("company/BRAND.md");
    expect(rollback.dryRun).toBe(true);
    expect(rollback.suggestion).toContain("Review");
  });

  it("records debug entries through capability-kit helpers", async () => {
    const { runtime } = await seed();

    await runtime.doctor();

    await expect(readTimeMachineDebug(root)).resolves.toEqual(expect.any(Array));
  });
});
