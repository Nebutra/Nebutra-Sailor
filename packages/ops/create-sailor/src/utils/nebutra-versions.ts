/**
 * NPM versions for `@nebutra/*` packages emitted into user projects.
 *
 * Thin RE-EXPORT of the single source of truth:
 *   `packages/ops/preset/src/nebutra-package-versions.ts`
 *
 * Relative import (not `@nebutra/preset`) so the published `create-sailor`
 * binary stays self-contained — tsup inlines the dependency-free registry.
 *
 * Do NOT edit version numbers here. Edit the shared registry, then:
 *   pnpm package-versions:sync
 *   pnpm package-versions:check
 *
 * NEVER emit "workspace:*" into a user-facing project.
 */

export {
  getNebutraPackageVersion,
  getNebutraPackageVersionOrNull,
  NEBUTRA_PACKAGE_VERSIONS,
} from "../../../preset/src/nebutra-package-versions";
