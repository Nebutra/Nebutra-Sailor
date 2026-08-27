import type { EventBus } from "@nebutra/event-bus";
import { describe, expect, it } from "vitest";
import { InMemorySagaJournal } from "../journal";
import { createSaga } from "../orchestrator";

const eventBus = {
  createEvent: (type: string, data: Record<string, unknown>) => ({
    id: `${type}-id`,
    type,
    timestamp: new Date().toISOString(),
    source: "test",
    data,
  }),
  publish: async () => {},
} as unknown as EventBus;

describe("Saga journal", () => {
  it("records durable lifecycle events for successful saga execution", async () => {
    const journal = new InMemorySagaJournal<{ value: number }>();
    const saga = createSaga<{ value: number }>("order.create", eventBus, { journal });

    saga
      .addStep({
        name: "reserve",
        execute: async (context) => ({ value: context.value + 1 }),
      })
      .addStep({
        name: "charge",
        execute: async (context) => ({ value: context.value + 1 }),
      });

    const result = await saga.execute({ value: 0 }, { executionId: "saga_123" });

    expect(result.success).toBe(true);
    await expect(journal.list("saga_123")).resolves.toEqual([
      expect.objectContaining({ executionId: "saga_123", type: "saga.started" }),
      expect.objectContaining({ executionId: "saga_123", type: "step.completed", step: "reserve" }),
      expect.objectContaining({ executionId: "saga_123", type: "step.completed", step: "charge" }),
      expect.objectContaining({ executionId: "saga_123", type: "saga.completed" }),
    ]);
  });

  it("records failed step and compensation lifecycle for recovery tooling", async () => {
    const journal = new InMemorySagaJournal<{ value: number }>();
    const compensated: string[] = [];
    const saga = createSaga<{ value: number }>("order.create", eventBus, { journal });

    saga
      .addStep({
        name: "reserve",
        execute: async (context) => ({ value: context.value + 1 }),
        compensate: async () => {
          compensated.push("reserve");
        },
      })
      .addStep({
        name: "charge",
        execute: async () => {
          throw new Error("card declined");
        },
      });

    const result = await saga.execute({ value: 0 }, { executionId: "saga_failed" });

    expect(result.success).toBe(false);
    expect(compensated).toEqual(["reserve"]);
    await expect(journal.list("saga_failed")).resolves.toEqual(
      expect.arrayContaining([
        expect.objectContaining({ type: "step.failed", step: "charge", error: "card declined" }),
        expect.objectContaining({ type: "compensation.started", step: "reserve" }),
        expect.objectContaining({ type: "compensation.completed", step: "reserve" }),
        expect.objectContaining({ type: "saga.failed", error: "card declined" }),
      ]),
    );
  });
});
