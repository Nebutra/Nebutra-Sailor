import { prisma } from "@nebutra/db";
import { logger } from "@nebutra/logger";
import { createJob, getQueue } from "@nebutra/queue";
import type {
  IssueLicenseParams,
  IssueLicenseResult,
  LicenseIssuedEvent,
  LicenseType,
} from "./types.js";

const log = logger.child({ service: "license" });

const ONE_YEAR_MS = 365 * 24 * 60 * 60 * 1000;

function resolveLicenseType(tier: IssueLicenseParams["tier"]): LicenseType {
  return tier === "INDIVIDUAL" || tier === "OPC" ? "FREE" : "COMMERCIAL";
}

/**
 * Issue a new license for a user.
 *
 * - Determines FREE vs COMMERCIAL based on tier
 * - Sets 1-year expiry for paid tiers, perpetual for free
 * - Enqueues a `license.issued` event for downstream handlers
 *   (member profile creation, welcome email, etc.)
 * - Idempotent: returns existing license if user+tier already exists
 */
export async function issueLicense(params: IssueLicenseParams): Promise<IssueLicenseResult> {
  const { userId, tier } = params;

  // Idempotency: check for existing license
  const existing = await prisma.license.findFirst({
    where: { userId, tier },
  });

  if (existing) {
    log.info("License already exists, skipping creation", { userId, tier });
    return {
      id: existing.id,
      licenseKey: existing.licenseKey,
      tier: existing.tier as IssueLicenseResult["tier"],
      type: existing.type as IssueLicenseResult["type"],
      expiresAt: existing.expiresAt,
    };
  }

  const type = resolveLicenseType(tier);
  const isFree = type === "FREE";

  const license = await prisma.license.create({
    data: {
      userId,
      tier,
      type,
      ...(params.acceptedIp != null && { acceptedIp: params.acceptedIp }),
      ...(params.projectName != null && { projectName: params.projectName }),
      ...(params.projectUrl != null && { projectUrl: params.projectUrl }),
      expiresAt: isFree ? null : new Date(Date.now() + ONE_YEAR_MS),
    },
  });

  // Enqueue event for downstream processing
  const eventData: LicenseIssuedEvent = {
    licenseId: license.id,
    licenseKey: license.licenseKey,
    userId,
    tier,
    type,
    displayName: params.displayName,
    email: params.email ?? null,
    avatarUrl: params.avatarUrl ?? null,
    lookingFor: params.lookingFor ?? [],
    githubHandle: params.githubHandle ?? null,
  };

  const queue = await getQueue();
  await queue.enqueue(
    createJob("license", "issued", eventData as unknown as Record<string, unknown>),
  );

  log.info("License issued", { licenseId: license.id, userId, tier, type });

  return {
    id: license.id,
    licenseKey: license.licenseKey,
    tier: license.tier as IssueLicenseResult["tier"],
    type: license.type as IssueLicenseResult["type"],
    expiresAt: license.expiresAt,
  };
}
