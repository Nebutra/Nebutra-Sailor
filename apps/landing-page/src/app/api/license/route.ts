import { auth, clerkClient } from "@clerk/nextjs/server";
import { createCheckoutSession, getOrCreateCustomer } from "@nebutra/billing";
import { getSystemDb } from "@nebutra/db";

// AUDIT(no-tenant): community profiles + licenses are user-scoped and predate
// any tenant/organization context. The authenticated user's Clerk id is the
// sole key, and this route runs before any Organization exists for the user.
const prisma = getSystemDb();
import { issueLicense } from "@nebutra/license";
import { logger } from "@nebutra/logger";
import { type NextRequest, NextResponse } from "next/server";
import { z } from "zod";

const CreateLicenseSchema = z.object({
  // Community profile
  role: z.enum(["solo_developer", "founder", "cto", "developer", "other"]),
  company: z.string().optional(),
  teamSize: z.enum(["1", "2-5", "6-20", "21-50", "50+"]),
  industry: z.string().optional(),
  useCase: z.enum(["saas", "ai_tool", "marketplace", "internal_tool", "agency", "other"]),
  buildingWhat: z.string().max(500).optional(),
  referralSource: z
    .enum(["twitter", "github", "product_hunt", "friend", "search", "other"])
    .optional(),
  githubHandle: z.string().optional(),
  twitterHandle: z.string().optional(),
  lookingFor: z.array(z.string()).default([]),

  // License
  tier: z.enum(["INDIVIDUAL", "OPC", "STARTUP", "ENTERPRISE"]),
  projectName: z.string().optional(),
  projectUrl: z.string().url().optional(),

  // Agreement
  acceptedTerms: z.literal(true),
});

// POST /api/license — Create a license after community profile collection
export async function POST(req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const parsed = CreateLicenseSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid request", details: parsed.error.flatten() },
        { status: 400 },
      );
    }

    const data = parsed.data;
    const isStartup = data.tier === "STARTUP";

    const clerk = await clerkClient();
    const clerkUser = await clerk.users.getUser(userId);
    const email = clerkUser.emailAddresses[0]?.emailAddress;
    const displayName =
      clerkUser.fullName ?? clerkUser.username ?? email?.split("@")[0] ?? "Founder";

    // Upsert community profile (keyed by Clerk userId)
    await prisma.communityProfile.upsert({
      where: { userId },
      create: {
        userId,
        role: data.role,
        company: data.company,
        teamSize: data.teamSize,
        industry: data.industry,
        useCase: data.useCase,
        buildingWhat: data.buildingWhat,
        referralSource: data.referralSource,
        githubHandle: data.githubHandle,
        twitterHandle: data.twitterHandle,
      },
      update: {
        role: data.role,
        company: data.company,
        teamSize: data.teamSize,
        industry: data.industry,
        useCase: data.useCase,
        buildingWhat: data.buildingWhat,
        referralSource: data.referralSource,
        githubHandle: data.githubHandle,
        twitterHandle: data.twitterHandle,
      },
    });

    // Paid tiers redirect to Stripe checkout
    if (isStartup) {
      if (!email) {
        return NextResponse.json({ error: "User has no email address" }, { status: 400 });
      }

      const priceId = process.env.STRIPE_PRICE_ID_STARTUP_LICENSE;
      if (!priceId) {
        logger.error("Missing STRIPE_PRICE_ID_STARTUP_LICENSE");
        return NextResponse.json({ error: "Stripe configuration missing" }, { status: 500 });
      }

      const customer = await getOrCreateCustomer(userId, email, displayName);
      const origin = req.headers.get("origin") ?? "http://localhost:3000";

      const session = await createCheckoutSession({
        customerId: customer.id,
        priceId,
        successUrl: `${origin}/en/get-license?success=true`,
        cancelUrl: `${origin}/en/get-license?cancel=true`,
        metadata: {
          license_tier: "STARTUP",
          userId,
          lookingFor: JSON.stringify(data.lookingFor),
          githubHandle: data.githubHandle || "",
          projectName: data.projectName || "",
          projectUrl: data.projectUrl || "",
        },
      });

      return NextResponse.json({
        success: true,
        requireCheckout: true,
        url: session.url,
      });
    }

    // Free tiers: issue license immediately (enqueues profile + email via queue)
    const license = await issueLicense({
      userId,
      tier: data.tier,
      displayName,
      email,
      avatarUrl: clerkUser.imageUrl ?? null,
      lookingFor: data.lookingFor,
      githubHandle: data.githubHandle,
      projectName: data.projectName,
      projectUrl: data.projectUrl,
      acceptedIp: req.headers.get("x-forwarded-for") ?? req.headers.get("x-real-ip"),
    });

    return NextResponse.json({
      success: true,
      license: {
        id: license.id,
        licenseKey: license.licenseKey,
        tier: license.tier,
        type: license.type,
        expiresAt: license.expiresAt,
      },
    });
  } catch (error) {
    logger.error("[POST /api/license]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// GET /api/license — Check if current user has an active license
export async function GET() {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ hasLicense: false, tier: null });
    }

    const [license, sleptonsProfile] = await Promise.all([
      prisma.license.findFirst({
        where: { userId, isActive: true },
        orderBy: { createdAt: "desc" },
      }),
      prisma.sleptonsaMemberProfile.findUnique({
        where: { user_id: userId },
        select: { member_number: true },
      }),
    ]);

    if (!license) {
      return NextResponse.json({ hasLicense: false, tier: null });
    }

    const isExpired = license.expiresAt && license.expiresAt < new Date();

    return NextResponse.json({
      hasLicense: !isExpired,
      tier: license.tier,
      type: license.type,
      licenseKey: license.licenseKey,
      expiresAt: license.expiresAt,
      memberNumber: sleptonsProfile?.member_number ?? null,
    });
  } catch (error) {
    logger.error("[GET /api/license]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
