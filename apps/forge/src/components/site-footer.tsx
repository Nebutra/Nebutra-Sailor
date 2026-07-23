import { brand } from "@nebutra/brand/metadata";
import Link from "next/link";
import { BrandLogo } from "@/components/brand-logo";

const COLUMNS = [
  {
    title: "产品",
    links: [
      { href: "/", label: "全部工具" },
      { href: "/wallet", label: "钱包" },
      { href: "/docs", label: "API 文档" },
    ],
  },
  {
    title: "开发者",
    links: [
      { href: "/docs", label: "OpenAPI / MCP" },
      { href: "http://localhost:3106", label: "Router 控制台", external: true },
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
 * Product chrome footer — aligned with landing FooterMinimal defaults:
 * neutral top border · horizontal logo · link columns · copyright.
 */
export function SiteFooter() {
  const year = new Date().getFullYear();

  return (
    <footer className="relative w-full border-t border-border bg-background">
      <div className="mx-auto max-w-[1400px] px-6 py-12 md:py-16">
        <div className="grid grid-cols-1 gap-12 md:grid-cols-12 md:gap-8">
          <div className="md:col-span-4">
            <Link
              href="/"
              className="inline-flex outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 rounded-[var(--radius-md)]"
              aria-label={`${brand.name} Forge`}
            >
              <BrandLogo variant="horizontal" className="h-7 w-auto" />
            </Link>
            <p className="mt-4 max-w-sm text-sm leading-relaxed text-muted-foreground">
              Forge 是 {brand.name} 的 Agent-native 工具站——同一能力服务人类界面与 API / MCP。
            </p>
            <p className="mt-3 text-xs font-medium tracking-wide text-muted-foreground">
              {brand.tagline}
            </p>
          </div>

          <div className="md:col-span-8 grid grid-cols-2 gap-8 sm:grid-cols-3">
            {COLUMNS.map((col) => (
              <div key={col.title} className="flex flex-col gap-3">
                <h2 className="text-sm font-semibold text-foreground">{col.title}</h2>
                <ul className="flex flex-col gap-2.5">
                  {col.links.map((link) => (
                    <li key={link.href + link.label}>
                      {"external" in link && link.external ? (
                        <a
                          href={link.href}
                          className="text-[13px] text-muted-foreground transition-colors hover:text-foreground"
                          {...(link.href.startsWith("http")
                            ? { target: "_blank", rel: "noopener noreferrer" }
                            : {})}
                        >
                          {link.label}
                        </a>
                      ) : (
                        <Link
                          href={link.href}
                          className="text-[13px] text-muted-foreground transition-colors hover:text-foreground"
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

        <div className="mt-12 flex flex-col items-start justify-between gap-3 border-t border-border pt-8 sm:flex-row sm:items-center">
          <p className="text-[13px] text-muted-foreground">
            © {year} {brand.name}. All rights reserved.
          </p>
          <p className="text-[12px] text-muted-foreground">{brand.nameCn} · Forge</p>
        </div>
      </div>
    </footer>
  );
}
