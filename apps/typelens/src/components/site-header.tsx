import Link from "next/link";

const primaryNav = [
  { href: "/works", label: "Works" },
  { href: "/pairings", label: "Pairings" },
  { href: "/typefaces", label: "Typefaces" },
] as const;

export function SiteHeader() {
  return (
    <header className="border-b border-neutral-200 bg-white">
      <div className="mx-auto flex max-w-[1400px] flex-col gap-6 px-4 py-6 md:px-8 lg:flex-row lg:items-start lg:justify-between">
        <div className="flex flex-1 flex-col gap-4 sm:flex-row sm:items-start sm:gap-10">
          <Link href="/" className="shrink-0 no-underline" aria-label="Type Lens home">
            <span className="block text-[2.75rem] leading-[0.85] font-black tracking-tight uppercase">
              Type
              <br />
              Lens
            </span>
          </Link>
          <div className="max-w-md pt-1 text-sm leading-snug text-neutral-700">
            <p className="font-medium text-neutral-900">The Typography Lens.</p>
            <p>
              Verified type pairings for human designers and design agents. Free commercial fonts
              first.
            </p>
          </div>
        </div>
        <div className="flex flex-col items-stretch gap-3 sm:items-end">
          <Link
            href="/docs/agents"
            className="text-sm text-neutral-600 underline-offset-2 hover:text-neutral-900 hover:underline"
          >
            For Agents
          </Link>
          <form action="/search" method="get" className="flex w-full max-w-xs flex-col gap-1">
            <label htmlFor="tl-search" className="sr-only">
              Site search
            </label>
            <input
              id="tl-search"
              name="q"
              type="search"
              placeholder="Enter a word, typeface, tag …"
              data-allow-native
              className="w-full rounded border border-neutral-300 bg-neutral-50 px-3 py-2 text-sm outline-none focus:border-neutral-900"
            />
          </form>
        </div>
      </div>
      <nav aria-label="Primary" className="mx-auto flex max-w-[1400px] gap-8 px-4 pb-3 md:px-8">
        {primaryNav.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className="text-2xl font-semibold tracking-tight text-neutral-900 no-underline hover:text-neutral-600"
          >
            {item.label}
          </Link>
        ))}
      </nav>
    </header>
  );
}
