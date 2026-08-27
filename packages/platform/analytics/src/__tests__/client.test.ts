import { beforeEach, describe, expect, it, vi } from "vitest";

const dubHarness = vi.hoisted(() => ({
  activeCreates: 0,
  maxActiveCreates: 0,
  releaseCreateCalls: [] as Array<() => void>,
  reset() {
    this.activeCreates = 0;
    this.maxActiveCreates = 0;
    this.releaseCreateCalls = [];
  },
}));

vi.mock("dub", () => ({
  Dub: vi.fn().mockImplementation(function DubMock() {
    return {
      links: {
        create: vi.fn((input: Record<string, unknown>) => {
          dubHarness.activeCreates += 1;
          dubHarness.maxActiveCreates = Math.max(
            dubHarness.maxActiveCreates,
            dubHarness.activeCreates,
          );

          return new Promise((resolve) => {
            dubHarness.releaseCreateCalls.push(() => {
              dubHarness.activeCreates -= 1;
              resolve({
                id: `link_${input.key}`,
                domain: input.domain,
                key: input.key,
                url: input.url,
                shortLink: `https://${input.domain}/${input.key}`,
                clicks: 0,
                createdAt: "2026-06-05T00:00:00.000Z",
                updatedAt: "2026-06-05T00:00:00.000Z",
                externalId: input.externalId,
                tags: input.tagIds,
              });
            });
          });
        }),
      },
    };
  }),
}));

import { createAnalyticsClient } from "../client";

describe("AnalyticsClient legacy Dub bulk operations", () => {
  beforeEach(() => {
    dubHarness.reset();
  });

  it("caps link creation fan-out against the Dub API", async () => {
    const client = createAnalyticsClient({
      apiKey: "dub_test",
      defaultDomain: "go.nebutra.test",
    });
    const inputs = Array.from({ length: 8 }, (_, index) => ({
      url: `https://nebutra.test/${index}`,
      key: `k${index}`,
      tenantId: "tenant_1",
    }));

    const pendingLinks = client.links.createMany(inputs);

    try {
      await vi.waitFor(() => {
        expect(dubHarness.releaseCreateCalls.length).toBeGreaterThan(0);
      });
      expect(dubHarness.maxActiveCreates).toBeLessThanOrEqual(5);
    } finally {
      let released = 0;
      while (released < inputs.length) {
        await vi.waitFor(() => {
          expect(dubHarness.releaseCreateCalls.length).toBeGreaterThan(0);
        });
        const releaseBatch = dubHarness.releaseCreateCalls.splice(0);
        released += releaseBatch.length;
        for (const release of releaseBatch) {
          release();
        }
      }
      await pendingLinks;
    }
  });
});
