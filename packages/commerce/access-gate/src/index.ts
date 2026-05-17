import { createHash, randomBytes } from "node:crypto";

export type AccessInviteScope = "platform" | "tenant";
export type AccessInviteStatus = "active" | "redeemed" | "revoked" | "expired";

export interface AccessInviteCode {
  id: string;
  codeHash: string;
  codePrefix: string;
  scope: AccessInviteScope;
  tenantId?: string;
  issuedByUserId: string;
  issuedToEmail?: string;
  status: AccessInviteStatus;
  maxRedemptions: number;
  redemptionCount: number;
  expiresAt?: Date;
  revokedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
  metadata?: Record<string, unknown>;
}

export interface AccessInviteRedemption {
  id: string;
  inviteCodeId: string;
  userId: string;
  tenantId?: string;
  email?: string;
  ipAddress?: string;
  redeemedAt: Date;
  metadata?: Record<string, unknown>;
}

export interface IssuedAccessInvite {
  plaintextCode: string;
  invite: AccessInviteCode;
}

export interface AccessInviteIssueInput {
  count: number;
  issuedByUserId: string;
  scope: AccessInviteScope;
  tenantId?: string;
  issuedToEmail?: string;
  expiresAt?: Date;
  maxRedemptions?: number;
  metadata?: Record<string, unknown>;
}

export interface AccessInviteRedeemInput {
  plaintextCode: string;
  redeemedByUserId: string;
  tenantId?: string;
  email?: string;
  ipAddress?: string;
  metadata?: Record<string, unknown>;
}

export interface AccessInviteRevokeInput {
  plaintextCode: string;
  revokedByUserId: string;
}

export interface AccessInviteValidateInput {
  plaintextCode: string;
  tenantId?: string;
  email?: string;
}

export interface AccessInviteRedeemResult {
  status: "redeemed";
  scope: AccessInviteScope;
  tenantId?: string;
  invite: AccessInviteCode;
  redemption: AccessInviteRedemption;
}

export interface AccessInviteStore {
  countIssuedByUser(issuedByUserId: string): Promise<number>;
  createMany(input: AccessInviteCode[]): Promise<AccessInviteCode[]>;
  findByHash(codeHash: string): Promise<AccessInviteCode | null>;
  redeemByHash(
    codeHash: string,
    input: Omit<AccessInviteRedeemInput, "plaintextCode">,
    now: Date,
  ): Promise<AccessInviteRedeemResult>;
  revokeByHash(codeHash: string, revokedAt: Date): Promise<AccessInviteCode>;
}

export interface PrismaAccessGateClient {
  accessInviteCode: {
    count(args: { where: { issuedByUserId: string } }): Promise<number>;
    createMany(args: { data: Record<string, unknown>[] }): Promise<{ count: number }>;
    findUnique(args: { where: { codeHash: string } }): Promise<Record<string, unknown> | null>;
    updateMany(args: {
      where: { id: string; status: string; redemptionCount: number };
      data: Record<string, unknown>;
    }): Promise<{ count: number }>;
    update(args: {
      where: { codeHash: string };
      data: Record<string, unknown>;
    }): Promise<Record<string, unknown>>;
  };
  accessInviteRedemption: {
    create(args: { data: Record<string, unknown> }): Promise<Record<string, unknown>>;
  };
  $transaction?<T>(fn: (tx: PrismaAccessGateClient) => Promise<T>): Promise<T>;
}

export interface AccessGateConfig {
  store: AccessInviteStore;
  issuerQuota: number;
  now?: () => Date;
  generateCode?: () => string;
}

function newId(prefix: string): string {
  return `${prefix}_${Date.now().toString(36)}_${randomBytes(8).toString("hex")}`;
}

export function generateInviteCode(): string {
  return `neb_${randomBytes(16).toString("hex")}`;
}

export async function hashInviteCode(plaintextCode: string): Promise<string> {
  return createHash("sha256").update(plaintextCode.trim().toLowerCase()).digest("hex");
}

function prefixFor(plaintextCode: string): string {
  return plaintextCode.trim().toLowerCase().slice(0, 12);
}

function assertIssueInput(input: AccessInviteIssueInput): void {
  if (!Number.isInteger(input.count) || input.count < 1) {
    throw new Error("count must be a positive integer");
  }
  if (!input.issuedByUserId.trim()) {
    throw new Error("issuedByUserId is required");
  }
  if (input.scope === "tenant" && !input.tenantId?.trim()) {
    throw new Error("tenantId is required for tenant scoped invites");
  }
}

