import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  calculateCost,
  DEFAULT_PRICING,
  getModelPricing,
  type ModelPricing,
} from "../cost-calculator.js";

describe("calculateCost", () => {
  const pricing: ModelPricing = {
    inputPricePerMillion: 10.0,
    outputPricePerMillion: 30.0,
    currency: "USD",
  };

  it("calculates input cost for 1M prompt tokens at $10/M", () => {
    const cost = calculateCost(
      {
        promptTokens: 1_000_000,
        completionTokens: 0,
        totalTokens: 1_000_000,
        model: "gpt-4o",
      },
      pricing,
    );
    expect(cost).toBeCloseTo(10, 10);
  });

  it("respects both input and output pricing", () => {
    const cost = calculateCost(
      {
        promptTokens: 1_000_000,
        completionTokens: 1_000_000,
        totalTokens: 2_000_000,
        model: "gpt-4o",
      },
      pricing,
    );
    // 10 + 30 = 40
    expect(cost).toBeCloseTo(40, 10);
  });

  it("returns 0 for zero tokens", () => {
    const cost = calculateCost(
      {
        promptTokens: 0,
        completionTokens: 0,
        totalTokens: 0,
        model: "gpt-4o",
      },
      pricing,
    );
    expect(cost).toBe(0);
  });

  it("handles fractional millions correctly", () => {
    const cost = calculateCost(
      {
        promptTokens: 500_000,
        completionTokens: 250_000,
        totalTokens: 750_000,
        model: "gpt-4o",
      },
      pricing,
    );
    // 0.5 * 10 + 0.25 * 30 = 5 + 7.5 = 12.5
    expect(cost).toBeCloseTo(12.5, 10);
  });
});

describe("getModelPricing", () => {
  beforeEach((): void => {
    vi.clearAllMocks();
  });

  it("returns cached value on Redis hit", async () => {
    const cachedPricing: ModelPricing = {
      inputPricePerMillion: 5.0,
      outputPricePerMillion: 15.0,
      currency: "USD",
    };
    const redis = {
      get: vi.fn().mockResolvedValue(JSON.stringify(cachedPricing)),
      set: vi.fn(),
    };
    const prisma = {
      modelConfig: { findUnique: vi.fn() },
    };

    const result = await getModelPricing("gpt-4o", { redis, prisma } as never);

    expect(result).toEqual(cachedPricing);
    expect(prisma.modelConfig.findUnique).not.toHaveBeenCalled();
  });

  it("queries Prisma on Redis miss and caches with 3600s TTL", async () => {
    const dbPricing = {
      modelName: "gpt-4o",
      inputPricePerMillion: 2.5,
      outputPricePerMillion: 10.0,
      currency: "USD",
    };
    const redis = {
      get: vi.fn().mockResolvedValue(null),
      set: vi.fn().mockResolvedValue("OK"),
    };
    const prisma = {
      modelConfig: {
        findUnique: vi.fn().mockResolvedValue(dbPricing),
      },
    };

    const result = await getModelPricing("gpt-4o", { redis, prisma } as never);

    expect(result).toEqual({
      inputPricePerMillion: 2.5,
      outputPricePerMillion: 10.0,
      currency: "USD",
    });
    expect(prisma.modelConfig.findUnique).toHaveBeenCalledWith({
      where: { modelName: "gpt-4o" },
    });
    expect(redis.set).toHaveBeenCalledOnce();
    expect(redis.set.mock.calls[0]?.[2]).toEqual({ ex: 3600 });
  });

  it("returns DEFAULT_PRICING when model not found in Prisma", async () => {
    const redis = {
      get: vi.fn().mockResolvedValue(null),
      set: vi.fn().mockResolvedValue("OK"),
    };
    const prisma = {
      modelConfig: {
        findUnique: vi.fn().mockResolvedValue(null),
      },
    };

    const result = await getModelPricing("unknown-model", {
      redis,
      prisma,
    } as never);

    expect(result).toEqual(DEFAULT_PRICING);
  });

  it("caches default pricing too so we don't hit Prisma repeatedly", async () => {
    const redis = {
      get: vi.fn().mockResolvedValue(null),
      set: vi.fn().mockResolvedValue("OK"),
    };
    const prisma = {
      modelConfig: {
        findUnique: vi.fn().mockResolvedValue(null),
      },
    };

    await getModelPricing("unknown-model", { redis, prisma } as never);

    expect(redis.set).toHaveBeenCalledOnce();
  });

  it("survives malformed JSON in the Redis cache by falling back to Prisma", async () => {
    const redis = {
      get: vi.fn().mockResolvedValue("not-valid-json"),
      set: vi.fn().mockResolvedValue("OK"),
    };
    const prisma = {
      modelConfig: {
        findUnique: vi.fn().mockResolvedValue(null),
      },
    };

    const result = await getModelPricing("gpt-4o", { redis, prisma } as never);

    expect(result).toEqual(DEFAULT_PRICING);
    expect(prisma.modelConfig.findUnique).toHaveBeenCalledOnce();
  });
});
