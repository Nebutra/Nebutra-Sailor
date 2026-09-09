/**
 * The per-request log: what it stores, what it refuses to store, and what the
 * retention sweep is allowed to delete.
 */
import { createPglitePrismaClient, type PrismaTestDatabase } from "@nebutra/db/testing";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import {
  REQUEST_LOG_RETENTION_DAYS,
  RequestLogRepository,
  requestLogExpiryFrom,
} from "../request-log.repository";
import { ROUTER_DDL } from "./router-schema";

const TENANT = "tenant_1";
const OTHER = "tenant_2";
const KEY = "key_a";
const NOW = new Date("2026-09-08T10:00:00Z");

describe("RequestLogRepository (real Prisma over PGlite)", () => {
  let database: PrismaTestDatabase;
  let repository: RequestLogRepository;

  beforeAll(async () => {
    database = await createPglitePrismaClient();
    await database.prisma.$executeRawUnsafe(ROUTER_DDL);
    repository = new RequestLogRepository(database.prisma);
  }, 60_000);

  afterAll(async () => {
    await database?.close();
  });

  beforeEach(async () => {
    await database.prisma.$executeRawUnsafe("TRUNCATE ai_request_logs");
  });

  const entry = (over: Record<string, unknown> = {}) => ({
    requestId: "req_1",
    tenantId: TENANT,
    apiKeyId: KEY,
    model: "gpt-x",
    path: "chat/completions",
    httpStatus: 200,
    status: "success",
    latencyMs: 1_400,
    ttfbMs: 220,
    promptTokens: 100,
    completionTokens: 20,
    totalTokens: 120,
    cachedPromptTokens: 30,
    cacheWriteTokens: 5,
    cost: 0.001_25,
    supplyPath: "channel-7",
    clientIp: "203.0.113.9",
    errorMessage: null,
    saveLogs: true,
    now: NOW,
    ...over,
  });

  describe("record", () => {
    it("stores the whole line when the key keeps logs", async () => {
      await expect(repository.record(entry())).resolves.toBe(true);
      const row = await database.prisma.requestLog.findUnique({ where: { requestId: "req_1" } });
      expect(row).toMatchObject({
        model: "gpt-x",
        path: "chat/completions",
        httpStatus: 200,
        ttfbMs: 220,
        promptTokens: 100,
        cachedPromptTokens: 30,
        cacheWriteTokens: 5,
        supplyPath: "channel-7",
        clientIp: "203.0.113.9",
      });
      expect(Number(row?.cost)).toBeCloseTo(0.00125, 6);
    });

    it("drops every prompt-derived field when the key does not keep logs", async () => {
      await repository.record(entry({ saveLogs: false, errorMessage: "upstream said no" }));
      const row = await database.prisma.requestLog.findUnique({ where: { requestId: "req_1" } });
      // The request still happened and still cost money — that much is the
      // customer's to see. What it was made of is not recorded.
      expect(row).toMatchObject({
        model: "gpt-x",
        httpStatus: 200,
        ttfbMs: 220,
        promptTokens: 0,
        completionTokens: 0,
        totalTokens: 0,
        cachedPromptTokens: 0,
        cacheWriteTokens: 0,
        clientIp: null,
        errorMessage: null,
      });
      expect(Number(row?.cost)).toBeCloseTo(0.00125, 6);
    });

    it("sets the retention horizon from the write time", async () => {
      await repository.record(entry());
      const row = await database.prisma.requestLog.findUnique({ where: { requestId: "req_1" } });
      expect(row?.expiresAt?.toISOString()).toBe(
        requestLogExpiryFrom(NOW, REQUEST_LOG_RETENTION_DAYS).toISOString(),
      );
    });

    it("is a no-op on a replayed request id rather than an error", async () => {
      await repository.record(entry());
      await expect(repository.record(entry({ model: "different" }))).resolves.toBe(false);
      await expect(database.prisma.requestLog.count()).resolves.toBe(1);
    });
  });

  describe("list", () => {
    beforeEach(async () => {
      for (let i = 1; i <= 4; i += 1) {
        await repository.record(
          entry({
            requestId: `req_${i}`,
            path: i % 2 === 0 ? "embeddings" : "chat/completions",
            now: new Date(`2026-09-0${i}T10:00:00Z`),
          }),
        );
        await database.prisma.$executeRawUnsafe(
          `UPDATE ai_request_logs SET created_at = TIMESTAMP '2026-09-0${i} 10:00:00'
             WHERE request_id = 'req_${i}'`,
        );
      }
      await repository.record(entry({ requestId: "req_other", tenantId: OTHER }));
    });

    it("is tenant-scoped and newest first", async () => {
      const { rows } = await repository.list({ tenantId: TENANT });
      expect(rows.map((row) => row.requestId)).toEqual(["req_4", "req_3", "req_2", "req_1"]);
    });

    it("pages on createdAt without repeating a row", async () => {
      const first = await repository.list({ tenantId: TENANT, limit: 2 });
      expect(first.rows.map((row) => row.requestId)).toEqual(["req_4", "req_3"]);
      const second = await repository.list({
        tenantId: TENANT,
        limit: 2,
        cursor: first.nextCursor as string,
      });
      expect(second.rows.map((row) => row.requestId)).toEqual(["req_2", "req_1"]);
      expect(second.nextCursor).toBeNull();
    });

    it("filters by request id and by path", async () => {
      await expect(
        repository.list({ tenantId: TENANT, requestId: "req_2" }),
      ).resolves.toMatchObject({ rows: [{ requestId: "req_2" }] });
      const byPath = await repository.list({ tenantId: TENANT, path: "embeddings" });
      expect(byPath.rows.map((row) => row.requestId)).toEqual(["req_4", "req_2"]);
    });

    it("honours the window", async () => {
      const { rows } = await repository.list({
        tenantId: TENANT,
        from: new Date("2026-09-02T00:00:00Z"),
        to: new Date("2026-09-03T23:59:59Z"),
      });
      expect(rows.map((row) => row.requestId)).toEqual(["req_3", "req_2"]);
    });
  });

  describe("purgeExpired", () => {
    it("deletes rows past their horizon and leaves the rest", async () => {
      await repository.record(entry({ requestId: "old", now: new Date("2026-01-01T00:00:00Z") }));
      await repository.record(entry({ requestId: "fresh", now: NOW }));

      await expect(repository.purgeExpired(NOW)).resolves.toBe(1);
      const left = await database.prisma.requestLog.findMany({ select: { requestId: true } });
      expect(left.map((row) => row.requestId)).toEqual(["fresh"]);
    });

    it("never touches a row that carries no horizon", async () => {
      // The gateway's rows predate `expires_at`. Nobody promised to delete them.
      await database.prisma.$executeRawUnsafe(
        `INSERT INTO ai_request_logs (id, request_id, tenant_id, model, status, created_at)
           VALUES ('l_legacy', 'legacy', '${TENANT}', 'gpt-x', 'success', TIMESTAMP '2020-01-01 00:00:00')`,
      );
      await expect(repository.purgeExpired(NOW)).resolves.toBe(0);
      await expect(database.prisma.requestLog.count()).resolves.toBe(1);
    });

    it("respects the batch ceiling", async () => {
      for (let i = 0; i < 5; i += 1) {
        await repository.record(
          entry({ requestId: `old_${i}`, now: new Date("2026-01-01T00:00:00Z") }),
        );
      }
      await expect(repository.purgeExpired(NOW, 2)).resolves.toBe(2);
      await expect(database.prisma.requestLog.count()).resolves.toBe(3);
    });
  });
});
