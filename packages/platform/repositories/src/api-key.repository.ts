import { createHash } from "node:crypto";
import type { PrismaClient } from "@nebutra/db";

/**
 * Repository for the shared `APIKey` table.
 *
 * One table serves every Nebutra product surface (app settings, gateway,
 * Router console): a key issued anywhere is a row here, scoped by tenant.
 * Plaintext is never stored — callers hash before lookup, and `create` takes
 * the hash the issuer already computed.
 */

export interface ApiKeySummary {
  id: string;
  name: string;
  keyPrefix: string;
  scopes: string[];
  rateLimitRps: number;
  lastUsedAt: Date | null;
  expiresAt: Date | null;
  createdAt: Date;
}

/**
 * What the console needs to render one row: the key, its ceilings and what it
 * has spent against them.
 *
 * `status` collapses four columns into the one word the customer reads. The
 * order matters: revoked is terminal and wins over everything, then disabled
 * (reversible), then expired (a fact about the clock, not a decision).
 */
export type ApiKeyStatus = "active" | "disabled" | "expired" | "revoked";

export interface ApiKeyDetail extends ApiKeySummary {
  status: ApiKeyStatus;
  saveLogs: boolean;
  disabledAt: Date | null;
  revokedAt: Date | null;
  limits: { total: number | null; daily: number | null };
  /** `daily` is zero once the stored counter belongs to an earlier UTC day. */
  cost: { daily: number; total: number };
}

export interface UpdateApiKeyData {
  name?: string;
  rateLimitRps?: number;
  expiresAt?: Date | null;
  saveLogs?: boolean;
  limitTotal?: number | null;
  limitDaily?: number | null;
  /** True disables (reversible); false re-enables. Revocation is elsewhere. */
  disabled?: boolean;
}

export interface ActiveApiKey extends ApiKeySummary {
  tenantId: string;
  createdById: string | null;
}

export interface CreateApiKeyData {
  name: string;
  keyHash: string;
  keyPrefix: string;
  tenantId: string;
  createdById?: string | null;
  scopes?: string[];
  rateLimitRps?: number;
  expiresAt?: Date | null;
  saveLogs?: boolean;
  limitTotal?: number | null;
  limitDaily?: number | null;
}

const SUMMARY_SELECT = {
  id: true,
  name: true,
  keyPrefix: true,
  scopes: true,
  rateLimitRps: true,
  lastUsedAt: true,
  expiresAt: true,
  createdAt: true,
} as const;

const DETAIL_SELECT = {
  ...SUMMARY_SELECT,
  saveLogs: true,
  disabledAt: true,
  revokedAt: true,
  limitTotal: true,
  limitDaily: true,
  costTotal: true,
  costDaily: true,
  costDailyResetAt: true,
} as const;

export function hashApiKeyPlaintext(plaintext: string): string {
  return createHash("sha256").update(plaintext).digest("hex");
}

/** Midnight UTC of the day `at` falls in — the daily counter's epoch. */
function startOfUtcDay(at: Date): Date {
  return new Date(Date.UTC(at.getUTCFullYear(), at.getUTCMonth(), at.getUTCDate()));
}

function decimal(value: { toString(): string } | null | undefined): number | null {
  return value === null || value === undefined ? null : Number(value.toString());
}

function statusOf(
  row: { revokedAt: Date | null; disabledAt: Date | null; expiresAt: Date | null },
  now: Date,
): ApiKeyStatus {
  if (row.revokedAt) return "revoked";
  if (row.disabledAt) return "disabled";
  if (row.expiresAt && row.expiresAt.getTime() < now.getTime()) return "expired";
  return "active";
}

export class ApiKeyRepository {
  constructor(private readonly prisma: PrismaClient) {}

  /**
   * Resolve a key by its SHA-256 hash. Returns null for unknown, revoked, or
   * expired keys so the edge has exactly one branch to reject on.
   */
  async findActiveByHash(keyHash: string, now: Date = new Date()): Promise<ActiveApiKey | null> {
    const row = await this.prisma.aPIKey.findUnique({
      where: { keyHash },
      select: { ...SUMMARY_SELECT, tenantId: true, createdById: true, revokedAt: true },
    });
    if (!row) return null;
    if (row.revokedAt) return null;
    if (row.expiresAt && row.expiresAt.getTime() < now.getTime()) return null;
    const { revokedAt: _revokedAt, ...active } = row;
    return active;
  }

  async listByTenant(tenantId: string): Promise<ApiKeySummary[]> {
    return this.prisma.aPIKey.findMany({
      where: { tenantId, revokedAt: null },
      orderBy: { createdAt: "desc" },
      select: SUMMARY_SELECT,
    });
  }

  /** The console row: ceilings, spend and one readable status. */
  async listDetailByTenant(tenantId: string, now: Date = new Date()): Promise<ApiKeyDetail[]> {
    const rows = await this.prisma.aPIKey.findMany({
      where: { tenantId, revokedAt: null },
      orderBy: { createdAt: "desc" },
      select: DETAIL_SELECT,
    });
    return rows.map((row) => this.toDetail(row, now));
  }

