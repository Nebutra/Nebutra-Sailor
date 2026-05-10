/**
 * Smoke Tests for API Gateway
 *
 * These tests verify basic functionality without requiring
 * external dependencies (database, redis, etc.)
 */

import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

// Mock environment for tests
beforeAll(() => {
  vi.stubEnv("NODE_ENV", "test");
});

afterAll(() => {
  vi.unstubAllEnvs();
});

describe("API Gateway Smoke Tests", () => {
  describe("Health Endpoints", () => {
    it("should have health check utilities importable", async () => {
      // This is a basic import test
      const healthModule = await import("@nebutra/health");
      expect(healthModule.runHealthChecks).toBeDefined();
      expect(healthModule.createMemoryCheck).toBeDefined();
    });

    it("should run memory health check", async () => {
      const { createMemoryCheck, runHealthChecks } = await import("@nebutra/health");
      const memoryChecker = createMemoryCheck(1024); // 1GB threshold
      const result = await runHealthChecks([memoryChecker]);

      expect(result.status).toBeDefined();
      expect(["healthy", "degraded", "unhealthy"]).toContain(result.status);
      const memoryCheck = result.checks.memory;
      expect(memoryCheck).toBeDefined();
      expect(memoryCheck?.status).toBe("pass");
    });
  });

  describe("Configuration", () => {
    it("should have required environment variable types defined", () => {
      // Test that we can access env vars without crashing
      const nodeEnv = process.env.NODE_ENV;
      expect(nodeEnv).toBe("test");
    });
  });

  describe("Response Format", () => {
    it("should generate correct health response structure", async () => {
      const { runHealthChecks } = await import("@nebutra/health");
      const result = await runHealthChecks([]);

      expect(result).toHaveProperty("status");
      expect(result).toHaveProperty("timestamp");
      expect(result).toHaveProperty("checks");

      // Timestamp should be ISO 8601
      expect(new Date(result.timestamp).toISOString()).toBe(result.timestamp);
    });
  });
});

describe("Utility Functions", () => {
  it("should create HTTP check correctly", async () => {
    const { createHttpCheck } = await import("@nebutra/health");
    const checker = createHttpCheck("test-endpoint", "https://httpbin.org/status/200");

    expect(checker.name).toBe("test-endpoint");
    expect(typeof checker.check).toBe("function");
  });

  it("should create database check correctly", async () => {
    const { createDatabaseCheck } = await import("@nebutra/health");

    // Mock Prisma client
    const mockPrisma = {
      $queryRaw: async () => [{ "?column?": 1 }],
    };

    const checker = createDatabaseCheck(mockPrisma);
    expect(checker.name).toBe("database");

    const result = await checker.check();
    expect(result.status).toBe("pass");
    expect(result.latency_ms).toBeGreaterThanOrEqual(0);
  });

  it("should create Redis check correctly", async () => {
    const { createRedisCheck } = await import("@nebutra/health");

    // Mock Redis client
    const mockRedis = {
      ping: async () => "PONG",
    };

    const checker = createRedisCheck(mockRedis);
    expect(checker.name).toBe("redis");

    const result = await checker.check();
    expect(result.status).toBe("pass");
  });
});
