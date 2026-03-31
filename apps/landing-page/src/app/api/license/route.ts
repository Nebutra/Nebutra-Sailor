import { auth } from "@clerk/nextjs/server";
import { prisma } from "@nebutra/db";
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

    // Determine license type
    const isFree = data.tier === "INDIVIDUAL" || data.tier === "OPC";
    const licenseType = isFree ? "FREE" : "COMMERCIAL";

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

    // Create license (keyed by Clerk userId)
    const license = await prisma.license.create({
      data: {
        userId,
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

// GET /api/license — Check if current user has an active license
export async function GET() {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ hasLicense: false, tier: null });
    }

    const [license, communityProfile] = await Promise.all([
      prisma.license.findFirst({
        where: { userId, isActive: true },
        orderBy: { createdAt: "desc" },
      }),
      prisma.communityProfile.findUnique({ where: { userId } }),
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
      hasCommunityProfile: !!communityProfile,
    });
  } catch (error) {
    console.error("[GET /api/license]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
