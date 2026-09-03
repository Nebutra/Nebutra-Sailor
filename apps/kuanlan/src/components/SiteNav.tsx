import Link from "next/link";
import { AuthGate } from "@/components/AuthGate";
import { Mark } from "@/components/Mark";
import { SearchBar } from "@/components/SearchBar";
import { BRAND } from "@/lib/brand";

const LINKS = [
  { href: "/", label: "Home" },
  { href: "/create", label: "Create" },
  { href: "/wardrobe", label: "Wardrobe" },
  { href: "/moments", label: "Moments" },
  { href: "/me", label: "Me" },
] as const;

/**
 * One floating pill, on every page.
 *
 * Cosmos puts the mark, the links, a centred search and the account cluster in a
 * single bar and says it never duplicates into a secondary one. This app had two:
 * a sticky top bar plus a fixed bottom search bar that read "告诉观澜，你想拍什么"
 * even on pages with nothing to search.
 */
export function SiteNav({
  active,
  query,
}: {
  /** Omitted where no tab is the current one — 404, for instance. */
  active?: (typeof LINKS)[number]["href"];
  query?: string;
}) {
  return (
    <header className="topbar">
      <div className="navpill">
        <div className="navpill-left">
          <Link href="/" className="brand" aria-label={BRAND.name}>
            <Mark />
          </Link>
          <nav className="nav-links" aria-label="Primary">
            {LINKS.map((link) => (
              <Link key={link.href} href={link.href} data-active={link.href === active}>
                {link.label}
              </Link>
            ))}
          </nav>
        </div>
        <SearchBar defaultValue={query} />
        <div className="navpill-right">
          <AuthGate />
          <Link className="pill pill-ink" href="/create">
            开拍
          </Link>
        </div>
      </div>
    </header>
  );
}
