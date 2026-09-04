# @nebutra/brand

## 2.0.0

### Patch Changes

- [`6162a58`](https://github.com/Nebutra/Nebutra-Sailor/commit/6162a585df12b3cd924092d2db15e61f6af2f61e) Thanks [@TsekaLuk](https://github.com/TsekaLuk)! - Every previously published version (0.1.0, 0.1.1, 0.1.2) bundled the unlicensed vivo Sans font binaries in its `assets/` tarball. The current source has not shipped them since the CJK typeface moved to Noto Sans SC (SIL OFL) — `tests/architecture/font-license.test.ts` guards the regression — but no version built from that clean source had ever been published, so `npm install @nebutra/brand` still fetched a contaminated tarball.

  No code change: this changeset exists only to publish the already-clean source under a new version, so `latest` stops resolving to a contaminated tarball. The published versions themselves are being deprecated and, where npm's policy allows, unpublished separately — this is not a substitute for that, only the fastest way to stop new installs from picking up the old one.

## 0.1.2

### Patch Changes

- Ship the MIT LICENSE file these packages have always declared but never included.

  Every one of these declares `"license": "MIT"` in its manifest, and npm shows
  that on the registry page — but the tarball carried no licence text at all.
  MIT's own terms require the notice to accompany "all copies or substantial
  portions of the Software", so a consumer vendoring one of these packages had
  nothing to comply with.

  No code changes. This is the licence text only, published so the tarballs
  match what the manifests have been claiming.

  `tests/architecture/release-surface.test.ts` now asserts the LICENSE _file_
  exists and is MIT, not just the manifest _field_ — the field-only check is how
  this went unnoticed, and is also how `create-sailor` shipped the full AGPL-3.0
  text under an MIT declaration for its entire published history.

## 0.1.1

### Patch Changes

- Publish registry package metadata under the MIT license.
