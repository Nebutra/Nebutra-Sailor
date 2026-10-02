import { beforeEach, describe, expect, it, vi } from "vitest";

const callSupplyAction = vi.hoisted(() => vi.fn());
const listSupplyCapabilities = vi.hoisted(() => vi.fn());
vi.mock("./lib/supply-admin-client.js", () => ({ callSupplyAction, listSupplyCapabilities }));

const { handleSupplyModelFanout } = await import("./supplyModelFanout.js");

beforeEach(() => {
  callSupplyAction.mockReset();
  listSupplyCapabilities.mockReset();
});

function fakeStep() {
  const sleeps: string[] = [];
  const probeCalls: unknown[] = [];
  return {
    sleeps,
    run: async <T>(id: string, fn: () => Promise<T> | T) => {
      const result = await fn();
      if (id.startsWith("probe-")) probeCalls.push(result);
      return result;
    },
    sleep: async (id: string, _duration: string) => {
      sleeps.push(id);
    },
    probeCalls,
  };
}

describe("handleSupplyModelFanout", () => {
  it("fans out one bounded probe.one call per model named in supply/model.discovered — never a loop over many models in one call", async () => {
    callSupplyAction.mockResolvedValue({ ok: true, status: 200, body: {} });
    const step = fakeStep();

    const result = await handleSupplyModelFanout({
      event: {
        name: "supply/model.discovered",
        data: { sourceKey: "cliproxyapi", upstreamModels: ["a", "b", "c"] },
      },
      step,
    });

    expect(callSupplyAction).toHaveBeenCalledTimes(3);
    expect(callSupplyAction).toHaveBeenCalledWith("probe.one", {
      key: "cliproxyapi",
      upstreamModel: "a",
    });
    expect(callSupplyAction).toHaveBeenCalledWith("probe.one", {
      key: "cliproxyapi",
      upstreamModel: "b",
    });
    expect(callSupplyAction).toHaveBeenCalledWith("probe.one", {
      key: "cliproxyapi",
      upstreamModel: "c",
    });
    expect(result.probed).toBe(3);
    // Boundedness: never a single admin-client call carrying more than one
    // model — each is its own step/call.
    expect(listSupplyCapabilities).not.toHaveBeenCalled();
  });

  it("discovers then lists the source's current models when probe.requested carries no upstreamModels", async () => {
    callSupplyAction.mockResolvedValue({ ok: true, status: 200, body: {} });
    listSupplyCapabilities.mockResolvedValue([
      {
        id: "1",
        source: "cliproxyapi",
        upstreamModel: "x",
        publicModel: "x",
        modality: "TEXT",
        state: "AVAILABLE",
        vanishedAt: null,
      },
      {
        id: "2",
        source: "cliproxyapi",
        upstreamModel: "y",
        publicModel: "y",
        modality: "TEXT",
        state: "AVAILABLE",
        vanishedAt: "2026-01-01T00:00:00Z",
      },
    ]);
    const step = fakeStep();

    const result = await handleSupplyModelFanout({
      event: { name: "supply/probe.requested", data: { sourceKey: "cliproxyapi", runId: "r1" } },
      step,
    });

    // Discover step runs exactly once, bounded to this one source.
    expect(callSupplyAction).toHaveBeenCalledWith("source.discover", { key: "cliproxyapi" });
    // Vanished model "y" is excluded from the fan-out.
    expect(callSupplyAction).toHaveBeenCalledWith("probe.one", {
      key: "cliproxyapi",
      upstreamModel: "x",
    });
    expect(callSupplyAction).not.toHaveBeenCalledWith("probe.one", {
      key: "cliproxyapi",
      upstreamModel: "y",
    });
    expect(result.probed).toBe(1);
  });

  it("throttles consecutive image-modality probes with a step.sleep between them", async () => {
    callSupplyAction.mockResolvedValue({ ok: true, status: 200, body: {} });
    listSupplyCapabilities.mockResolvedValue([
      {
        id: "1",
        source: "img-src",
        upstreamModel: "img-1",
        publicModel: "img-1",
        modality: "IMAGE",
        state: "AVAILABLE",
        vanishedAt: null,
      },
      {
        id: "2",
        source: "img-src",
        upstreamModel: "img-2",
        publicModel: "img-2",
        modality: "IMAGE",
        state: "AVAILABLE",
        vanishedAt: null,
      },
    ]);
    const step = fakeStep();

    await handleSupplyModelFanout({
      event: { name: "supply/probe.requested", data: { sourceKey: "img-src", runId: "r2" } },
      step,
    });

    expect(step.sleeps.length).toBe(1);
  });

  it("does nothing when the event carries no sourceKey", async () => {
    const step = fakeStep();
    const result = await handleSupplyModelFanout({
      event: { name: "supply/probe.requested", data: { runId: "r3" } },
      step,
    });
    expect(result.probed).toBe(0);
    expect(callSupplyAction).not.toHaveBeenCalled();
  });
});
