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

export function hashApiKeyPlaintext(plaintext: string): string {
  return createHash("sha256").update(plaintext).digest("hex");
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
