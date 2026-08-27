import { brand } from "@nebutra/brand/metadata";
/**
 * GitHub Releases artifact URLs for the download surface.
 * Names must match `STABLE_DIRECT_DOWNLOAD_ASSETS` in
 * pebble `config/scripts/verify-release-required-assets.mjs`
 * (desktop ships `.deb` on Linux, not AppImage).
 *
 * Live on v1.4.124+: Linux debs + macOS Universal DMG.
 * Windows setup.exe waits on WINDOWS_CERTIFICATE secrets.
 */
export const GITHUB_RELEASES = `${brand.social.github}/pebble/releases/latest`;

export const DOWNLOADS = {
  macosUniversal: `${GITHUB_RELEASES}/download/pebble-macos-universal.dmg`,
  windowsX64: `${GITHUB_RELEASES}/download/pebble-windows-x86_64-setup.exe`,
  linuxX64Deb: `${GITHUB_RELEASES}/download/pebble-linux-x86_64.deb`,
  linuxArm64Deb: `${GITHUB_RELEASES}/download/pebble-linux-aarch64.deb`,
  all: GITHUB_RELEASES,
} as const;

export type DownloadRow = {
  label: string;
  href: string;
  badge: string;
  /** When false, show as coming-soon (no broken direct asset link). */
  available: boolean;
};

/** Rows rendered on /download — only `available` rows are direct installer links. */
export const DOWNLOAD_ROWS: readonly DownloadRow[] = [
  {
    label: "Linux x64",
    href: DOWNLOADS.linuxX64Deb,
    badge: ".deb",
    available: true,
  },
  {
    label: "Linux arm64",
    href: DOWNLOADS.linuxArm64Deb,
    badge: ".deb",
    available: true,
  },
  {
    label: "macOS Universal",
    href: DOWNLOADS.macosUniversal,
    badge: ".dmg",
    available: true,
  },
  {
    label: "Windows x64",
    href: GITHUB_RELEASES,
    badge: "soon",
    available: false,
  },
] as const;

/** Prefer on-origin docs while docs.nebutra.com/pebble Worker is stale. */
export const DOCS_BASE = `https://${brand.domains.pebble}/docs`;
export const STATUS_URL = `https://${brand.domains.status}`;
export const GITHUB_REPO = `${brand.social.github}/pebble`;
