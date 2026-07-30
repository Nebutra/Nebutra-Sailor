/** GitHub Releases artifact URLs for the download surface. */
export const GITHUB_RELEASES = "https://github.com/Nebutra/pebble/releases/latest";

export const DOWNLOADS = {
  macosUniversal: `${GITHUB_RELEASES}/download/pebble-macos-universal.dmg`,
  windowsX64: `${GITHUB_RELEASES}/download/pebble-windows-x86_64-setup.exe`,
  linuxX64AppImage: `${GITHUB_RELEASES}/download/pebble-linux-x86_64.AppImage`,
  linuxArm64AppImage: `${GITHUB_RELEASES}/download/pebble-linux-aarch64.AppImage`,
  all: GITHUB_RELEASES,
} as const;

/** Prefer on-origin docs while docs.nebutra.com/pebble Worker is stale. */
export const DOCS_BASE = "https://pebble.nebutra.com/docs";
export const STATUS_URL = "https://status.nebutra.com";
export const GITHUB_REPO = "https://github.com/Nebutra/pebble";
