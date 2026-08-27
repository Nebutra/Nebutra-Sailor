import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("inngest", () => ({
  Inngest: vi.fn().mockImplementation(function InngestMock() {
    return {
      send: vi.fn().mockResolvedValue(undefined),
    };
  }),
}));

import { EventBus } from "./bus";
import { clearDeadLetterQueue } from "./dlq";

describe("EventBus local handler delivery", () => {
  beforeEach(() => {
    clearDeadLetterQueue();
  });

  it("caps local handler fan-out while preserving wildcard subscribers", async () => {
    const bus = new EventBus();
    let activeHandlers = 0;
    let maxActiveHandlers = 0;
    const releaseHandlers: Array<() => void> = [];

    const createHandler = () => async () => {
      activeHandlers += 1;
      maxActiveHandlers = Math.max(maxActiveHandlers, activeHandlers);

      await new Promise<void>((resolve) => {
        releaseHandlers.push(() => {
          activeHandlers -= 1;
          resolve();
        });
      });
    };

    for (let index = 0; index < 8; index += 1) {
      bus.subscribe("tenant.created", createHandler());
    }
    bus.subscribe("*", createHandler());

    const published = bus.publish(
      bus.createEvent("tenant.created", { tenantId: "tenant_1" }, { source: "test" }),
    );

    try {
      await vi.waitFor(() => {
        expect(releaseHandlers.length).toBeGreaterThan(0);
      });
      expect(maxActiveHandlers).toBeLessThanOrEqual(4);
    } finally {
      let released = 0;
      while (released < 9) {
        await vi.waitFor(() => {
          expect(releaseHandlers.length).toBeGreaterThan(0);
        });
        const releaseBatch = releaseHandlers.splice(0);
        released += releaseBatch.length;
        for (const release of releaseBatch) {
          release();
        }
      }
      await published;
    }
  });
});