function assertRedeemable(
  invite: AccessInviteCode | null,
  input: Omit<AccessInviteRedeemInput, "plaintextCode"> | AccessInviteValidateInput,
  now: Date,
): asserts invite is AccessInviteCode {
  if (!invite) {
    throw new Error("Invite code not found");
  }
  if (invite.status !== "active") {
    throw new Error("Invite code is not active");
  }
  if (invite.expiresAt && invite.expiresAt.getTime() <= now.getTime()) {
    throw new Error("Invite code has expired");
  }
  if (invite.scope === "tenant" && input.tenantId !== invite.tenantId) {
    throw new Error("Invite code does not belong to this tenant");
  }
  if (
    invite.issuedToEmail &&
    input.email &&
    invite.issuedToEmail.toLowerCase().trim() !== input.email.toLowerCase().trim()
  ) {
    throw new Error("Invite code was issued to a different email");
  }
}

export class MemoryAccessInviteStore implements AccessInviteStore {
  private invites = new Map<string, AccessInviteCode>();
  private redemptions: AccessInviteRedemption[] = [];

  async countIssuedByUser(issuedByUserId: string): Promise<number> {
    return [...this.invites.values()].filter((invite) => invite.issuedByUserId === issuedByUserId)
      .length;
  }

  async createMany(input: AccessInviteCode[]): Promise<AccessInviteCode[]> {
    for (const invite of input) {
      this.invites.set(invite.codeHash, invite);
    }
    return input;
  }

  async findByHash(codeHash: string): Promise<AccessInviteCode | null> {
    return this.invites.get(codeHash) ?? null;
  }

  async redeemByHash(
    codeHash: string,
    input: Omit<AccessInviteRedeemInput, "plaintextCode">,
    now: Date,
  ): Promise<AccessInviteRedeemResult> {
    const invite = this.invites.get(codeHash) ?? null;
    assertRedeemable(invite, input, now);

    const redemption: AccessInviteRedemption = {
      id: newId("air"),
      inviteCodeId: invite.id,
      userId: input.redeemedByUserId,
      redeemedAt: now,
      ...(input.tenantId !== undefined ? { tenantId: input.tenantId } : {}),
      ...(input.email !== undefined ? { email: input.email.toLowerCase().trim() } : {}),
      ...(input.ipAddress !== undefined ? { ipAddress: input.ipAddress } : {}),
      ...(input.metadata !== undefined ? { metadata: input.metadata } : {}),
    };

    const nextRedemptionCount = invite.redemptionCount + 1;
    const updatedInvite: AccessInviteCode = {
      ...invite,
      redemptionCount: nextRedemptionCount,
      status: nextRedemptionCount >= invite.maxRedemptions ? "redeemed" : "active",
      updatedAt: now,
    };

    this.invites.set(codeHash, updatedInvite);
    this.redemptions.push(redemption);

    return {
      status: "redeemed",
      scope: updatedInvite.scope,
      invite: updatedInvite,
      redemption,
      ...(updatedInvite.tenantId !== undefined ? { tenantId: updatedInvite.tenantId } : {}),
    };
  }

  async revokeByHash(codeHash: string, revokedAt: Date): Promise<AccessInviteCode> {
    const invite = this.invites.get(codeHash);
    if (!invite) {
      throw new Error("Invite code not found");
    }
    if (invite.status !== "active") {
      throw new Error("Invite code is not active");
    }
    const updatedInvite: AccessInviteCode = {
      ...invite,
      status: "revoked",
      revokedAt,
      updatedAt: revokedAt,
    };
    this.invites.set(codeHash, updatedInvite);
    return updatedInvite;
  }
}

export function createMemoryAccessInviteStore(): MemoryAccessInviteStore {
  return new MemoryAccessInviteStore();
}

function toPrismaScope(scope: AccessInviteScope): "PLATFORM" | "TENANT" {
  return scope === "tenant" ? "TENANT" : "PLATFORM";
}

function fromPrismaScope(scope: unknown): AccessInviteScope {
  return String(scope).toUpperCase() === "TENANT" ? "tenant" : "platform";
}

function toPrismaStatus(status: AccessInviteStatus): "ACTIVE" | "REDEEMED" | "REVOKED" | "EXPIRED" {
  switch (status) {
    case "redeemed":
      return "REDEEMED";
    case "revoked":
      return "REVOKED";
    case "expired":
      return "EXPIRED";
    default:
      return "ACTIVE";
  }
}

function fromPrismaStatus(status: unknown): AccessInviteStatus {
  switch (String(status).toUpperCase()) {
    case "REDEEMED":
      return "redeemed";
    case "REVOKED":
      return "revoked";
    case "EXPIRED":
      return "expired";
    default:
      return "active";
  }
}

function optionalString(value: unknown): string | undefined {
  return typeof value === "string" && value.length > 0 ? value : undefined;
}

