import { logger } from "@nebutra/logger";
import { NextResponse } from "next/server";
import { z } from "zod";
import { getAuth } from "@/lib/auth";
import { getTenantDb } from "@/lib/db";
import {
  buildShareUrl,
  ensureOpenReferralCode,
  listReferralsForMembers,
  listTenantMemberIds,
  normalizeReferralCode,
  type RedeemFailure,
  type ReferralDb,
  type ReferralRow,
  redeemReferralCode,
  summarizeReferrals,
} from "@/lib/growth/referrals";
import { hasPermission, resolveRole, type Scope } from "@/lib/permissions";
import { getDefaultPublicUrls } from "@/lib/public-url-defaults";

export const dynamic = "force-dynamic";

const RedeemSchema = z.object({
  code: z
    .string()
    .trim()
    .min(4)
    .max(20)
    .regex(/^[A-Za-z0-9-]+$/, "A referral code is letters, digits and dashes only."),
});

/**
 * TODO(scopes): referrals ride `settings:read` until dedicated `referral:*`
 * scopes land in `@/lib/permissions`. Every role holds `settings:read`, which
 * is the intended reach — sharing and redeeming a code is a personal action
 * available to any member of the organization, not an admin capability. The
 * meaningful boundary is the tenant, enforced below on every query.
 */
const REFERRAL_SCOPE: Scope = "settings:read";

type RequestContext =
  | { readonly response: NextResponse }
  | {
      readonly tenantId: string;
      readonly userId: string;
      readonly db: ReferralDb;
    };

async function getRequestContext(request: Request): Promise<RequestContext> {
  const auth = await getAuth(request);
  if (!auth.isSignedIn || !auth.userId) {
    return { response: NextResponse.json({ error: "Authentication required." }, { status: 401 }) };
  }
  if (!auth.orgId) {
    return { response: NextResponse.json({ error: "Organization required." }, { status: 403 }) };
  }
  const role = resolveRole(auth.sessionClaims?.org_role as string | undefined);
  if (!hasPermission(role, REFERRAL_SCOPE)) {
    return { response: NextResponse.json({ error: "Forbidden" }, { status: 403 }) };
  }
  return {
    tenantId: auth.orgId,
    userId: auth.userId,
    db: getTenantDb(auth.orgId) as unknown as ReferralDb,
  };
}

function appBaseUrl(request: Request): string {
  const configured = process.env.NEXT_PUBLIC_APP_URL?.trim();
  if (configured) return configured;
  try {
    return new URL(request.url).origin;
  } catch {
    return getDefaultPublicUrls(process.env.NODE_ENV).appUrl;
  }
}

function serializeReferral(row: ReferralRow) {
  return {
    id: row.id,
    code: row.code,
    status: row.status,
    referredEmail: row.referredEmail,
    rewardCredits: row.rewardCredits,
    level: row.level,
    expiresAt: row.expiresAt?.toISOString() ?? null,
    claimedAt: row.claimedAt?.toISOString() ?? null,
    createdAt: row.createdAt.toISOString(),
  };
}

const REDEEM_FAILURES: Record<RedeemFailure, { status: number; message: string }> = {
  not_found: { status: 404, message: "That referral code does not exist." },
  expired: { status: 410, message: "That referral code has expired." },
  already_claimed: { status: 409, message: "That referral code has already been claimed." },
  self_referral: { status: 409, message: "A referral code cannot be redeemed by its owner." },
  already_redeemed: { status: 409, message: "You have already redeemed a referral code." },
};

/**
 * `GET /api/referrals` — the organization's referral ledger plus the caller's
 * own shareable code, issued on first read.
 */
export async function GET(request: Request) {
  const context = await getRequestContext(request);
  if ("response" in context) return context.response;

  const now = new Date();
  try {
    const memberIds = await listTenantMemberIds(context.db, context.tenantId, context.userId);
    const [openCode, rows] = await Promise.all([
      ensureOpenReferralCode(context.db, context.userId, now),
      listReferralsForMembers(context.db, memberIds),
    ]);

    // `ensureOpenReferralCode` may have just inserted a row the parallel read
    // missed — fold it in so the freshly-issued code is always visible.
    const referrals = rows.some((row) => row.id === openCode.id) ? rows : [openCode, ...rows];
    // `referrals` is the whole tenant ledger, but the stats are the caller's own
    // standing — the level ladder and the reward copy are written in the second
    // person, so crediting a teammate's claims to the reader would be a lie.
    const summary = summarizeReferrals(
      referrals.filter((row) => row.referrerUserId === context.userId),
      now,
    );
    const shareUrl = buildShareUrl(appBaseUrl(request), openCode.code);

    return NextResponse.json({
      stats: {
        totalInvites: summary.totalInvites,
        openCodes: summary.openCodes,
        pointsEarned: summary.pointsEarned,
        currentLevel: summary.currentLevel,
        referralCode: openCode.code,
        shareUrl,
      },
      referrals: referrals.map((row) => ({
        ...serializeReferral(row),
        isMine: row.referrerUserId === context.userId,
      })),
    });
  } catch (error) {
    logger.error("[referrals.GET] Failed to load referrals", {
      tenantId: context.tenantId,
      userId: context.userId,
      error: error instanceof Error ? error.message : "Unknown error",
    });
    return NextResponse.json({ error: "Failed to load referrals." }, { status: 500 });
  }
}

/** `POST /api/referrals` — redeem someone else's code. */
export async function POST(request: Request) {
  const context = await getRequestContext(request);
  if ("response" in context) return context.response;

  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const parsed = RedeemSchema.safeParse(payload);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Enter a valid referral code.", details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  try {
    const result = await redeemReferralCode(context.db, {
      code: normalizeReferralCode(parsed.data.code),
      userId: context.userId,
      now: new Date(),
    });

    if (!result.ok) {
      const failure = REDEEM_FAILURES[result.reason];
      return NextResponse.json({ error: failure.message }, { status: failure.status });
    }

    // The redeemed row belongs to the *referrer*, who is outside this tenant.
    // Echo only what the redeemer authored or needs to confirm the claim —
    // `referredEmail` is the referrer's addressing of the invite and may name a
    // third party, so it never crosses back.
    const { id, code, status, rewardCredits, level, claimedAt, createdAt } = serializeReferral(
      result.referral,
    );
    return NextResponse.json(
      { referral: { id, code, status, rewardCredits, level, claimedAt, createdAt, isMine: false } },
      { status: 201 },
    );
  } catch (error) {
    logger.error("[referrals.POST] Failed to redeem referral code", {
      tenantId: context.tenantId,
      userId: context.userId,
      error: error instanceof Error ? error.message : "Unknown error",
    });
    return NextResponse.json({ error: "Failed to redeem the referral code." }, { status: 500 });
  }
}
