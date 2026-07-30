import type { Metadata } from "next";
import { DOWNLOADS, GITHUB_RELEASES } from "@/lib/releases";

export const metadata: Metadata = {
  title: "Download",
  description: "Download Pebble for macOS, Windows, and Linux.",
};

const rows = [
  { label: "macOS Universal", href: DOWNLOADS.macosUniversal, badge: ".dmg" },
  { label: "Windows x64", href: DOWNLOADS.windowsX64, badge: ".exe" },
  { label: "Linux x64 AppImage", href: DOWNLOADS.linuxX64AppImage, badge: "AppImage" },
  { label: "Linux arm64 AppImage", href: DOWNLOADS.linuxArm64AppImage, badge: "AppImage" },
] as const;

export default function DownloadPage() {
  return (
    <main>
      <section className="hero">
        <h1>Download Pebble</h1>
        <p className="lead">
          Installers ship from GitHub Releases — the product origin never becomes the artifact
          authority. Homebrew and AUR packages are available from the README.
        </p>
        <div className="actions">
          <a className="btn btn-primary" href={GITHUB_RELEASES}>
            Latest release on GitHub
          </a>
        </div>
      </section>

      <ul className="list">
        {rows.map((row) => (
          <li key={row.label}>
            <a href={row.href}>
              <span>{row.label}</span>
              <span className="badge">{row.badge}</span>
            </a>
          </li>
        ))}
      </ul>

      <p className="muted" style={{ marginTop: "1.5rem" }}>
        Prefer package managers? <code>brew install --cask nebutra/pebble/pebble</code> or see the
        repository README for AUR and mobile builds.
      </p>
    </main>
  );
}
