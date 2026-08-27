import { brand } from "@nebutra/brand/metadata";
import Link from "next/link";
import { TL_CONTAINER } from "@/lib/layout";

const links = [
  { href: "/works", label: "Works" },
  { href: "/pairings", label: "Pairings" },
  { href: "/typefaces", label: "Typefaces" },
  { href: "/docs/agents", label: "For Agents" },
  { href: "/about", label: "About" },
  { href: "/search", label: "Search" },
] as const;

export function SiteFooter() {
  return (
    <footer
      data-tl-footer
      className="mt-auto border-t border-[var(--tl-line)] bg-[var(--tl-paper-deep)] will-change-transform"
    >
      <div
        className={`${TL_CONTAINER} flex flex-col gap-10 py-12 md:flex-row md:items-end md:justify-between md:py-14`}
      >
        <div className="max-w-sm">
          <p className="text-[1.25rem] font-semibold tracking-[-0.03em] text-[var(--tl-ink)]">
            TypeLens
          </p>
          <p className="mt-3 text-sm leading-relaxed text-[var(--tl-muted)]">
            Verified pairings from real works — free commercial first. Context over catalog.
          </p>
        </div>

        <ul className="flex flex-wrap gap-x-6 gap-y-2.5 text-[0.8125rem] font-medium">
          {links.map((item) => (
            <li key={item.href}>
              <Link
                href={item.href}
                className="text-[var(--tl-ink-soft)] no-underline transition-colors hover:text-[var(--tl-ink)]"
              >
                {item.label}
              </Link>
            </li>
          ))}
        </ul>

        <p className="text-xs leading-relaxed text-[var(--tl-muted-soft)] md:text-right">
          © {new Date().getFullYear()} {brand.name}
          <br />
          TypeLens
        </p>
      </div>
    </footer>
  );
}