  async findDetail(
    tenantId: string,
    id: string,
    now: Date = new Date(),
  ): Promise<ApiKeyDetail | null> {
    const row = await this.prisma.aPIKey.findFirst({
      where: { id, tenantId },
      select: DETAIL_SELECT,
    });
    return row ? this.toDetail(row, now) : null;
  }

  /**
   * Patch one key, tenant-scoped. Returns null when nothing matched, so a
   * caller can never learn that another tenant's key id exists.
   *
   * A revoked key is not patchable: revocation is terminal, and letting a
   * rename or a limit change land on one would suggest otherwise.
   */
  async update(
    tenantId: string,
    id: string,
    data: UpdateApiKeyData,
    now: Date = new Date(),
  ): Promise<ApiKeyDetail | null> {
    const updated = await this.prisma.aPIKey.updateMany({
      where: { id, tenantId, revokedAt: null },
      data: {
        ...(data.name !== undefined ? { name: data.name } : {}),
        ...(data.rateLimitRps !== undefined ? { rateLimitRps: data.rateLimitRps } : {}),
        ...(data.expiresAt !== undefined ? { expiresAt: data.expiresAt } : {}),
        ...(data.saveLogs !== undefined ? { saveLogs: data.saveLogs } : {}),
        ...(data.limitTotal !== undefined ? { limitTotal: data.limitTotal } : {}),
        ...(data.limitDaily !== undefined ? { limitDaily: data.limitDaily } : {}),
        ...(data.disabled !== undefined ? { disabledAt: data.disabled ? now : null } : {}),
      },
    });
    if (updated.count === 0) return null;
    return this.findDetail(tenantId, id, now);
  }

  private toDetail(
    row: {
      revokedAt: Date | null;
      disabledAt: Date | null;
      expiresAt: Date | null;
      limitTotal: unknown;
      limitDaily: unknown;
      costTotal: unknown;
      costDaily: unknown;
      costDailyResetAt: Date | null;
    } & ApiKeySummary,
    now: Date,
  ): ApiKeyDetail {
    const stale = !row.costDailyResetAt || row.costDailyResetAt < startOfUtcDay(now);
    return {
      id: row.id,
      name: row.name,
      keyPrefix: row.keyPrefix,
      scopes: row.scopes,
      rateLimitRps: row.rateLimitRps,
      lastUsedAt: row.lastUsedAt,
      expiresAt: row.expiresAt,
      createdAt: row.createdAt,
      status: statusOf(row, now),
      saveLogs: (row as { saveLogs?: boolean }).saveLogs ?? false,
      disabledAt: row.disabledAt,
      revokedAt: row.revokedAt,
      limits: {
        total: decimal(row.limitTotal as { toString(): string } | null),
        daily: decimal(row.limitDaily as { toString(): string } | null),
      },
      cost: {
        daily: stale ? 0 : Number((row.costDaily as { toString(): string }).toString()),
        total: Number((row.costTotal as { toString(): string }).toString()),
      },
    };
  }

  async create(data: CreateApiKeyData): Promise<ApiKeySummary> {
    return this.prisma.aPIKey.create({
      data: {
        name: data.name,
        keyHash: data.keyHash,
        keyPrefix: data.keyPrefix,
        tenantId: data.tenantId,
        createdById: data.createdById ?? null,
        scopes: data.scopes ?? [],
        ...(typeof data.rateLimitRps === "number" ? { rateLimitRps: data.rateLimitRps } : {}),
        ...(data.expiresAt ? { expiresAt: data.expiresAt } : {}),
        ...(data.saveLogs !== undefined ? { saveLogs: data.saveLogs } : {}),
        ...(data.limitTotal !== undefined && data.limitTotal !== null
          ? { limitTotal: data.limitTotal }
          : {}),
        ...(data.limitDaily !== undefined && data.limitDaily !== null
          ? { limitDaily: data.limitDaily }
          : {}),
      },
      select: SUMMARY_SELECT,
    });
  }

  /**
   * Soft-revoke. Tenant-scoped so a caller can never revoke another tenant's
   * key by id. Returns false when nothing matched (unknown id, wrong tenant,
   * or already revoked).
   */
  async revoke(tenantId: string, id: string, at: Date = new Date()): Promise<boolean> {
    const result = await this.prisma.aPIKey.updateMany({
      where: { id, tenantId, revokedAt: null },
      data: { revokedAt: at },
    });
    return result.count > 0;
  }

  /** Fire-and-forget friendly: never throws. */
  async touchLastUsed(id: string, at: Date = new Date()): Promise<void> {
    try {
      await this.prisma.aPIKey.update({ where: { id }, data: { lastUsedAt: at } });
    } catch {
      // A missing row (revoked and purged mid-request) is not worth failing the request.
    }
  }
}
