import Link from "next/link";
import { TL_CONTAINER } from "@/lib/layout";

const links = [
  { href: "/about", label: "About" },
  { href: "/docs/agents", label: "For Agents" },
  { href: "/works", label: "Works" },
  { href: "/pairings", label: "Pairings" },
  { href: "/typefaces", label: "Typefaces" },
  { href: "/search", label: "Search" },
] as const;

export function SiteFooter() {
  return (
    <footer
      data-tl-footer
      className="mt-auto border-t-2 border-[var(--tl-ink)] bg-[var(--tl-paper)] will-change-transform"
    >
      <div
        className={`${TL_CONTAINER} flex flex-col gap-12 py-14 md:flex-row md:items-end md:justify-between md:py-16`}
      >
        <div className="max-w-sm">
          <p className="tl-display text-4xl uppercase md:text-5xl">
            Type
            <br />
            Lens
          </p>
          <p className="mt-4 text-sm leading-relaxed text-[var(--tl-muted)]">
            The Typography Lens — verified pairings for humans and agents. Free commercial fonts
            first.
          </p>
        </div>

        <ul className="flex flex-wrap gap-x-8 gap-y-3 text-sm font-medium">
          {links.map((item) => (
            <li key={item.href}>
              <Link
                href={item.href}
                className="text-[var(--tl-ink)] underline-offset-4 hover:underline"
              >
                {item.label}
              </Link>
            </li>
          ))}
        </ul>

        <p className="text-sm text-[var(--tl-muted)] md:text-right">
          © {new Date().getFullYear()} Nebutra
          <br />
          typelens.nebutra.com
        </p>
      </div>
    </footer>
  );
}
