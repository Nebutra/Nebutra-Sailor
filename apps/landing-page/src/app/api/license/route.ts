import { auth } from "@clerk/nextjs/server";
import { db } from "@nebutra/db";
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

    // Look up user by Clerk ID
    const user = await db.user.findUnique({ where: { clerkId: userId } });
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Determine license type
    const isFree = data.tier === "INDIVIDUAL" || data.tier === "OPC";
    const licenseType = isFree ? "FREE" : "COMMERCIAL";

    // Upsert community profile
    await db.communityProfile.upsert({
      where: { userId: user.id },
      create: {
        userId: user.id,
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

    // Create license
    const license = await db.license.create({
      data: {
        userId: user.id,
        tier: data.tier,
        type: licenseType,
        acceptedIp: req.headers.get("x-forwarded-for") ?? req.headers.get("x-real-ip") ?? undefined,
        projectName: data.projectName,
        projectUrl: data.projectUrl,
        // Free licenses don't expire; paid licenses expire in 1 year
        expiresAt: isFree ? null : new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
      },
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
    console.error("[POST /api/license]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// GET /api/license/check — Check if current user has an active license
export async function GET() {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ hasLicense: false, tier: null });
    }

    const user = await db.user.findUnique({
      where: { clerkId: userId },
      include: {
        licenses: {
          where: { isActive: true },
          orderBy: { createdAt: "desc" },
          take: 1,
        },
        communityProfile: true,
      },
    });

    if (!user || user.licenses.length === 0) {
      return NextResponse.json({ hasLicense: false, tier: null });
    }

    const license = user.licenses[0];
    const isExpired = license.expiresAt && license.expiresAt < new Date();

    return NextResponse.json({
      hasLicense: !isExpired,
      tier: license.tier,
      type: license.type,
      licenseKey: license.licenseKey,
      expiresAt: license.expiresAt,
      hasCommunityProfile: !!user.communityProfile,
    });
  } catch (error) {
    console.error("[GET /api/license]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
