import { beforeEach, describe, expect, it, vi } from "vitest";

const callSupplyAction = vi.hoisted(() => vi.fn());
vi.mock("./lib/supply-admin-client.js", () => ({ callSupplyAction }));

const { handleSupplySourceChanged } = await import("./supplySourceChanged.js");

beforeEach(() => {
  callSupplyAction.mockReset();
});

function fakeStep() {
  const sent: Array<{ name: string; data: Record<string, unknown> }> = [];
  return {
    sent,
    run: async <T>(_id: string, fn: () => Promise<T> | T) => fn(),
    sendEvent: async (_id: string, payload: { name: string; data: Record<string, unknown> }) => {
      sent.push(payload);
    },
  };
}

describe("handleSupplySourceChanged", () => {
  it("discovers exactly the one source named in the event (one bounded call)", async () => {
    callSupplyAction.mockResolvedValue({
      ok: true,
      status: 200,
      body: { added: [], reappeared: [] },
    });
    const step = fakeStep();

    await handleSupplySourceChanged({
      event: { data: { sourceKey: "cliproxyapi", reason: "added" } },
      step,
    });

    expect(callSupplyAction).toHaveBeenCalledTimes(1);
    expect(callSupplyAction).toHaveBeenCalledWith("source.discover", { key: "cliproxyapi" });
  });

  it("emits supply/model.discovered for added + reappeared models, not for unchanged ones", async () => {
    callSupplyAction.mockResolvedValue({
      ok: true,
      status: 200,
      body: { added: ["model-a"], reappeared: ["model-b"], unchanged: ["model-c"], vanished: [] },
    });
    const step = fakeStep();

    const result = await handleSupplySourceChanged({
      event: { data: { sourceKey: "cliproxyapi", reason: "added" } },
      step,
    });

    expect(step.sent).toHaveLength(1);
    expect(step.sent[0]).toEqual({
      name: "supply/model.discovered",
      data: { sourceKey: "cliproxyapi", upstreamModels: ["model-a", "model-b"] },
    });
    expect(result.fresh).toBe(2);
  });

  it("sends no event when discovery finds nothing fresh", async () => {
    callSupplyAction.mockResolvedValue({
      ok: true,
      status: 200,
      body: { added: [], reappeared: [] },
    });
    const step = fakeStep();

    const result = await handleSupplySourceChanged({
      event: { data: { sourceKey: "cliproxyapi", reason: "scheduled" } },
      step,
    });

    expect(step.sent).toHaveLength(0);
    expect(result.fresh).toBe(0);
  });
});
