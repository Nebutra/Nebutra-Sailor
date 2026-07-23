import { brand } from "@nebutra/brand/metadata";
import { LogoGithub as Github, LogoTwitterX as Twitter } from "@nebutra/icons";
import Link from "next/link";
import { BrandLogo } from "@/components/brand-logo";

const COLUMNS = [
  {
    title: "产品",
    links: [
      { href: "/", label: "概览" },
      { href: "/wallet", label: "充值" },
      { href: "/keys", label: "API Keys" },
      { href: "/models", label: "模型" },
      { href: "/playground", label: "Playground" },
    ],
  },
  {
    title: "开发",
    links: [
      { href: "/docs", label: "接入文档" },
      { href: "http://localhost:3105", label: "Forge", external: true },
      { href: brand.social.github, label: "GitHub", external: true },
    ],
  },
  {
    title: "公司",
    links: [
      { href: "https://nebutra.com", label: "官网", external: true },
      { href: "https://docs.nebutra.com", label: "Docs", external: true },
      { href: "https://nebutra.com/privacy", label: "隐私", external: true },
    ],
  },
] as const;

const SOCIAL = [
  { href: brand.social.github, label: "GitHub", Icon: Github },
  { href: brand.social.twitter, label: "X", Icon: Twitter },
] as const;

export function SiteFooter() {
  const year = new Date().getFullYear();

  return (
    <footer className="mt-auto w-full border-t border-[var(--neutral-6)] bg-[var(--neutral-1)]">
      <div className="mx-auto w-full max-w-[1400px] px-6 pt-14 pb-8 md:pt-16">
        <div className="grid grid-cols-1 gap-10 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,2fr)] lg:gap-16">
          <div className="flex max-w-xs flex-col gap-5">
            <Link
              href="/"
              className="inline-flex w-fit rounded-[var(--radius-md)] outline-none focus-visible:ring-2 focus-visible:ring-[var(--neutral-12)] focus-visible:ring-offset-2"
              aria-label={`${brand.name} Router`}
            >
              <BrandLogo variant="horizontal" className="h-6 w-auto" />
            </Link>
            <p className="text-[13px] leading-relaxed text-[var(--neutral-11)]">
              模型聚合中转。OpenAI-compatible，侧车 New-API / Sub2API。
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
