import Link from "next/link";
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

export function SiteNav({
  active,
  query,
}: {
  active: (typeof LINKS)[number]["href"];
  query?: string;
}) {
  return (
    <header className="topbar">
      <div className="topbar-left">
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
      <div className="topbar-search">
        <SearchBar defaultValue={query} />
      </div>
      <div className="topbar-right">
        <Link className="pill pill-ink" href="/create">
          开拍
        </Link>
      </div>
    </header>
  );
}
