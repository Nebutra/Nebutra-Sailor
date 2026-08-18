import { brand } from "@nebutra/brand/metadata";
import type { ReactNode } from "react";

const NAV = [
  { href: "/docs", label: "Overview" },
  { href: "/docs/mobile", label: "Mobile" },
  { href: "/docs/model/worktrees", label: "Worktrees" },
  { href: "/docs/terminal", label: "Terminal" },
  { href: "/docs/telemetry", label: "Privacy" },
  { href: "/docs/ssh", label: "SSH" },
  { href: "/docs/cli/overview", label: "CLI" },
] as const;

export default function DocsLayout({ children }: { children: ReactNode }) {
  return (
    <main className="docs-shell">
      <aside className="docs-nav" aria-label="Docs">
        <p className="docs-nav-title">Pebble docs</p>
        <ul>
          {NAV.map((item) => (
            <li key={item.href}>
              <a href={item.href}>{item.label}</a>
            </li>
          ))}
        </ul>
        <p className="docs-nav-note">
          Canonical platform docs will also live at{" "}
          <a href={`https://${brand.domains.docs}/pebble`}>{brand.domains.docs}/pebble</a> once that
          Worker is redeployed.
        </p>
      </aside>
      <article className="docs-article prose">{children}</article>
    </main>
  );
}
