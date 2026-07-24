import Link from "next/link";
import { TL_CONTAINER } from "@/lib/layout";

const primaryNav = [
  { href: "/works", label: "Works" },
  { href: "/pairings", label: "Pairings" },
  { href: "/typefaces", label: "Typefaces" },
] as const;

/**
 * FiU-scale masthead: massive stacked wordmark, quiet tagline, display nav.
 */
export function SiteHeader() {
  return (
    <header className="bg-[var(--tl-paper)]">
      <div className={`${TL_CONTAINER} pt-8 pb-6 md:pt-12 md:pb-8`}>
        <div className="flex flex-col gap-8 lg:flex-row lg:items-start lg:justify-between lg:gap-16">
          <div className="flex min-w-0 flex-1 flex-col gap-8 sm:flex-row sm:items-start sm:gap-12 lg:gap-16">
            <Link href="/" className="group shrink-0 no-underline" aria-label="Type Lens home">
              <span
                data-tl-mark
                className="tl-display block text-[clamp(3.5rem,8vw,5.75rem)] text-[var(--tl-ink)] uppercase transition-opacity group-hover:opacity-70 will-change-transform"
              >
                Type
                <br />
                Lens
              </span>
            </Link>

            <div className="max-w-md pt-2 sm:pt-3">
              <p data-tl-kicker className="tl-kicker mb-3 will-change-transform">
                The Typography Lens
              </p>
              <div data-tl-tagline className="will-change-transform">
                <p className="text-[1.05rem] leading-[1.55] text-[var(--tl-ink-soft)] md:text-[1.125rem]">
                  Real-world pairings, hierarchies, and type systems —
                  <br className="hidden sm:block" />
                  for designers and design agents.
                </p>
                <p className="mt-3 text-sm text-[var(--tl-muted)]">
                  Free commercial fonts first. Context over catalog.
                </p>
              </div>
            </div>
          </div>

          <div className="flex w-full flex-col gap-4 sm:max-w-sm lg:items-end">
            <div className="flex items-center gap-5 text-sm">
              <Link
                href="/docs/agents"
                className="font-medium tracking-wide text-[var(--tl-ink)] underline-offset-4 hover:underline"
              >
                For Agents
              </Link>
              <Link
                href="/about"
                className="text-[var(--tl-muted)] underline-offset-4 hover:text-[var(--tl-ink)] hover:underline"
              >
                About
              </Link>
            </div>
            <form
              action="/search"
              method="get"
              data-tl-search
              className="w-full will-change-transform"
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
                className="w-full border border-[var(--tl-ink)]/15 bg-white px-4 py-3.5 text-[0.95rem] outline-none transition-[border-color,box-shadow] placeholder:text-[var(--tl-muted)] focus:border-[var(--tl-ink)] focus:shadow-[0_0_0_3px_rgb(10_10_10/8%)]"
              />
            </form>
          </div>
        </div>

        <nav
          data-tl-nav
          aria-label="Primary"
          className="mt-10 flex flex-wrap items-baseline gap-x-10 gap-y-3 border-t border-[var(--tl-ink)] pt-5 md:mt-12 md:gap-x-14 md:pt-6"
        >
          {primaryNav.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="text-[clamp(1.75rem,3.5vw,2.35rem)] font-semibold tracking-[-0.03em] text-[var(--tl-ink)] no-underline transition-opacity hover:opacity-45"
            >
              {item.label}
            </Link>
          ))}
        </nav>
      </div>
    </header>
  );
}
