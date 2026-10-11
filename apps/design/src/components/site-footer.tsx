import { BrandMark } from "@nebutra/brand";
import { brand } from "@nebutra/brand/metadata";
import { getBrandOrigin } from "@nebutra/brand/metadata-helpers";

/**
 * Where else to go, small. The site is one of the company's products, so the
 * way back to the rest of it sits under every page rather than nowhere.
 */
const LINKS: ReadonlyArray<{ label: string; href: string }> = [
  { label: brand.domains.landing, href: getBrandOrigin("landing") },
  { label: "Docs", href: `${getBrandOrigin("landing")}/docs` },
  { label: "GitHub", href: brand.social.github },
  { label: "Status", href: getBrandOrigin("status") },
];

export function SiteFooter() {
  return (
    <footer className="border-border border-t">
      <div className="flex flex-col gap-4 px-4 py-8 md:px-8 lg:px-12 text-muted-foreground text-xs sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2.5">
          <BrandMark size={16} />
          <span>{brand.name} Design · rendered from the packages it documents</span>
        </div>
        <nav aria-label="Footer" className="flex flex-wrap items-center gap-x-5 gap-y-2">
          {LINKS.map((link) => (
            <a
              className="text-muted-foreground no-underline transition-colors duration-micro hover:text-foreground"
              href={link.href}
              key={link.label}
            >
              {link.label}
            </a>
          ))}
        </nav>
      </div>
    </footer>
  );
}
