/**
 * NPM versions for `@nebutra/*` packages emitted into user projects.
 *
 * Thin RE-EXPORT of the single source of truth:
 *   `packages/ops/preset/src/nebutra-package-versions.ts`
 *
 * Relative import (not `@nebutra/preset`) so the published `nebutra` binary
 * stays self-contained — tsup inlines the dependency-free registry module.
 *
 * Do NOT edit version numbers here. Edit the shared registry, then:
 *   pnpm package-versions:sync
 *   pnpm package-versions:check
 *
 * `getNebutraPackageVersion` keeps the historical null-returning contract used
 * by `nebutra add` (`?? "latest"`). Prefer `getNebutraPackageVersionOrThrow`
 * when a missing entry is a hard error.
 */

export {
  getNebutraPackageVersion as getNebutraPackageVersionOrThrow,
  getNebutraPackageVersionOrNull as getNebutraPackageVersion,
  getNebutraPackageVersionOrNull,
  NEBUTRA_PACKAGE_VERSIONS,
} from "../../../preset/src/nebutra-package-versions";
