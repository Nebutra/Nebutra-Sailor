/**
 * Referral store — invite-to-earn persistence for `/api/referrals`.
 *
 * Growth/referrals is NOT one of the `repositorySeam.coreDomains` in
 * `governance.config.json`, so direct Prisma access is allowed here. The narrow
 * `ReferralDb` interface still mirrors only the delegate methods this module
 * uses, which keeps the store unit-testable against an in-memory fake and
 * matches the `CofounderDb` / `StartupOSDb` precedent.
 *
 * Data model note: `Referral` carries no `tenant_id` column, so tenant scoping
 * is done through the referrer: every read is bounded to the user ids that
 * belong to the requesting organization. Route handlers pass a tenant-scoped
 * client from `getTenantDb(orgId)`.
 *
 * This module is import-safe on the client (pure types + pure functions plus
 * delegate calls) — the component tree imports `REFERRAL_LEVELS` from here.
 */

export type ReferralStatus = "pending" | "claimed" | "expired";

export interface ReferralRow {
  readonly id: string;
  readonly code: string;
  readonly referrerUserId: string;
  readonly referredEmail: string | null;
  readonly referredUserId: string | null;
  readonly status: string;
  readonly rewardCredits: number;
  readonly level: number;
  readonly expiresAt: Date | null;
  readonly claimedAt: Date | null;
  readonly createdAt: Date;
}

export interface ReferralDb {
  readonly referral: {
    findFirst(args: {
      where: {
        referrerUserId?: string;
        referredUserId?: string;
        status?: string;
        OR?: ReadonlyArray<{ expiresAt: null } | { expiresAt: { gt: Date } }>;
      };
      orderBy?: { createdAt: "asc" | "desc" };
    }): Promise<ReferralRow | null>;
    findUnique(args: { where: { code: string } }): Promise<ReferralRow | null>;
    findMany(args: {
      where: { referrerUserId: { in: string[] } };
      orderBy?: { createdAt: "asc" | "desc" };
      take?: number;
    }): Promise<ReferralRow[]>;
    create(args: {
      data: {
        code: string;
        referrerUserId: string;
        level: number;
        expiresAt: Date;
      };
    }): Promise<ReferralRow>;
    updateMany(args: {
      where: { code: string; status: string; referredUserId: null };
      data: {
        status: string;
        referredUserId: string;
        claimedAt: Date;
        rewardCredits: number;
      };
    }): Promise<{ count: number }>;
  };
  readonly organizationMember: {
    findMany(args: {
      where: { organizationId: string };
      select: { userId: true };
    }): Promise<Array<{ userId: string }>>;
  };
}

// ── Program constants ───────────────────────────────────────────────────────

export interface ReferralLevel {
  readonly id: number;
  readonly title: string;
  readonly reward: string;
  readonly description: string;
  readonly threshold: number;
}

/**
 * Level ladder. `threshold` is the number of *claimed* invites required to
 * reach the level. Kept here (not in the component) so the API and the UI read
 * the same table.
 *
 * These tiers describe what the system records, not what it pays. Credits are
 * written against each claimed referral (`REFERRAL_REWARD_CREDITS`) and there
 * is no balance to spend them from; there is no revenue-share ledger anywhere
 * in `packages/commerce`. An earlier draft of this table advertised "20%
 * revenue share ... on everything friends pay for in their first 3 months",
 * which is a commercial commitment nothing in the product can honour. Decide
 * the economics first, build the payout path, then put numbers back here.
 */
export const REFERRAL_LEVELS: readonly ReferralLevel[] = [
  {
    id: 0,
    title: "Creator",
    reward: "Code is live",
    description: "Share your code — every friend who claims it is recorded here.",
    threshold: 0,
  },
  {
    id: 1,
    title: "Pioneer",
    reward: "7 claimed invites",
    description: "Reached once seven friends have joined through your code.",
    threshold: 7,
  },
  {
    id: 2,
    title: "Partner",
    reward: "50 claimed invites",
    description: "Reached once fifty friends have joined through your code.",
    threshold: 50,
  },
];

/** Credits granted to the referrer when a code is claimed. */
export const REFERRAL_REWARD_CREDITS = 2000;

/** How long a freshly-issued code stays redeemable. */
export const REFERRAL_CODE_TTL_DAYS = 90;

const CODE_LENGTH = 8;
/** Crockford-ish alphabet — no 0/O/1/I/L, so codes survive being read aloud. */
const CODE_ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
const MAX_CODE_ATTEMPTS = 5;

// ── Pure helpers ────────────────────────────────────────────────────────────

/** Cryptographically random, human-transcribable referral code. */
export function generateReferralCode(): string {
  const bytes = new Uint8Array(CODE_LENGTH);
  crypto.getRandomValues(bytes);
  let code = "";
  for (const byte of bytes) {
    code += CODE_ALPHABET[byte % CODE_ALPHABET.length];
  }
  return code;
}

export function normalizeReferralCode(input: string): string {
  return input.trim().toUpperCase();
}

export interface ReferralSummary {
  /** Invites that converted — a claimed code. */
  readonly totalInvites: number;
  /** Codes issued and still redeemable. */
  readonly openCodes: number;
  readonly pointsEarned: number;
  readonly currentLevel: number;
}

