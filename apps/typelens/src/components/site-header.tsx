import Link from "next/link";
import { TL_CONTAINER } from "@/lib/layout";

const primaryNav = [
  { href: "/works", label: "Works" },
  { href: "/pairings", label: "Pairings" },
  { href: "/typefaces", label: "Typefaces" },
] as const;

/**
 * Quiet foundry masthead — collection product, not SaaS landing.
 */
export function SiteHeader() {
  return (
    <header className="border-b border-[var(--tl-line)] bg-[var(--tl-paper)]">
      <div className={`${TL_CONTAINER} pt-6 pb-0 md:pt-8`}>
        <div className="flex flex-wrap items-center justify-between gap-4 pb-5 md:pb-6">
          <div className="flex min-w-0 flex-1 items-start gap-6 md:gap-10">
            <Link href="/" className="group shrink-0 no-underline" aria-label="Type Lens home">
              <span
                data-tl-mark
                className="block text-[1.65rem] font-semibold tracking-[-0.04em] text-[var(--tl-ink)] transition-opacity group-hover:opacity-60 md:text-[1.85rem] will-change-transform"
              >
                Type Lens
              </span>
            </Link>
            <div
              data-tl-tagline
              className="hidden min-w-0 max-w-sm pt-1.5 will-change-transform sm:block"
            >
              <p className="text-[0.9rem] leading-snug text-[var(--tl-muted)] md:text-[0.95rem]">
                Real-world pairings for designers & design agents.
              </p>
            </div>
          </div>

          <div className="flex shrink-0 items-center gap-4">
            <Link
              href="/docs/agents"
              className="text-[0.8125rem] font-medium text-[var(--tl-ink-soft)] no-underline transition-colors hover:text-[var(--tl-ink)]"
            >
              For Agents
            </Link>
            <Link
              href="/about"
              className="hidden text-[0.8125rem] text-[var(--tl-muted)] no-underline transition-colors hover:text-[var(--tl-ink)] sm:inline"
            >
              About
            </Link>
          </div>
        </div>

        <div className="flex flex-col gap-4 border-t border-[var(--tl-line)] pt-4 pb-5 md:flex-row md:items-center md:justify-between md:gap-8 md:pb-6">
          <nav
            data-tl-nav
            aria-label="Primary"
            className="flex flex-wrap items-center gap-x-6 gap-y-2 md:gap-x-8"
          >
            {primaryNav.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="text-[0.9375rem] font-medium tracking-[-0.015em] text-[var(--tl-ink-soft)] no-underline transition-colors hover:text-[var(--tl-ink)]"
              >
                {item.label}
              </Link>
            ))}
          </nav>

          <form
            action="/search"
            method="get"
            data-tl-search
            className="w-full will-change-transform md:max-w-xs lg:max-w-sm"
          >
            <label htmlFor="tl-search" className="sr-only">
              Site search
            </label>
            <input
              id="tl-search"
              name="q"
              type="search"
              placeholder="Search typeface, mood, medium…"
              data-allow-native
              className="tl-input"
            />
          </form>
        </div>
      </div>
    </header>
  );
}
