/**
 * Single source of truth for the npm caret ranges of `@nebutra/*` packages
 * that scaffolded / generated user projects depend on.
 *
 * This module is intentionally DEPENDENCY-FREE (no imports) so it can be
 * re-exported by the npm-published CLIs (`create-sailor`, `nebutra`) via
 * `@nebutra/preset/nebutra-package-versions` (tsup inlines it with zero added
 * runtime dependency) and consumed by `apps/web` / `@nebutra/startup-os`
 * without dragging in the rest of `@nebutra/preset`'s graph.
 *
 * Source of truth for *numbers*: the `version` field of each declassified
 * (`private: false`) package.json in this monorepo. Keep this map equal to
 * `^${package.json.version}` for every listed package.
 *
 * Maintain with:
 *   pnpm package-versions:sync   # rewrite ranges from package.json
 *   pnpm package-versions:check  # fail CI / release on drift
 *
 * NEVER emit "workspace:*" into a user-facing project — that token only
 * resolves inside this monorepo and will break `pnpm install` for users.
 *
 * Do NOT duplicate this map in packages/ops/cli or create-sailor — those
 * re-export this module.
 */

export const NEBUTRA_PACKAGE_VERSIONS: Record<string, string> = {
  // Design layer (consumed by every scaffolded app)
  "@nebutra/ui": "^4.0.0",
  "@nebutra/tokens": "^4.0.0",
  "@nebutra/icons": "^4.0.0",
  "@nebutra/brand": "^4.0.0",
  "@nebutra/design-tokens": "^4.0.0",
  "@nebutra/design-sync": "^4.0.0",

  // IAM
  "@nebutra/identity": "^4.0.0",
  "@nebutra/tenant": "^4.0.0",
  "@nebutra/permissions": "^4.0.0",
  "@nebutra/vault": "^4.0.0",
  "@nebutra/audit": "^4.0.0",

  // Commerce
  "@nebutra/billing": "^4.0.0",
  "@nebutra/contracts": "^4.0.0",
  "@nebutra/license": "^4.0.0",
  "@nebutra/metering": "^4.0.0",

  // Integrations
  "@nebutra/queue": "^4.0.0",
  "@nebutra/search": "^4.0.0",
  "@nebutra/cache": "^4.0.0",
  "@nebutra/notifications": "^4.0.0",
  "@nebutra/webhooks": "^4.0.0",
  "@nebutra/uploads": "^4.0.0",
  "@nebutra/email": "^4.0.0",

  // AI
  "@nebutra/agents": "^4.0.0",
  "@nebutra/mcp": "^4.0.0",

  // Platform
  "@nebutra/logger": "^4.0.0",
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
        `declassify it (private:false) and add it to the version registry ` +
        `(then run pnpm package-versions:sync).`,
    );
  }
  return version;
}

/**
 * Non-throwing variant — returns `null` when the package is not published.
 * Mirrors the legacy CLI registry contract so that callers which fall back to
 * `"latest"` (e.g. `nebutra add`) keep their existing behavior.
 */
export function getNebutraPackageVersionOrNull(packageName: string): string | null {
  return NEBUTRA_PACKAGE_VERSIONS[packageName] ?? null;
}
