import { getSystemDb } from "@nebutra/db";
import type { ValidateLicenseResult } from "./types";

/**
 * Validate a license key.
 *
 * Checks that the key exists, is active, and has not expired.
 * Used by the CLI `nebutra license activate` and the public
 * `/api/license/validate` endpoint.
 *
 * AUDIT(no-tenant): licenses are keyed on userId and are not scoped to any
 * Organization; the validate flow runs pre-auth against a global key space.
 */
export async function validateLicense(key: string): Promise<ValidateLicenseResult> {
  const license = await getSystemDb().license.findFirst({
    where: { licenseKey: key, isActive: true },
    select: { tier: true, type: true, expiresAt: true },
  });

  if (!license) {
    return { valid: false, error: "License key not found" };
  }

  const isExpired = license.expiresAt !== null && license.expiresAt < new Date();
  if (isExpired) {
    return { valid: false, error: "License has expired" };
  }

  return {
    valid: true,
    tier: license.tier as ValidateLicenseResult["tier"],
    type: license.type as ValidateLicenseResult["type"],
  };
}
