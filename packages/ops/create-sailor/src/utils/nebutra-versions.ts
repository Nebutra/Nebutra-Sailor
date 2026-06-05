/**
 * NPM versions for @nebutra/* packages that can be consumed by user projects.
 *
 * This file is a thin RE-EXPORT of the single source of truth at
 * `@nebutra/preset` → `src/nebutra-package-versions.ts`. The import is by
 * relative path (not the `@nebutra/preset` package specifier) so the
 * npm-published `create-sailor` binary stays self-contained: tsup inlines the
 * dependency-free registry module into `dist/index.js` without adding a
 * workspace runtime dependency.
 *
 * Do NOT edit the version map here — edit it in the shared registry so
 * `create-sailor`, `nebutra add`, and the web Startup OS generator all track
 * the same published versions.
 *
 * NEVER emit "workspace:*" into a user-facing project — that token only
 * resolves inside this monorepo and will break `pnpm install` for users.
 */

export {
  getNebutraPackageVersion,
  getNebutraPackageVersionOrNull,
  NEBUTRA_PACKAGE_VERSIONS,
} from "../../../preset/src/nebutra-package-versions";
