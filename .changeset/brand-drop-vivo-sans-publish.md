---
"@nebutra/brand": patch
---

Every previously published version (0.1.0, 0.1.1, 0.1.2) bundled the unlicensed vivo Sans font binaries in its `assets/` tarball. The current source has not shipped them since the CJK typeface moved to Noto Sans SC (SIL OFL) — `tests/architecture/font-license.test.ts` guards the regression — but no version built from that clean source had ever been published, so `npm install @nebutra/brand` still fetched a contaminated tarball.

No code change: this changeset exists only to publish the already-clean source under a new version, so `latest` stops resolving to a contaminated tarball. The published versions themselves are being deprecated and, where npm's policy allows, unpublished separately — this is not a substitute for that, only the fastest way to stop new installs from picking up the old one.
