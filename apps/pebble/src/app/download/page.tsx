import type { Metadata } from "next";
import { DOWNLOAD_ROWS, GITHUB_RELEASES } from "@/lib/releases";

export const metadata: Metadata = {
  title: "Download",
  description: "Download Pebble for Linux and macOS; Windows installer follows.",
};

export default function DownloadPage() {
  return (
    <main>
      <section className="hero" style={{ gridTemplateColumns: "1fr", maxWidth: "40rem" }}>
        <div>
          <p className="eyebrow">Install</p>
          <h1>Download Pebble</h1>
          <p className="lead">
            Installers ship from GitHub Releases — this origin never becomes the artifact authority.
            Linux <code className="inline">.deb</code> and macOS Universal{" "}
            <code className="inline">.dmg</code> are live. Windows setup lands once code-signing is
            restored.
          </p>
          <div className="actions">
            <a className="btn btn-primary" href={GITHUB_RELEASES}>
              Latest release on GitHub
            </a>
          </div>
        </div>
      </section>

      <ul className="list">
        {DOWNLOAD_ROWS.map((row) => (
          <li key={row.label}>
            <a href={row.href} aria-disabled={!row.available ? true : undefined}>
              <span>
                {row.label}
                {!row.available ? " (coming soon)" : null}
              </span>
              <span className="badge">{row.badge}</span>
            </a>
          </li>
        ))}
      </ul>

      <p className="muted" style={{ marginTop: "1.5rem" }}>
        macOS builds are Developer ID signed and notarized when release CI completes successfully.
        Package managers: <code className="inline">brew install --cask nebutra/pebble/pebble</code>
        {" · "}
        AUR <code className="inline">nebutra-pebble-bin</code>
      </p>
    </main>
  );
}
