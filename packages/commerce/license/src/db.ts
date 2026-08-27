/**
 * Host-injected system DB surface for license operations.
 * This package never imports private `@nebutra/db`.
 */

export interface LicenseRecord {
  id: string;
  licenseKey: string;
  userId: string;
  tier: string;
  type: string;
  expiresAt: Date | null;
}

export interface LicenseDb {
  license: {
    findFirst(args: {
      where: Record<string, unknown>;
      select?: Record<string, boolean>;
    }): Promise<LicenseRecord | null>;
    create(args: { data: Record<string, unknown> }): Promise<LicenseRecord>;
  };
  sleptonsaMemberProfile: {
    findUnique(args: { where: { user_id: string } }): Promise<{ id: string } | null>;
    create(args: { data: Record<string, unknown> }): Promise<{ id: string; member_number: number }>;
    update(args: { where: { id: string }; data: Record<string, unknown> }): Promise<unknown>;
  };
}

let getter: (() => LicenseDb) | undefined;

/**
 * Wire host-owned Prisma (e.g. `getSystemDb` from the app data layer).
 */
export function configureLicenseSystemDb(getSystemDb: () => unknown): void {
  getter = () => getSystemDb() as LicenseDb;
}

/** @internal — tests */
export function __resetLicenseSystemDbForTests(): void {
  getter = undefined;
}

export function requireLicenseDb(): LicenseDb {
  if (!getter) {
    throw new Error(
      "@nebutra/license requires a host DB client. Call configureLicenseSystemDb(getSystemDb) at app bootstrap.",
    );
  }
  return getter();
}
