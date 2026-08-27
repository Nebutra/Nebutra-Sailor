/**
 * @nebutra/waitlist — Pre-launch waitlist with referral tracking
 *
 * Provider-agnostic waitlist system supporting:
 * - Email collection with validation
 * - Position tracking (sequential)
 * - Referral codes with referral count tracking
 * - Admin management (admit, list, stats)
 * - In-memory storage for dev/test, Prisma for production
 *
 * Usage:
 *   import { createWaitlist } from "@nebutra/waitlist";
 *   const waitlist = createWaitlist({ storage: "memory" });
 *   const entry = await waitlist.join({ email: "user@example.com" });
 */

import { z } from "zod";

// ── Types ────────────────────────────────────────────────────────────────────

export interface WaitlistEntry {
  id: string;
  email: string;
  position: number;
  referralCode: string;
  referredBy?: string | undefined;
  referralCount: number;
  status: "waiting" | "admitted";
  metadata?: Record<string, unknown> | undefined;
  createdAt: Date;
  admittedAt?: Date | undefined;
}

export interface JoinOptions {
  email: string;
  referredBy?: string;
  metadata?: Record<string, unknown>;
  onDuplicate?: "error" | "return-existing";
}

export interface ListOptions {
  limit?: number;
  offset?: number;
  status?: "waiting" | "admitted";
}

export interface ListResult {
  entries: WaitlistEntry[];
  total: number;
}

export interface WaitlistStats {
  total: number;
  admitted: number;
  waiting: number;
  topReferrers: { email: string; referralCount: number }[];
}

export interface WaitlistReferralAnalytics {
  totalReferred: number;
  conversionRate: number;
  topReferrers: { email: string; referralCode: string; referralCount: number }[];
  byCampaign: { campaign: string; signups: number; referred: number; admitted: number }[];
}

export interface WaitlistConfig {
  storage?: "memory" | "prisma";
  store?: WaitlistStore;
  notifications?: WaitlistNotificationSink;
}

export interface Waitlist {
  join(opts: JoinOptions): Promise<WaitlistEntry>;
  getByEmail(email: string): Promise<WaitlistEntry | null>;
  getPosition(email: string): Promise<number | null>;
  getStats(): Promise<WaitlistStats>;
  getReferralAnalytics(): Promise<WaitlistReferralAnalytics>;
  admit(email: string): Promise<WaitlistEntry>;
  list(opts?: ListOptions): Promise<ListResult>;
}

export type WaitlistCreateInput = Omit<WaitlistEntry, "id"> & { id?: string };
export type WaitlistUpdateInput = Partial<
  Pick<WaitlistEntry, "referralCount" | "status" | "admittedAt" | "metadata">
>;

export interface WaitlistStore {
  create(input: WaitlistCreateInput): Promise<WaitlistEntry>;
  getByEmail(email: string): Promise<WaitlistEntry | null>;
  getByReferralCode(referralCode: string): Promise<WaitlistEntry | null>;
  update(id: string, input: WaitlistUpdateInput): Promise<WaitlistEntry>;
  list(opts?: ListOptions): Promise<ListResult>;
}

export interface WaitlistNotificationSink {
  sendConfirmation?(entry: WaitlistEntry): Promise<void>;
  sendPositionUpdate?(entry: WaitlistEntry): Promise<void>;
}

// ── Validation ───────────────────────────────────────────────────────────────

const emailSchema = z.string().email("Invalid email format");

// ── Referral code helpers ────────────────────────────────────────────────────

const REFERRAL_CODE_CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

function generateReferralCode(): string {
  let code = "";
  for (let i = 0; i < 8; i++) {
    const index = Math.floor(Math.random() * REFERRAL_CODE_CHARS.length);
    code += REFERRAL_CODE_CHARS[index];
  }
  return code;
}

export function normalizeReferralCode(input: string | null | undefined): string | null {
  const normalized = (input ?? "").replace(/[^a-zA-Z0-9]/g, "").toUpperCase();
  if (!normalized) return null;
  return normalized.slice(0, 40);
}

export function createReferralUrl(input: { baseUrl: string; code: string }): string {
  const code = normalizeReferralCode(input.code);
  if (!code) {
    throw new Error("Referral code is required");
  }

  const url = new URL(input.baseUrl);
  url.pathname = "/refer";
  url.search = "";
  url.searchParams.set("code", code);
  return url.toString();
}

