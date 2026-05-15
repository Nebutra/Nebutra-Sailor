/**
 * NPM versions for @nebutra/* packages that can be consumed by user projects.
 *
 * Source of truth: the package.json of each declassified package.
 * When a package's version is bumped (via changesets), update the
 * corresponding entry here so `create-sailor` and `nebutra add` emit the
 * correct caret range.
 *
 * Keep in sync with `packages/ops/cli/src/utils/nebutra-versions.ts`.
 *
 * NEVER emit "workspace:*" into a user-facing project — that token only
 * resolves inside this monorepo and will break `pnpm install` for users.
 */

export const NEBUTRA_PACKAGE_VERSIONS: Record<string, string> = {
  // Design layer (consumed by every scaffolded app)
  "@nebutra/ui": "^0.1.0",
  "@nebutra/tokens": "^0.1.0",
  "@nebutra/icons": "^0.1.0",
  "@nebutra/brand": "^0.1.0",
  "@nebutra/design-tokens": "^0.1.0",
  "@nebutra/design-sync": "^0.1.0",

  // IAM
  "@nebutra/identity": "^0.1.0",
  "@nebutra/tenant": "^0.1.0",
  "@nebutra/permissions": "^0.1.0",
  "@nebutra/vault": "^0.1.0",
  "@nebutra/audit": "^0.1.0",

  // Commerce
  "@nebutra/billing": "^0.1.0",
  "@nebutra/contracts": "^0.1.0",
  "@nebutra/license": "^0.1.0",
  "@nebutra/metering": "^0.1.0",

  // Integrations
  "@nebutra/queue": "^0.1.0",
  "@nebutra/search": "^0.1.0",
  "@nebutra/cache": "^0.1.0",
  "@nebutra/notifications": "^0.1.0",
  "@nebutra/webhooks": "^0.1.0",
  "@nebutra/uploads": "^0.1.0",
  "@nebutra/email": "^0.1.0",

  // AI
  "@nebutra/agents": "^0.1.0",
  "@nebutra/mcp": "^0.1.0",

  // Platform
  "@nebutra/logger": "^0.1.0",
};

/**
 * Resolve the published npm caret range for a `@nebutra/*` package name.
 *
 * Throws when the package is not in the published set — callers should
 * never request a version for an unpublished workspace package.
 */
export function getNebutraPackageVersion(packageName: string): string {
  const version = NEBUTRA_PACKAGE_VERSIONS[packageName];
  if (!version) {
    throw new Error(
      `Cannot resolve npm version for "${packageName}" — package is not in NEBUTRA_PACKAGE_VERSIONS. ` +
        `If this package is intended to be consumed by scaffolded user projects, ` +
        `declassify it (private:false) and add it to the version registry.`,
    );
  }
  return version;
}
