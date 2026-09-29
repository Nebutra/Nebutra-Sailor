import { brand } from "@nebutra/brand/metadata";
import { getLocale } from "next-intl/server";
import { ThemeSwitcher } from "@/components/ui/theme-switcher";
import { Link } from "@/i18n/navigation";
import { REPO_URL } from "@/nebutra/data/repo";
import { pick, siteLang } from "@/nebutra/i18n";
import { ROUTES } from "@/nebutra/routes";
import { LanguageSwitch } from "@/nebutra/shell/language-switch";
import { ThemedLogo } from "@/nebutra/shell/themed-logo";

/** Nebutra's own footer — the company, its products, its writing, the legal line. */
export async function SiteFooter() {
  const l = siteLang(await getLocale());
  const t = (en: string, zh: string) => pick(l, { en, zh });
  const cols = [
    {
      k: t("Read", "阅读"),
      links: [
        { label: t("Journal", "日志"), href: ROUTES.journal },
        { label: t("Changelog", "更新日志"), href: "/changelog" },
      ],
    },
    {
      k: t("Build", "构建"),
      links: [
        { label: "Sailor", href: ROUTES.sailor },
        { label: "GitHub", href: REPO_URL },
        { label: t("What we're building", "我们正在造的"), href: ROUTES.building },
        { label: t("Status", "服务状态"), href: `https://status.${brand.domains.landing}` },
      ],
    },
    {
      k: t("Company", "公司"),
      links: [
        { label: t("About", "关于我们"), href: ROUTES.company },
        {
          label: t("Write to the founder", "写信给创始人"),
          href: `mailto:tseka@${brand.domains.landing}`,
        },
        { label: t("Privacy", "隐私"), href: "/privacy" },
        { label: t("Terms", "条款"), href: "/terms" },
        // MiSans licence: the product states it uses MiSans — on /credits.
        { label: t("Credits", "致谢"), href: "/credits" },
      ],
    },
  ];
  return (
    <footer data-testid="site-footer" className="border-t border-border px-8 pt-16 pb-10 xl:px-16">
      <div className="grid grid-cols-2 gap-10 md:grid-cols-[minmax(0,1.4fr)_repeat(3,minmax(0,1fr))]">
        <div className="col-span-2 md:col-span-1">
          <ThemedLogo size={112} />
          <p className="mt-2 max-w-xs text-sm text-muted-foreground">
            {t(
              "An AI-native company builder. No company should be hard to start.",
              "AI 原生的公司建造者。让世界上没有难创的业。",
            )}
          </p>
        </div>
        <nav
          aria-label="Footer"
          className="col-span-2 grid grid-cols-2 gap-10 md:col-span-3 md:grid-cols-subgrid"
        >
          {cols.map((c) => (
            <div key={c.k}>
              <p className="text-sm text-foreground">{c.k}</p>
              <ul className="mt-4 flex flex-col gap-2.5">
                {c.links.map((l) => (
                  <li key={l.label}>
                    {/^https?:/.test(l.href) ? (
                      <a
                        href={l.href}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm text-muted-foreground transition-colors duration-micro hover:text-foreground"
                      >
                        {l.label}
                      </a>
                    ) : (
                      <Link
                        href={l.href}
                        className="text-sm text-muted-foreground transition-colors duration-micro hover:text-foreground"
                      >
                        {l.label}
                      </Link>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </nav>
      </div>
      <div className="mt-16 flex flex-wrap justify-between gap-4 border-t border-border pt-6 text-xs text-muted-foreground">
        <span>
          © 2026 {brand.nameFullEn} · {brand.nameFull}
        </span>
        <span className="flex flex-wrap items-center gap-4">
          {/* ICP 备案 — required for a site operated in mainland China */}
          {process.env.NEXT_PUBLIC_ICP_NUMBER ? (
            <a
              href="https://beian.miit.gov.cn/"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-foreground"
            >
              {process.env.NEXT_PUBLIC_ICP_NUMBER}
            </a>
          ) : null}
          <LanguageSwitch />
          <ThemeSwitcher />
        </span>
      </div>
    </footer>
  );
}
