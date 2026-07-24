import Link from "next/link";

export function SiteFooter() {
  return (
    <footer className="mt-16 border-t-2 border-neutral-900 bg-white">
      <div className="mx-auto flex max-w-[1400px] flex-col gap-8 px-4 py-10 md:flex-row md:justify-between md:px-8">
        <ul className="flex flex-wrap gap-x-6 gap-y-2 text-sm">
          {[
            ["/about", "About"],
            ["/docs/agents", "For Agents"],
            ["/works", "Works"],
            ["/pairings", "Pairings"],
            ["/typefaces", "Typefaces"],
            ["/search", "Search"],
          ].map(([href, label]) => (
            <li key={href}>
              <Link href={href} className="underline-offset-2 hover:underline">
                {label}
              </Link>
            </li>
          ))}
        </ul>
        <p className="text-sm text-neutral-500">
          © {new Date().getFullYear()} Type Lens · Free commercial fonts first.
        </p>
      </div>
    </footer>
  );
}
