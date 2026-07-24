import { brand } from "@nebutra/brand/metadata";
import { getBrandOrigin } from "@nebutra/brand/metadata-helpers";
import { LogoGithub as Github, LogoTwitterX as Twitter } from "@nebutra/icons";
import Link from "next/link";
import { BrandLogo } from "@/components/brand-logo";

const COLUMNS = [
  {
    title: "产品",
    links: [
      { href: "/", label: "工具" },
      { href: "/wallet", label: "钱包" },
      { href: "/docs", label: "API" },
    ],
  },
  {
    title: "开发",
    links: [
      { href: "/docs", label: "接入文档" },
      { href: "http://localhost:3106", label: "Router", external: true },
      { href: brand.social.github, label: "GitHub", external: true },
    ],
  },
  {
    title: "公司",
    links: [
      { href: getBrandOrigin("landing"), label: "官网", external: true },
      { href: getBrandOrigin("docs"), label: "Docs", external: true },
      { href: `${getBrandOrigin("landing")}/privacy`, label: "隐私", external: true },
    ],
  },
] as const;

const SOCIAL = [
  {
    href: brand.social.github,
    label: "GitHub",
    Icon: Github,
  },
  {
    href: brand.social.twitter,
    label: "X",
    Icon: Twitter,
  },
] as const;

/**
 * Product footer best practices (Vercel / Linear / landing FooterMinimal):
 * - full-bleed, generous top padding, quiet surface
 * - brand block + link columns (uppercase micro-headers)
 * - short description, no tagline spam
 * - social as icon buttons
 * - bottom bar: copyright only
 */
export function SiteFooter() {
  const year = new Date().getFullYear();

  return (
    <footer className="mt-auto w-full border-t border-[var(--neutral-6)] bg-[var(--neutral-1)]">
      <div className="mx-auto w-full max-w-[1400px] px-6 pt-14 pb-8 md:pt-16">
        <div className="grid grid-cols-1 gap-10 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,2fr)] lg:gap-16">
          {/* Brand */}
          <div className="flex max-w-xs flex-col gap-5">
            <Link
              href="/"
              className="inline-flex w-fit rounded-[var(--radius-md)] outline-none focus-visible:ring-2 focus-visible:ring-[var(--neutral-12)] focus-visible:ring-offset-2"
              aria-label={`${brand.name} Forge`}
            >
              <BrandLogo variant="horizontal" className="h-6 w-auto" />
            </Link>
            <p className="text-[13px] leading-relaxed text-[var(--neutral-11)]">
              在线工具站。页面上手动完成，或经 API / MCP 接入自动化。
            </p>
            <div className="flex items-center gap-1">
              {SOCIAL.map(({ href, label, Icon }) => (
                <a
                  key={label}
                  href={href}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={label}
                  className="rounded-[var(--radius-md)] p-2 text-[var(--neutral-10)] transition-colors hover:bg-[var(--neutral-3)] hover:text-[var(--neutral-12)]"
                >
                  <Icon className="size-[18px]" />
                </a>
              ))}
            </div>
          </div>

          {/* Columns */}
          <nav aria-label="页脚" className="grid grid-cols-2 gap-8 sm:grid-cols-3 sm:gap-10">
            {COLUMNS.map((col) => (
              <div key={col.title} className="flex flex-col gap-3">
                <h2 className="text-[11px] font-semibold tracking-[0.08em] text-[var(--neutral-10)] uppercase">
                  {col.title}
                </h2>
                <ul className="flex flex-col gap-2.5">
                  {col.links.map((link) => {
                    const external = "external" in link && link.external === true;
                    const className =
                      "text-[13px] text-[var(--neutral-11)] transition-colors hover:text-[var(--neutral-12)]";
                    if (external) {
                      return (
                        <li key={link.href + link.label}>
                          <a
                            href={link.href}
                            className={className}
                            {...(link.href.startsWith("http")
                              ? {
                                  target: "_blank",
                                  rel: "noopener noreferrer",
                                }
                              : {})}
                          >
                            {link.label}
                          </a>
                        </li>
                      );
                    }
                    return (
                      <li key={link.href + link.label}>
                        <Link href={link.href} className={className}>
                          {link.label}
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              </div>
            ))}
          </nav>
        </div>

        {/* Bottom bar */}
        <div className="mt-12 flex flex-col gap-2 border-t border-[var(--neutral-6)] pt-6 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-[12px] text-[var(--neutral-10)]">
            © {year} {brand.name}
          </p>
          <p className="text-[12px] text-[var(--neutral-10)]">{brand.nameCn}</p>
        </div>
      </div>
    </footer>
  );
}
