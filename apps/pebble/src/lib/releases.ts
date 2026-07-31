/**
 * GitHub Releases artifact URLs for the download surface.
 * Names must match `STABLE_DIRECT_DOWNLOAD_ASSETS` in
 * pebble `config/scripts/verify-release-required-assets.mjs`
 * (desktop ships `.deb` on Linux, not AppImage).
 */
export const GITHUB_RELEASES = "https://github.com/Nebutra/pebble/releases/latest";

export const DOWNLOADS = {
  macosUniversal: `${GITHUB_RELEASES}/download/pebble-macos-universal.dmg`,
  windowsX64: `${GITHUB_RELEASES}/download/pebble-windows-x86_64-setup.exe`,
  linuxX64Deb: `${GITHUB_RELEASES}/download/pebble-linux-x86_64.deb`,
  linuxArm64Deb: `${GITHUB_RELEASES}/download/pebble-linux-aarch64.deb`,
  all: GITHUB_RELEASES,
} as const;

/** Prefer on-origin docs while docs.nebutra.com/pebble Worker is stale. */
export const DOCS_BASE = "https://pebble.nebutra.com/docs";
export const STATUS_URL = "https://status.nebutra.com";
export const GITHUB_REPO = "https://github.com/Nebutra/pebble";