function optionalDate(value: unknown): Date | undefined {
  if (value === null || value === undefined) return undefined;
  return value instanceof Date ? value : new Date(String(value));
}

function requiredDate(value: unknown): Date {
  const date = optionalDate(value);
  if (!date) throw new Error("Invalid Prisma invite row: missing date");
  return date;
}

function jsonObject(value: unknown): Record<string, unknown> | undefined {
  if (!value || typeof value !== "object" || Array.isArray(value)) return undefined;
  return value as Record<string, unknown>;
}

function numberValue(value: unknown, fallback: number): number {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

function mapPrismaInvite(row: Record<string, unknown>): AccessInviteCode {
  if (typeof row.id !== "string" || typeof row.codeHash !== "string") {
    throw new Error("Invalid Prisma invite row");
  }

  const tenantId = optionalString(row.tenantId);
  const issuedToEmail = optionalString(row.issuedToEmail);
  const expiresAt = optionalDate(row.expiresAt);
  const revokedAt = optionalDate(row.revokedAt);
  const metadata = jsonObject(row.metadata);

  return {
    id: row.id,
    codeHash: row.codeHash,
    codePrefix: typeof row.codePrefix === "string" ? row.codePrefix : "",
    scope: fromPrismaScope(row.scope),
    issuedByUserId: typeof row.issuedByUserId === "string" ? row.issuedByUserId : "",
    status: fromPrismaStatus(row.status),
    maxRedemptions: numberValue(row.maxRedemptions, 1),
    redemptionCount: numberValue(row.redemptionCount, 0),
    createdAt: requiredDate(row.createdAt),
    updatedAt: requiredDate(row.updatedAt),
    ...(tenantId !== undefined ? { tenantId } : {}),
    ...(issuedToEmail !== undefined ? { issuedToEmail } : {}),
    ...(expiresAt !== undefined ? { expiresAt } : {}),
    ...(revokedAt !== undefined ? { revokedAt } : {}),
    ...(metadata !== undefined ? { metadata } : {}),
  };
}

function mapInviteToPrisma(invite: AccessInviteCode): Record<string, unknown> {
  return {
    id: invite.id,
    codeHash: invite.codeHash,
    codePrefix: invite.codePrefix,
    scope: toPrismaScope(invite.scope),
    tenantId: invite.tenantId ?? null,
    issuedByUserId: invite.issuedByUserId,
    issuedToEmail: invite.issuedToEmail ?? null,
    status: toPrismaStatus(invite.status),
    maxRedemptions: invite.maxRedemptions,
    redemptionCount: invite.redemptionCount,
    expiresAt: invite.expiresAt ?? null,
    revokedAt: invite.revokedAt ?? null,
    metadata: invite.metadata ?? {},
    createdAt: invite.createdAt,
    updatedAt: invite.updatedAt,
  };
}

async function withPrismaTransaction<T>(
  client: PrismaAccessGateClient,
  fn: (tx: PrismaAccessGateClient) => Promise<T>,
): Promise<T> {
  return client.$transaction ? client.$transaction(fn) : fn(client);
}

export function createPrismaAccessInviteStore(client: PrismaAccessGateClient): AccessInviteStore {
  return {
    countIssuedByUser(issuedByUserId: string): Promise<number> {
      return client.accessInviteCode.count({ where: { issuedByUserId } });
    },

    async createMany(input: AccessInviteCode[]): Promise<AccessInviteCode[]> {
      await client.accessInviteCode.createMany({ data: input.map(mapInviteToPrisma) });
      return input;
    },

    async findByHash(codeHash: string): Promise<AccessInviteCode | null> {
      const row = await client.accessInviteCode.findUnique({ where: { codeHash } });
      return row ? mapPrismaInvite(row) : null;
    },

    async redeemByHash(
      codeHash: string,
      input: Omit<AccessInviteRedeemInput, "plaintextCode">,
      now: Date,
    ): Promise<AccessInviteRedeemResult> {
      return withPrismaTransaction(client, async (tx) => {
        const row = await tx.accessInviteCode.findUnique({ where: { codeHash } });
        const invite = row ? mapPrismaInvite(row) : null;
        assertRedeemable(invite, input, now);

        const nextRedemptionCount = invite.redemptionCount + 1;
        const updatedInvite: AccessInviteCode = {
          ...invite,
          redemptionCount: nextRedemptionCount,
          status: nextRedemptionCount >= invite.maxRedemptions ? "redeemed" : "active",
          updatedAt: now,
        };

        const updated = await tx.accessInviteCode.updateMany({
          where: {
            id: invite.id,
            status: toPrismaStatus(invite.status),
            redemptionCount: invite.redemptionCount,
          },
          data: {
            redemptionCount: updatedInvite.redemptionCount,
            status: toPrismaStatus(updatedInvite.status),
            updatedAt: now,
          },
        });

        if (updated.count !== 1) {
          throw new Error("Invite code is not active");
        }

        const redemption: AccessInviteRedemption = {
          id: newId("air"),
          inviteCodeId: invite.id,
          userId: input.redeemedByUserId,
          redeemedAt: now,
          ...(input.tenantId !== undefined ? { tenantId: input.tenantId } : {}),
          ...(input.email !== undefined ? { email: input.email.toLowerCase().trim() } : {}),
          ...(input.ipAddress !== undefined ? { ipAddress: input.ipAddress } : {}),
          ...(input.metadata !== undefined ? { metadata: input.metadata } : {}),
        };

        await tx.accessInviteRedemption.create({
          data: {
            id: redemption.id,
            inviteCodeId: redemption.inviteCodeId,
            userId: redemption.userId,
            tenantId: redemption.tenantId ?? null,
            email: redemption.email ?? null,
            ipAddress: redemption.ipAddress ?? null,
            redeemedAt: redemption.redeemedAt,
            metadata: redemption.metadata ?? {},
          },
        });

        return {
          status: "redeemed",
          scope: updatedInvite.scope,
          invite: updatedInvite,
          redemption,
          ...(updatedInvite.tenantId !== undefined ? { tenantId: updatedInvite.tenantId } : {}),
        };
      });
    },

    async revokeByHash(codeHash: string, revokedAt: Date): Promise<AccessInviteCode> {
      const invite = await this.findByHash(codeHash);
      if (!invite) {
        throw new Error("Invite code not found");
      }
      if (invite.status !== "active") {
        throw new Error("Invite code is not active");
      }
      const row = await client.accessInviteCode.update({
        where: { codeHash },
        data: {
          status: "REVOKED",
          revokedAt,
          updatedAt: revokedAt,
        },
      });
      return mapPrismaInvite(row);
    },
  };
}

export function createAccessGate(config: AccessGateConfig) {
  const now = config.now ?? (() => new Date());
  const generateCode = config.generateCode ?? generateInviteCode;

  return {
    async issueBatch(input: AccessInviteIssueInput): Promise<IssuedAccessInvite[]> {
      assertIssueInput(input);

      const alreadyIssued = await config.store.countIssuedByUser(input.issuedByUserId);
      if (alreadyIssued + input.count > config.issuerQuota) {
        throw new Error("Invite quota exceeded");
      }

      const createdAt = now();
      const issued: IssuedAccessInvite[] = [];
      const invites: AccessInviteCode[] = [];

      for (let index = 0; index < input.count; index += 1) {
        const plaintextCode = generateCode();
        const invite: AccessInviteCode = {
          id: newId("aic"),
          codeHash: await hashInviteCode(plaintextCode),
          codePrefix: prefixFor(plaintextCode),
          scope: input.scope,
          issuedByUserId: input.issuedByUserId,
          status: "active",
          maxRedemptions: input.maxRedemptions ?? 1,
          redemptionCount: 0,
          createdAt,
          updatedAt: createdAt,
          ...(input.tenantId !== undefined ? { tenantId: input.tenantId } : {}),
          ...(input.issuedToEmail !== undefined
            ? { issuedToEmail: input.issuedToEmail.toLowerCase().trim() }
            : {}),
          ...(input.expiresAt !== undefined ? { expiresAt: input.expiresAt } : {}),
          ...(input.metadata !== undefined ? { metadata: input.metadata } : {}),
        };
        invites.push(invite);
        issued.push({ plaintextCode, invite });
      }

      await config.store.createMany(invites);
      return issued;
    },

    async redeem(input: AccessInviteRedeemInput): Promise<AccessInviteRedeemResult> {
      const codeHash = await hashInviteCode(input.plaintextCode);
      return config.store.redeemByHash(
        codeHash,
        {
          redeemedByUserId: input.redeemedByUserId,
          ...(input.tenantId !== undefined ? { tenantId: input.tenantId } : {}),
          ...(input.email !== undefined ? { email: input.email } : {}),
          ...(input.ipAddress !== undefined ? { ipAddress: input.ipAddress } : {}),
          ...(input.metadata !== undefined ? { metadata: input.metadata } : {}),
        },
        now(),
      );
    },

    async validate(input: AccessInviteValidateInput): Promise<AccessInviteCode> {
      const codeHash = await hashInviteCode(input.plaintextCode);
      const invite = await config.store.findByHash(codeHash);
      assertRedeemable(invite, input, now());
      return invite;
    },

    async revoke(input: AccessInviteRevokeInput): Promise<AccessInviteCode> {
      const codeHash = await hashInviteCode(input.plaintextCode);
      return config.store.revokeByHash(codeHash, now());
    },
  };
}