function generateId(): string {
  return `wl_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

// ── In-memory storage ────────────────────────────────────────────────────────

class InMemoryWaitlistStore implements WaitlistStore {
  private entries: WaitlistEntry[] = [];
  private emailIndex = new Map<string, number>();

  async create(input: WaitlistCreateInput): Promise<WaitlistEntry> {
    const entry = { ...input, id: input.id ?? generateId() };
    this.entries.push(entry);
    this.emailIndex.set(entry.email, this.entries.length - 1);
    return entry;
  }

  async getByEmail(email: string): Promise<WaitlistEntry | null> {
    const normalized = email.toLowerCase().trim();
    const idx = this.emailIndex.get(normalized);
    if (idx === undefined) return null;
    return this.entries[idx] ?? null;
  }

  async getByReferralCode(referralCode: string): Promise<WaitlistEntry | null> {
    const normalized = normalizeReferralCode(referralCode);
    if (!normalized) return null;
    return this.entries.find((entry) => entry.referralCode === normalized) ?? null;
  }

  async update(id: string, input: WaitlistUpdateInput): Promise<WaitlistEntry> {
    const idx = this.entries.findIndex((entry) => entry.id === id);
    if (idx < 0) {
      throw new Error("Waitlist entry not found");
    }

    const entry = this.entries[idx];
    if (!entry) {
      throw new Error("Waitlist entry not found");
    }
    const updated: WaitlistEntry = { ...entry, ...input };
    this.entries[idx] = updated;
    return updated;
  }

  async list(opts: ListOptions = {}): Promise<ListResult> {
    const { limit = 50, offset = 0, status } = opts;

    let filtered = this.entries;
    if (status) {
      filtered = this.entries.filter((e) => e.status === status);
    }

    return {
      entries: filtered.slice(offset, offset + limit),
      total: filtered.length,
    };
  }
}

// ── Prisma-compatible storage seam ───────────────────────────────────────────

type PrismaWaitlistRow = {
  id: string;
  email: string;
  position: number;
  referralCode: string;
  referredBy: string | null;
  referralCount: number;
  status: "waiting" | "admitted";
  metadata: Record<string, unknown> | null;
  createdAt: Date;
  admittedAt: Date | null;
};

type PrismaWhereUnique = { id?: string; email?: string; referralCode?: string };

export interface PrismaWaitlistDelegate {
  create(args: { data: Record<string, unknown> }): Promise<PrismaWaitlistRow>;
  findUnique(args: { where: PrismaWhereUnique }): Promise<PrismaWaitlistRow | null>;
  findMany(args?: {
    where?: { status?: "waiting" | "admitted" };
    orderBy?: { position: "asc" | "desc" };
    skip?: number;
    take?: number;
  }): Promise<PrismaWaitlistRow[]>;
  count(args?: { where?: { status?: "waiting" | "admitted" } }): Promise<number>;
  update(args: {
    where: { id: string };
    data: Record<string, unknown>;
  }): Promise<PrismaWaitlistRow>;
}

function mapPrismaRow(row: PrismaWaitlistRow): WaitlistEntry {
  return {
    id: row.id,
    email: row.email,
    position: row.position,
    referralCode: row.referralCode,
    referredBy: row.referredBy ?? undefined,
    referralCount: row.referralCount,
    status: row.status,
    metadata: row.metadata ?? undefined,
    createdAt: row.createdAt,
    admittedAt: row.admittedAt ?? undefined,
  };
}

export function createPrismaWaitlistStore(delegate: PrismaWaitlistDelegate): WaitlistStore {
  return {
    async create(input) {
      const referralCode = normalizeReferralCode(input.referralCode);
      if (!referralCode) {
        throw new Error("Referral code is required");
      }

      const row = await delegate.create({
        data: {
          id: input.id ?? generateId(),
          email: input.email,
          referralCode,
          referralCount: input.referralCount,
          status: input.status,
          createdAt: input.createdAt,
          referredBy: input.referredBy ?? null,
          metadata: input.metadata ?? null,
          admittedAt: input.admittedAt ?? null,
        },
      });
      return mapPrismaRow(row);
    },
    async getByEmail(email) {
      const row = await delegate.findUnique({ where: { email: email.toLowerCase().trim() } });
      return row ? mapPrismaRow(row) : null;
    },
    async getByReferralCode(referralCode) {
      const normalized = normalizeReferralCode(referralCode);
      if (!normalized) return null;
      const row = await delegate.findUnique({ where: { referralCode: normalized } });
      return row ? mapPrismaRow(row) : null;
    },
    async update(id, input) {
      const row = await delegate.update({
        where: { id },
        data: {
          ...input,
          metadata: input.metadata ?? undefined,
          admittedAt: input.admittedAt ?? undefined,
        },
      });
      return mapPrismaRow(row);
    },
    async list(opts = {}) {
      const { limit = 50, offset = 0, status } = opts;
      const where = status ? { status } : undefined;
      const findManyArgs: {
        where?: { status?: "waiting" | "admitted" };
        orderBy?: { position: "asc" | "desc" };
        skip?: number;
        take?: number;
      } = {
        orderBy: { position: "asc" },
        skip: offset,
        take: limit,
      };
      const countArgs: { where?: { status?: "waiting" | "admitted" } } = {};

      if (where) {
        findManyArgs.where = where;
        countArgs.where = where;
      }

      const [entries, total] = await Promise.all([
        delegate.findMany(findManyArgs),
        delegate.count(countArgs),
      ]);
      return { entries: entries.map(mapPrismaRow), total };
    },
  };
}

export function createMemoryWaitlistStore(): WaitlistStore {
  return new InMemoryWaitlistStore();
}

class WaitlistService implements Waitlist {
  constructor(
    private readonly store: WaitlistStore,
    private readonly notifications?: WaitlistNotificationSink,
  ) {}

  async join(opts: JoinOptions): Promise<WaitlistEntry> {
    const email = emailSchema.parse(opts.email.toLowerCase().trim());

    const existingEntry = await this.store.getByEmail(email);
    if (existingEntry) {
      if (opts.onDuplicate === "return-existing") {
        return existingEntry;
      }
      throw new Error("This email is already on the waitlist");
    }

    const attemptedReferralCode = normalizeReferralCode(opts.referredBy);
    const referrer = attemptedReferralCode
      ? await this.store.getByReferralCode(attemptedReferralCode)
      : null;

    if (referrer) {
      await this.store.update(referrer.id, {
        referralCount: referrer.referralCount + 1,
      });
    }

    const existing = await this.store.list({ limit: 0 });
    const metadata = { ...(opts.metadata ?? {}) };
    if (attemptedReferralCode) {
      metadata.attemptedReferralCode = attemptedReferralCode;
    }

    const createInput: WaitlistCreateInput = {
      email,
      position: existing.total + 1,
      referralCode: generateReferralCode(),
      referralCount: 0,
      status: "waiting",
      createdAt: new Date(),
    };

    if (referrer) {
      createInput.referredBy = referrer.referralCode;
    }
    if (Object.keys(metadata).length > 0) {
      createInput.metadata = metadata;
    }

    const entry = await this.store.create(createInput);

    await this.notifications?.sendConfirmation?.(entry);
    await this.notifications?.sendPositionUpdate?.(entry);

    return entry;
  }

  async getByEmail(email: string): Promise<WaitlistEntry | null> {
    return this.store.getByEmail(email);
  }

  async getPosition(email: string): Promise<number | null> {
    const entry = await this.getByEmail(email);
    return entry?.position ?? null;
  }

  async getStats(): Promise<WaitlistStats> {
    const { entries } = await this.store.list({ limit: Number.MAX_SAFE_INTEGER });
    const admitted = entries.filter((entry) => entry.status === "admitted").length;
    const waiting = entries.filter((entry) => entry.status === "waiting").length;

    const topReferrers = [...entries]
      .filter((entry) => entry.referralCount > 0)
      .sort((a, b) => b.referralCount - a.referralCount)
      .slice(0, 10)
      .map((entry) => ({ email: entry.email, referralCount: entry.referralCount }));

    return {
      total: entries.length,
      admitted,
      waiting,
      topReferrers,
    };
  }

  async getReferralAnalytics(): Promise<WaitlistReferralAnalytics> {
    const { entries } = await this.store.list({ limit: Number.MAX_SAFE_INTEGER });
    const referredEntries = entries.filter((entry) => Boolean(entry.referredBy));
    const admittedReferred = referredEntries.filter((entry) => entry.status === "admitted").length;
    const campaigns = new Map<
      string,
      { campaign: string; signups: number; referred: number; admitted: number }
    >();

    for (const entry of entries) {
      const campaign =
        typeof entry.metadata?.campaign === "string" ? entry.metadata.campaign : null;
      if (!campaign) {
        continue;
      }
      const current = campaigns.get(campaign) ?? {
        campaign,
        signups: 0,
        referred: 0,
        admitted: 0,
      };
      current.signups += 1;
      if (entry.referredBy) {
        current.referred += 1;
      }
      if (entry.status === "admitted") {
        current.admitted += 1;
      }
      campaigns.set(campaign, current);
    }

    return {
      totalReferred: referredEntries.length,
      conversionRate: referredEntries.length === 0 ? 0 : admittedReferred / referredEntries.length,
      topReferrers: [...entries]
        .filter((entry) => entry.referralCount > 0)
        .sort((a, b) => b.referralCount - a.referralCount)
        .slice(0, 10)
        .map((entry) => ({
          email: entry.email,
          referralCode: entry.referralCode,
          referralCount: entry.referralCount,
        })),
      byCampaign: [...campaigns.values()].sort((a, b) => b.signups - a.signups),
    };
  }

  async admit(email: string): Promise<WaitlistEntry> {
    const normalized = email.toLowerCase().trim();
    const entry = await this.store.getByEmail(normalized);
    if (!entry) {
      throw new Error("Email not found on the waitlist");
    }

    return this.store.update(entry.id, {
      status: "admitted",
      admittedAt: new Date(),
    });
  }

  async list(opts: ListOptions = {}): Promise<ListResult> {
    return this.store.list(opts);
  }
}

// ── Factory ──────────────────────────────────────────────────────────────────

export function createWaitlist(config: WaitlistConfig): Waitlist {
  if (config.store) {
    return new WaitlistService(config.store, config.notifications);
  }

  if (!config.storage || config.storage === "memory") {
    return new WaitlistService(createMemoryWaitlistStore(), config.notifications);
  }

  throw new Error(
    "Prisma storage requires createWaitlist({ store: createPrismaWaitlistStore(delegate) })",
  );
}
