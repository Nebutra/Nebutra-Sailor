/**
 * NPM versions for `@nebutra/*` packages emitted into user projects.
 *
 * Thin RE-EXPORT of the single source of truth:
 *   `packages/ops/preset/src/nebutra-package-versions.ts`
 *   (package export: `@nebutra/preset/nebutra-package-versions`)
 *
 * Package subpath import (not a monorepo-relative path) so standalone mirror
 * CI can resolve via workspace / vendored `file:./vendor/*`, while tsup still
 * inlines the dependency-free registry into the published binary
 * (`noExternal: [/^@nebutra\//]`).
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
} from "@nebutra/preset/nebutra-package-versions";