export function resolveLevel(
  claimedInvites: number,
  levels: readonly ReferralLevel[] = REFERRAL_LEVELS,
): number {
  return levels.reduce(
    (highest, level) => (claimedInvites >= level.threshold ? Math.max(highest, level.id) : highest),
    0,
  );
}

export function isCodeRedeemable(row: ReferralRow, now: Date): boolean {
  if (row.status !== "pending" || row.referredUserId !== null) return false;
  return row.expiresAt === null || row.expiresAt.getTime() > now.getTime();
}

export function summarizeReferrals(rows: readonly ReferralRow[], now: Date): ReferralSummary {
  const claimed = rows.filter((row) => row.status === "claimed");
  return {
    totalInvites: claimed.length,
    openCodes: rows.filter((row) => isCodeRedeemable(row, now)).length,
    pointsEarned: claimed.reduce((sum, row) => sum + row.rewardCredits, 0),
    currentLevel: resolveLevel(claimed.length),
  };
}

export function buildShareUrl(baseUrl: string, code: string): string {
  return `${baseUrl.replace(/\/+$/, "")}/sign-up?ref=${encodeURIComponent(code)}`;
}

// ── Store ───────────────────────────────────────────────────────────────────

/**
 * The user ids this tenant may see referrals for. The session's own user id is
 * always included: the active organization comes from the verified session, so
 * it is authoritative even when the membership table has not been backfilled
 * (dev fixture tenants).
 */
export async function listTenantMemberIds(
  db: ReferralDb,
  tenantId: string,
  currentUserId: string,
): Promise<string[]> {
  const members = await db.organizationMember.findMany({
    where: { organizationId: tenantId },
    select: { userId: true },
  });
  return [...new Set([currentUserId, ...members.map((member) => member.userId)])];
}

export async function listReferralsForMembers(
  db: ReferralDb,
  memberIds: readonly string[],
): Promise<ReferralRow[]> {
  if (memberIds.length === 0) return [];
  return db.referral.findMany({
    where: { referrerUserId: { in: [...memberIds] } },
    orderBy: { createdAt: "desc" },
    take: 200,
  });
}

function isUniqueViolation(error: unknown): boolean {
  return (error as { code?: string } | null)?.code === "P2002";
}

/**
 * The caller's current shareable code — the newest pending, unexpired row.
 * Issues one when none exists, which is what makes `GET` self-provisioning.
 */
export async function ensureOpenReferralCode(
  db: ReferralDb,
  userId: string,
  now: Date,
): Promise<ReferralRow> {
  const existing = await db.referral.findFirst({
    where: {
      referrerUserId: userId,
      status: "pending",
      OR: [{ expiresAt: null }, { expiresAt: { gt: now } }],
    },
    orderBy: { createdAt: "desc" },
  });
  if (existing) return existing;

  const expiresAt = new Date(now.getTime() + REFERRAL_CODE_TTL_DAYS * 24 * 60 * 60 * 1000);
  let lastError: unknown = null;
  for (let attempt = 0; attempt < MAX_CODE_ATTEMPTS; attempt += 1) {
    try {
      return await db.referral.create({
        data: {
          code: generateReferralCode(),
          referrerUserId: userId,
          level: 0,
          expiresAt,
        },
      });
    } catch (error) {
      if (!isUniqueViolation(error)) throw error;
      lastError = error;
    }
  }
  throw lastError ?? new Error("Could not allocate a unique referral code.");
}

export type RedeemFailure =
  | "not_found"
  | "expired"
  | "already_claimed"
  | "self_referral"
  | "already_redeemed";

export type RedeemResult =
  | { readonly ok: true; readonly referral: ReferralRow }
  | { readonly ok: false; readonly reason: RedeemFailure };

/**
 * Claim someone else's code. The write is a conditional `updateMany` on
 * (code, status=pending, referredUserId=null) so two concurrent redemptions
 * cannot both win — the loser sees `count === 0` and is told the code is taken.
 */
export async function redeemReferralCode(
  db: ReferralDb,
  input: { readonly code: string; readonly userId: string; readonly now: Date },
): Promise<RedeemResult> {
  const code = normalizeReferralCode(input.code);
  const referral = await db.referral.findUnique({ where: { code } });
  if (!referral) return { ok: false, reason: "not_found" };
  if (referral.referrerUserId === input.userId) return { ok: false, reason: "self_referral" };
  if (referral.status === "claimed" || referral.referredUserId !== null) {
    return { ok: false, reason: "already_claimed" };
  }
  if (!isCodeRedeemable(referral, input.now)) return { ok: false, reason: "expired" };

  const priorRedemption = await db.referral.findFirst({
    where: { referredUserId: input.userId },
  });
  if (priorRedemption) return { ok: false, reason: "already_redeemed" };

  const { count } = await db.referral.updateMany({
    where: { code, status: "pending", referredUserId: null },
    data: {
      status: "claimed",
      referredUserId: input.userId,
      claimedAt: input.now,
      rewardCredits: REFERRAL_REWARD_CREDITS,
    },
  });
  if (count === 0) return { ok: false, reason: "already_claimed" };

  return {
    ok: true,
    referral: {
      ...referral,
      status: "claimed",
      referredUserId: input.userId,
      claimedAt: input.now,
      rewardCredits: REFERRAL_REWARD_CREDITS,
    },
  };
}
