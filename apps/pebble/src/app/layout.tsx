import type { Metadata } from "next";
import type { ReactNode } from "react";
import { DOCS_BASE, GITHUB_REPO, STATUS_URL } from "@/lib/releases";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL("https://pebble.nebutra.com"),
  title: {
    default: "Pebble — AI Orchestrator for 100x builders",
    template: "%s · Pebble",
  },
  description:
    "Run Codex, Claude Code, OpenCode and more side-by-side — each in its own worktree, tracked in one place.",
  openGraph: {
    title: "Pebble",
    description: "The AI Orchestrator for 100x builders.",
    url: "https://pebble.nebutra.com",
    siteName: "Pebble",
    type: "website",
  },
  alternates: {
    canonical: "https://pebble.nebutra.com",
  },
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>
        <header className="nav">
          <a className="brand" href="/">
            <span className="brand-mark" aria-hidden />
            Pebble
          </a>
          <nav className="nav-links" aria-label="Primary">
            <a href="/download">Download</a>
            <a href={DOCS_BASE}>Docs</a>
            <a href={GITHUB_REPO}>GitHub</a>
            <a href={STATUS_URL}>Status</a>
          </nav>
        </header>
        {children}
        <footer className="footer">
          <span>© {new Date().getFullYear()} Nebutra · Pebble</span>
          <span>
            <a href={DOCS_BASE}>docs.nebutra.com/pebble</a>
            {" · "}
            <a href="https://nebutra.com">nebutra.com</a>
          </span>
        </footer>
      </body>
    </html>
  );
}
