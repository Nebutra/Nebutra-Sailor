import { brand } from "@nebutra/brand/metadata";
import { publicAssetUrl } from "@nebutra/brand/metadata-helpers";
import type { Metadata } from "next";
import type { ReactNode } from "react";
import { DOCS_BASE, GITHUB_REPO, STATUS_URL } from "@/lib/releases";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL(`https://${brand.domains.pebble}`),
  title: {
    default: "Pebble — the AI orchestrator for 100x builders",
    template: "%s · Pebble",
  },
  description:
    "Run Codex, Claude Code, OpenCode and more side-by-side — each in its own worktree, tracked in one place.",
  icons: {
    icon: "/favicon.png",
    apple: "/assets/icon-180.png",
  },
  openGraph: {
    title: "Pebble · 溪石",
    description: "The AI orchestrator for 100x builders.",
    url: `https://${brand.domains.pebble}`,
    siteName: "Pebble",
    type: "website",
    images: [
      {
        url: publicAssetUrl("pebble/assets/hero.jpg"),
        width: 1600,
        height: 1000,
        alt: "Pebble desktop",
      },
    ],
  },
  alternates: {
    canonical: `https://${brand.domains.pebble}`,
  },
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>
        <header className="nav">
          <a className="brand" href="/">
            <img src={publicAssetUrl("pebble/assets/logo.svg")} alt="" width={34} height={34} />
            Pebble
            <span className="brand-zh">溪石</span>
          </a>
          <nav className="nav-links" aria-label="Primary">
            <a href="/download">Download</a>
            <a href="/docs">Docs</a>
            <a href={GITHUB_REPO}>GitHub</a>
            <a href={STATUS_URL}>Status</a>
            <a className="nav-cta" href="/download">
              Get Pebble
            </a>
          </nav>
        </header>
        {children}
        <footer className="footer">
          <span>
            © {new Date().getFullYear()} {brand.name} · Pebble · 溪石
          </span>
          <span>
            <a href={DOCS_BASE}>docs</a>
            {" · "}
            <a href={`https://${brand.domains.landing}`}>{brand.domains.landing}</a>
          </span>
        </footer>
      </body>
    </html>
  );
}
