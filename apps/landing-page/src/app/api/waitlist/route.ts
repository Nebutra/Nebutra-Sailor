import { getSystemDb } from "@nebutra/db";
import { logger } from "@nebutra/logger";
import {
  createPrismaWaitlistStore,
  createReferralUrl,
  createWaitlist,
  type JoinOptions,
  normalizeReferralCode,
  type PrismaWaitlistDelegate,
} from "@nebutra/waitlist";
import { type NextRequest, NextResponse } from "next/server";
import { z } from "zod";

export const runtime = "nodejs";

const WaitlistJoinSchema = z.object({
  email: z.string().email(),
  code: z.string().max(120).nullish(),
  landingPage: z.string().url().nullish(),
  source: z.string().max(120).nullish(),
  medium: z.string().max(120).nullish(),
  campaign: z.string().max(120).nullish(),
});

type WaitlistDb = {
  waitlistEntry: PrismaWaitlistDelegate;
};

function getSiteUrl(req: NextRequest): string {
  const configured = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  if (configured) return configured;

  const origin = req.headers.get("origin");
  if (origin) return origin;

  return new URL(req.url).origin;
}

function getClientIp(req: NextRequest): string | null {
  const forwarded = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  return forwarded || req.headers.get("x-real-ip") || null;
}

export async function POST(req: NextRequest) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Request body must be valid JSON" }, { status: 400 });
  }

  const parsed = WaitlistJoinSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid waitlist request", details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const data = parsed.data;
  const attemptedReferralCode = normalizeReferralCode(data.code);
  const siteUrl = getSiteUrl(req);

  try {
    const db = getSystemDb() as unknown as WaitlistDb;
    const waitlist = createWaitlist({
      store: createPrismaWaitlistStore(db.waitlistEntry),
    });
    const joinInput: JoinOptions = {
      email: data.email,
      onDuplicate: "return-existing",
      metadata: {
        source: data.source ?? "refer-page",
        medium: data.medium ?? "referral",
        campaign: data.campaign ?? "plg-referral",
        landingPage: data.landingPage ?? new URL(req.url).toString(),
        ipAddress: getClientIp(req),
        userAgent: req.headers.get("user-agent"),
      },
    };
    if (attemptedReferralCode) {
      joinInput.referredBy = attemptedReferralCode;
    }

    const entry = await waitlist.join(joinInput);
    const referralUrl = createReferralUrl({ baseUrl: siteUrl, code: entry.referralCode });

    return NextResponse.json({
      success: true,
      entry: {
        email: entry.email,
        position: entry.position,
        referralCode: entry.referralCode,
        referralUrl,
        referralCount: entry.referralCount,
        referredBy: entry.referredBy ?? null,
        status: entry.status,
      },
      attribution: {
        attemptedReferralCode,
        acceptedReferralCode: entry.referredBy ?? null,
        wasReferred: Boolean(entry.referredBy),
      },
    });
  } catch (error) {
    logger.error("[POST /api/waitlist]", error);
    return NextResponse.json({ error: "Failed to join waitlist" }, { status: 500 });
  }
}
