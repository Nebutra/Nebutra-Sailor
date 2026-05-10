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

export interface WaitlistConfig {
  storage: "memory" | "prisma";
}

export interface Waitlist {
  join(opts: JoinOptions): Promise<WaitlistEntry>;
  getByEmail(email: string): Promise<WaitlistEntry | null>;
  getPosition(email: string): Promise<number | null>;
  getStats(): Promise<WaitlistStats>;
  admit(email: string): Promise<WaitlistEntry>;
  list(opts?: ListOptions): Promise<ListResult>;
}

// ── Validation ───────────────────────────────────────────────────────────────

const emailSchema = z.string().email("Invalid email format");

// ── Referral code generation ─────────────────────────────────────────────────

function generateReferralCode(): string {
  const chars = "abcdefghijklmnopqrstuvwxyz0123456789";
  let code = "";
  for (let i = 0; i < 8; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
}

function generateId(): string {
  return `wl_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

// ── In-memory storage ────────────────────────────────────────────────────────

class InMemoryWaitlist implements Waitlist {
  private entries: WaitlistEntry[] = [];
  private emailIndex = new Map<string, number>();

  async join(opts: JoinOptions): Promise<WaitlistEntry> {
    const email = emailSchema.parse(opts.email.toLowerCase().trim());

    if (this.emailIndex.has(email)) {
      throw new Error("This email is already on the waitlist");
    }

    // Track referral
    if (opts.referredBy) {
      const referrerIdx = this.entries.findIndex((e) => e.referralCode === opts.referredBy);
      if (referrerIdx >= 0) {
        const referrer = this.entries[referrerIdx];
        if (referrer) {
          this.entries[referrerIdx] = {
            ...referrer,
            referralCount: referrer.referralCount + 1,
          };
        }
      }
    }

    const entry: WaitlistEntry = {
      id: generateId(),
      email,
      position: this.entries.length + 1,
      referralCode: generateReferralCode(),
      referredBy: opts.referredBy,
      referralCount: 0,
      status: "waiting",
      metadata: opts.metadata,
      createdAt: new Date(),
    };

    this.entries.push(entry);
    this.emailIndex.set(email, this.entries.length - 1);

    return entry;
  }

  async getByEmail(email: string): Promise<WaitlistEntry | null> {
    const normalized = email.toLowerCase().trim();
    const idx = this.emailIndex.get(normalized);
    if (idx === undefined) return null;
    return this.entries[idx] ?? null;
  }

  async getPosition(email: string): Promise<number | null> {
    const entry = await this.getByEmail(email);
    return entry?.position ?? null;
  }

  async getStats(): Promise<WaitlistStats> {
    const admitted = this.entries.filter((e) => e.status === "admitted").length;
    const waiting = this.entries.filter((e) => e.status === "waiting").length;

    const topReferrers = [...this.entries]
      .filter((e) => e.referralCount > 0)
      .sort((a, b) => b.referralCount - a.referralCount)
      .slice(0, 10)
      .map((e) => ({ email: e.email, referralCount: e.referralCount }));

    return {
      total: this.entries.length,
      admitted,
      waiting,
      topReferrers,
    };
  }

  async admit(email: string): Promise<WaitlistEntry> {
    const normalized = email.toLowerCase().trim();
    const idx = this.emailIndex.get(normalized);
    if (idx === undefined) {
      throw new Error("Email not found on the waitlist");
    }

    const entry = this.entries[idx]!;
    const updated: WaitlistEntry = {
      ...entry,
      status: "admitted",
      admittedAt: new Date(),
    };
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

// ── Factory ──────────────────────────────────────────────────────────────────

export function createWaitlist(config: WaitlistConfig): Waitlist {
  if (config.storage === "memory") {
    return new InMemoryWaitlist();
  }

  // Prisma storage would be implemented separately
  throw new Error(`Waitlist storage "${config.storage}" not yet implemented`);
}
