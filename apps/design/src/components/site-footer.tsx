import { BrandMark } from "@nebutra/brand";
import { brand } from "@nebutra/brand/metadata";
import { getBrandOrigin } from "@nebutra/brand/metadata-helpers";
import { ArrowUpRight } from "@nebutra/icons";
import Link from "next/link";
import { NAV_GROUPS, type NavGroupId } from "@/lib/nav-groups";
import { LANDING_ORIGIN, STUDIO_URL } from "@/lib/site";

/**
 * A site map under every page, one column per top-level group.
 *
 * Hand-picked rather than dumped from the rail: the rail lists ninety
 * components, and a footer that does too is not a map. Each column starts at
 * its group's hub, which is the same route the header tab goes to. The way back
 * to the rest of the company's site sits in the last column.
 */
interface FooterLink {
  label: string;
  href: string;
  /** A plain anchor: another site, or a file the app does not route. */
  plain?: "external" | "file";
}

const COLUMNS: Record<NavGroupId, readonly FooterLink[]> = {
  design: [
    { label: "Principles", href: "/design" },
    { label: "Color", href: "/tokens/color" },
    { label: "Type", href: "/tokens/type" },
    { label: "Motion", href: "/tokens/motion" },
    { label: "Accessibility", href: "/accessibility" },
    { label: "Copywriting", href: "/copywriting" },
  ],
  develop: [
    { label: "Getting started", href: "/develop" },
    { label: "Components", href: "/components" },
    { label: "Showcase", href: "/showcase" },
    { label: "Patterns", href: "/patterns/modality" },
    { label: "Adoption", href: "/adoption" },
  ],
  ecosystem: [
    { label: "Overview", href: "/ecosystem" },
    { label: "Palette", href: "/palette" },
    { label: "Motion Lab", href: "/motion-lab" },
    { label: "IconBox", href: "/icons" },
    { label: "Sailor Studio", href: STUDIO_URL, plain: "external" },
  ],
  resources: [
    { label: "Brand", href: "/brand" },
    { label: "llms.txt", href: "/llms.txt", plain: "file" },
    { label: "GitHub", href: brand.social.github, plain: "external" },
    { label: brand.domains.landing, href: LANDING_ORIGIN, plain: "external" },
    { label: "Docs", href: `${LANDING_ORIGIN}/docs`, plain: "external" },
    { label: "Status", href: getBrandOrigin("status"), plain: "external" },
  ],
};

const LINK =
  "inline-flex items-center gap-1 text-muted-foreground no-underline transition-colors duration-micro hover:text-foreground";

export function SiteFooter() {
  return (
    <footer className="border-hairline border-t">
      <nav
        aria-label="Site map"
        className="grid grid-cols-2 gap-x-6 gap-y-10 px-4 py-10 text-sm md:px-8 lg:grid-cols-4 lg:px-12"
      >
        {NAV_GROUPS.map((group) => (
          <div className="flex min-w-0 flex-col gap-3" key={group.id}>
            <p className="m-0 font-medium text-foreground">{group.label}</p>
            <ul className="m-0 flex list-none flex-col gap-2 p-0">
              {COLUMNS[group.id].map((link) => (
                <li key={link.href}>
                  {link.plain ? (
                    <a
                      className={LINK}
                      href={link.href}
                      {...(link.plain === "external"
                        ? { rel: "noreferrer", target: "_blank" }
                        : {})}
                    >
                      {link.label}
                      {link.plain === "external" ? (
                        <ArrowUpRight aria-hidden className="size-3" />
                      ) : null}
                    </a>
                  ) : (
                    <Link className={LINK} href={link.href}>
                      {link.label}
                    </Link>
                  )}
                </li>
              ))}
            </ul>
          </div>
        ))}
      </nav>
      <div className="flex items-center gap-2.5 border-hairline border-t px-4 py-5 text-muted-foreground text-xs md:px-8 lg:px-12">
        <BrandMark size={16} />
        <span>{brand.name} Design · rendered from the packages it documents</span>
      </div>
    </footer>
  );
}
