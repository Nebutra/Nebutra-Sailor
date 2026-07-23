import { brand } from "@nebutra/brand/metadata";
import Link from "next/link";
import { BrandLogo } from "@/components/brand-logo";

const COLUMNS = [
  {
    title: "产品",
    links: [
      { href: "/", label: "概览" },
      { href: "/wallet", label: "充值" },
      { href: "/keys", label: "API Keys" },
      { href: "/models", label: "模型目录" },
      { href: "/playground", label: "Playground" },
    ],
  },
  {
    title: "开发者",
    links: [
      { href: "/docs", label: "接入文档" },
      { href: "http://localhost:3105", label: "Forge 工具站", external: true },
      {
        href: brand.social.github,
        label: "GitHub",
        external: true,
      },
    ],
  },
  {
    title: "品牌",
    links: [
      { href: "https://nebutra.com", label: "Nebutra 官网", external: true },
      { href: "https://docs.nebutra.com", label: "Docs", external: true },
      { href: "https://nebutra.com/privacy", label: "隐私", external: true },
    ],
  },
] as const;

/**
 * Product chrome footer — landing FooterMinimal structure:
 * neutral top border · horizontal logo · link columns · copyright.
 * (No brand-gradient hairline: --brand-gradient aliases --primary solid fill,
 * which reads as a harsh blue rule on a full-width 1px stripe.)
 */
export function SiteFooter() {
  const year = new Date().getFullYear();

  return (
    <footer className="relative w-full border-t border-[var(--neutral-6)] bg-[var(--neutral-1)]">
      <div className="mx-auto max-w-[1400px] px-6 py-12 md:py-16">
        <div className="grid grid-cols-1 gap-12 md:grid-cols-12 md:gap-8">
          <div className="md:col-span-4">
            <Link
              href="/"
              className="inline-flex outline-none focus-visible:ring-2 focus-visible:ring-[var(--neutral-12)] focus-visible:ring-offset-2 rounded-[var(--radius-md)]"
              aria-label={`${brand.name} Router`}
            >
              <BrandLogo variant="horizontal" className="h-7 w-auto" />
            </Link>
            <p className="mt-4 max-w-sm text-sm leading-relaxed text-[var(--neutral-11)]">
              Router 是 {brand.name} 的模型聚合中转——OpenAI-compatible，数据面侧车 New-API /
              Sub2API，客户只见 Nebutra。
            </p>
            <p className="mt-3 text-xs font-medium tracking-wide text-[var(--neutral-10)]">
              {brand.tagline}
            </p>
          </div>

          <div className="md:col-span-8 grid grid-cols-2 gap-8 sm:grid-cols-3">
            {COLUMNS.map((col) => (
              <div key={col.title} className="flex flex-col gap-3">
                <h2 className="text-sm font-semibold text-[var(--neutral-12)]">{col.title}</h2>
                <ul className="flex flex-col gap-2.5">
                  {col.links.map((link) => (
                    <li key={link.href + link.label}>
                      {"external" in link && link.external ? (
                        <a
                          href={link.href}
                          className="text-[13px] text-[var(--neutral-10)] transition-colors hover:text-[var(--neutral-12)]"
                          {...(link.href.startsWith("http")
                            ? { target: "_blank", rel: "noopener noreferrer" }
                            : {})}
                        >
                          {link.label}
                        </a>
                      ) : (
                        <Link
                          href={link.href}
                          className="text-[13px] text-[var(--neutral-10)] transition-colors hover:text-[var(--neutral-12)]"
                        >
                          {link.label}
                        </Link>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>

        <div className="mt-12 flex flex-col items-start justify-between gap-3 border-t border-[var(--neutral-6)] pt-8 sm:flex-row sm:items-center">
          <p className="text-[13px] text-[var(--neutral-10)]">
            © {year} {brand.name}. All rights reserved.
          </p>
          <p className="text-[12px] text-[var(--neutral-10)]">{brand.nameCn} · Router</p>
        </div>
      </div>
    </footer>
  );
}
