import { getSystemDb } from "@nebutra/db";
import { sendLicenseCreatedEmail } from "@nebutra/email";
import { logger } from "@nebutra/logger";
import { generateSlug } from "../generate-slug";
import type { LicenseIssuedEvent } from "../types";

const log = logger.child({ service: "license:on-issued" });

/**
 * Queue handler for `license.issued` events.
 *
 * Downstream effects of license creation:
 * 1. Create a Sleptons community member profile
 * 2. Send a welcome email with the license key
 *
 * Designed to be registered with `@nebutra/queue`:
 *   queue.registerHandler("license", "issued", onLicenseIssued)
 */
export async function onLicenseIssued(job: { data: LicenseIssuedEvent }): Promise<void> {
  const {
    licenseId,
    licenseKey,
    userId,
    tier,
    displayName,
    email,
    avatarUrl,
    lookingFor,
    githubHandle,
  } = job.data;

  // AUDIT(no-tenant): Sleptons member profiles are keyed on user_id and
  // are not per-tenant — they belong to the global community namespace.
  const db = getSystemDb();

  // 1. Create Sleptons member profile
  const existingProfile = await db.sleptonsaMemberProfile.findUnique({
    where: { user_id: userId },
  });

  if (!existingProfile) {
    const profile = await db.sleptonsaMemberProfile.create({
      data: {
        user_id: userId,
        license_id: licenseId,
        slug: `${userId}-${Date.now()}`, // temp slug
        display_name: displayName,
        avatar_url: avatarUrl ?? null,
        looking_for: lookingFor,
        github_handle: githubHandle ?? null,
        tech_stack: [],
      },
    });

    const finalSlug = generateSlug(displayName, profile.member_number);
    await db.sleptonsaMemberProfile.update({
      where: { id: profile.id },
      data: { slug: finalSlug },
    });

    log.info("Sleptons member profile created", {
      userId,
      memberNumber: profile.member_number,
      slug: finalSlug,
    });
  }

  // 2. Send welcome email
  if (email) {
    await sendLicenseCreatedEmail({
      to: email,
      firstName: displayName,
      licenseKey,
      tier,
    }).catch((err: unknown) => log.error("Failed to send license email", { err, userId }));
  }
}
