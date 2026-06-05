/**
 * Single source of truth for the npm caret ranges of `@nebutra/*` packages
 * that scaffolded / generated user projects depend on.
 *
 * This module is intentionally DEPENDENCY-FREE (no imports) so it can be
 * re-exported by the npm-published `create-sailor` CLI (tsup inlines it with
 * zero added runtime dependency) and consumed by `apps/web` (Startup OS file
 * generator) without dragging in the rest of `@nebutra/preset`'s graph.
 *
 * Source of truth: the `version` field of each declassified (private:false)
 * package.json in this monorepo. When a package version is bumped (via
 * changesets), update the matching entry here so every generator emits the
 * correct caret range and generated apps track the mother packages.
 *
 * NEVER emit "workspace:*" into a user-facing project — that token only
 * resolves inside this monorepo and will break `pnpm install` for users.
 */

export const NEBUTRA_PACKAGE_VERSIONS: Record<string, string> = {
  // Design layer (consumed by every scaffolded app)
  "@nebutra/ui": "^0.2.1",
  "@nebutra/tokens": "^0.1.1",
  "@nebutra/icons": "^0.1.1",
  "@nebutra/brand": "^0.1.1",
  "@nebutra/design-tokens": "^0.1.1",
  "@nebutra/design-sync": "^0.1.1",

  // IAM
  "@nebutra/identity": "^0.1.1",
  "@nebutra/tenant": "^0.1.2",
  "@nebutra/permissions": "^0.1.2",
  "@nebutra/vault": "^0.1.1",
  "@nebutra/audit": "^0.1.1",

  // Commerce
  "@nebutra/billing": "^0.1.2",
  "@nebutra/contracts": "^0.1.1",
  "@nebutra/license": "^0.1.2",
  "@nebutra/metering": "^0.1.1",

  // Integrations
  "@nebutra/queue": "^0.1.2",
  "@nebutra/search": "^0.1.1",
  "@nebutra/cache": "^0.0.2",
  "@nebutra/notifications": "^0.1.2",
  "@nebutra/webhooks": "^0.1.2",
  "@nebutra/uploads": "^0.1.1",
  "@nebutra/email": "^0.1.1",

  // AI
  "@nebutra/agents": "^1.1.1",
  "@nebutra/mcp": "^0.1.2",

  // Platform
  "@nebutra/logger": "^0.1.1",
};

/**
 * Resolve the published npm caret range for a `@nebutra/*` package name.
 *
 * Throws when the package is not in the published set — callers that consume
 * this for a user-facing scaffold should never request a version for an
 * unpublished workspace package.
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

/**
 * Non-throwing variant — returns `null` when the package is not published.
 * Mirrors the legacy `@nebutra/cli` registry contract so that callers which
 * fall back to `"latest"` (e.g. `nebutra add`) keep their existing behavior.
 */
export function getNebutraPackageVersionOrNull(packageName: string): string | null {
  return NEBUTRA_PACKAGE_VERSIONS[packageName] ?? null;
}
