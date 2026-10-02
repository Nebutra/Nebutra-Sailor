import { describe, expect, it } from "vitest";
import { handleSupplyBootstrap } from "./supplyBootstrap.js";

function fakeStep() {
  const sent: unknown[] = [];
  return {
    sent,
    sendEvent: async (_id: string, payload: unknown) => {
      sent.push(payload);
    },
  };
}

describe("handleSupplyBootstrap", () => {
  it("turns an empty registry's seed list into one supply/source.changed per built-in source", async () => {
    const step = fakeStep();
    const result = await handleSupplyBootstrap({
      event: { data: { sourceKeys: ["cliproxyapi", "newapi-channel-cliproxyapi"] } },
      step,
    });

    expect(result.sources).toBe(2);
    expect(step.sent).toHaveLength(1);
    const [batch] = step.sent as [Array<{ name: string; data: Record<string, unknown> }>];
    expect(batch).toHaveLength(2);
    expect(batch.map((e) => e.data.sourceKey)).toEqual([
      "cliproxyapi",
      "newapi-channel-cliproxyapi",
    ]);
    expect(batch.every((e) => e.name === "supply/source.changed")).toBe(true);
  });

  it("is a no-op when the registry was already seeded (empty sourceKeys)", async () => {
    const step = fakeStep();
    const result = await handleSupplyBootstrap({ event: { data: { sourceKeys: [] } }, step });
    expect(result.sources).toBe(0);
    expect(step.sent).toHaveLength(0);
  });
});
