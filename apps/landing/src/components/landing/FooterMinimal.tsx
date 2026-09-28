"use client";

import { Logo } from "@nebutra/brand";
import {
  LogoGithub as Github,
  Message as MessageCircle,
  LogoTwitterX as Twitter,
} from "@nebutra/icons";
import { useTheme } from "@nebutra/tokens";
import { useTranslations } from "next-intl";
import { ThemeSwitcher } from "@/components/ui/theme-switcher";
import { useMount } from "@/hooks/useMount";
import { Link } from "@/i18n/navigation";
import { FOOTER_COLUMNS_HERE } from "@/lib/constants/footer-links";
import { footerContent } from "@/lib/landing-content";
import { FooterStatus } from "./footer-status";
import { NewsletterForm } from "./NewsletterForm";

const SOCIAL_ICONS = {
  x: Twitter,
  github: Github,
  discord: MessageCircle,
};

const SOCIAL_LABELS: Record<string, string> = {
  x: "Follow us on X (Twitter)",
  github: "View on GitHub",
  discord: "Join our Discord",
};

interface FooterMinimalProps {
  /**
   * Visual variant.
   * - `"default"`: full 4-column footer + brand block + newsletter.
   * - `"legal"`: single row of privacy/terms/cookies/refund + copyright,
   *   optimized for reading-focused legal documents. Pairs with the shared
   *   `<Navbar>` so the brand experience stays consistent across the site.
   */
  variant?: "default" | "legal";
}

/**
 * The site footer. Rendered once by the layout (`SiteChrome`), never by a page.
 */
export function FooterMinimal({ variant = "default" }: FooterMinimalProps = {}) {
  if (variant === "legal") {
    return <LegalFooter />;
  }
  return <DefaultFooter />;
}

function LegalFooter() {
  const t = useTranslations("footer");
  return (
    <footer
      data-testid="site-footer"
      className="border-t border-border bg-background/[0.08] dark:bg-background"
    >
      <div className="mx-auto max-w-wide px-6 py-8">
        <div className="flex flex-col items-center justify-between gap-4 sm:flex-row">
          <nav
            aria-label="Legal"
            className="flex flex-wrap items-center gap-x-6 gap-y-2 text-[13px]"
          >
            <Link
              href="/privacy"
              className="text-muted-foreground transition-colors hover:text-foreground"
            >
              {t("links.privacy")}
            </Link>
            <Link
              href="/terms"
              className="text-muted-foreground transition-colors hover:text-foreground"
            >
              {t("links.terms")}
            </Link>
            <Link
              href="/cookies"
              className="text-muted-foreground transition-colors hover:text-foreground"
            >
              {t("links.cookies")}
            </Link>
            <Link
              href="/refund"
              className="text-muted-foreground transition-colors hover:text-foreground"
            >
              {t("links.refund")}
            </Link>
          </nav>
          <div className="flex flex-col items-center gap-4 sm:flex-row">
            <div className="flex flex-col items-center gap-1 sm:items-end">
              <p className="text-[13px] text-muted-foreground">{t("copyright")}</p>
              {/* MiSans licence: the product must credit the typeface. */}
              <p className="text-xs text-muted-foreground">{t("fontCredit")}</p>
            </div>
            <ThemeSwitcher />
          </div>
        </div>
      </div>
    </footer>
  );
}

function DefaultFooter() {
  const t = useTranslations("footer");
  type FooterTranslationKey = Parameters<typeof t>[0];
  const { resolvedTheme } = useTheme();
  const isMounted = useMount();
  const { social, status } = footerContent;
  const isDark = !isMounted || resolvedTheme !== "light";

  const linkClassName =
    "text-[13px] text-muted-foreground transition-colors duration-200 hover:text-foreground";

  return (
    <footer
      data-testid="site-footer"
      className="relative w-full overflow-hidden border-t border-border bg-neutral-1 text-neutral-12"
    >
      <div className="mx-auto w-full min-w-0 max-w-wide px-4 pt-12 pb-8 sm:px-6 sm:pt-16">
        {/* Main grid: Brand + Navigation */}
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-[minmax(14rem,2fr)_minmax(0,4fr)] lg:gap-12">
          {/* Brand block — real track min avoids CJK 1-glyph min-content collapse */}
          <div className="flex w-full min-w-0 max-w-sm flex-col gap-5">
            <Logo variant="en" size={120} inverted={isDark} />
            <p className="w-full max-w-sm text-[13px] leading-relaxed break-words text-muted-foreground">
              {t("brandDescription")}
            </p>

            {/* Social icons */}
            <div className="-ml-2.5 flex items-center gap-1 pt-1">
              {social.map((item) => {
                const Icon = SOCIAL_ICONS[item.platform as keyof typeof SOCIAL_ICONS] || Github;
                return (
                  <a
                    key={item.platform}
                    href={item.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="rounded-[var(--radius-md)] p-2.5 text-muted-foreground transition-colors duration-200 hover:bg-muted hover:text-foreground"
                    aria-label={SOCIAL_LABELS[item.platform] ?? item.platform}
                  >
                    <Icon className="size-[18px]" />
                  </a>
                );
              })}
            </div>
          </div>

          {/* Link columns */}
          <nav
            aria-label="Footer"
            className="grid grid-cols-2 gap-8 sm:grid-cols-3 lg:grid-cols-4 lg:gap-12"
          >
            {FOOTER_COLUMNS_HERE.map((column) => (
              <div key={column.titleKey} className="flex flex-col gap-3">
                <h3 className="text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
                  {t(`columns.${column.titleKey}` as FooterTranslationKey)}
                </h3>
                <ul className="flex flex-col gap-2.5">
                  {column.links.map((link) =>
                    link.external ? (
                      <li key={link.labelKey}>
                        <a
                          href={link.href}
                          target="_blank"
                          rel="noopener noreferrer"
                          className={linkClassName}
                        >
                          {t(`links.${link.labelKey}` as FooterTranslationKey)}
                        </a>
                      </li>
                    ) : (
                      <li key={link.labelKey}>
                        <Link href={link.href} className={linkClassName}>
                          {t(`links.${link.labelKey}` as FooterTranslationKey)}
                        </Link>
                      </li>
                    ),
                  )}
                </ul>
              </div>
            ))}
          </nav>
        </div>

        {/* Newsletter */}
        <div className="mt-12 flex flex-col items-center gap-3 border-t border-border pt-8 sm:flex-row sm:justify-between">
          <p className="text-sm font-medium text-foreground">{t("newsletterTitle")}</p>
          <NewsletterForm />
        </div>

        {/* Bottom bar */}
        <div className="mt-8 flex flex-col items-center justify-between gap-4 border-t border-border pt-6 md:flex-row">
          <div className="flex flex-col items-center gap-1 md:items-start">
            <p className="text-xs text-muted-foreground">{t("copyright")}</p>
            {/* MiSans licence: the product must credit the typeface. */}
            <p className="text-xs text-muted-foreground">{t("fontCredit")}</p>
            {/* ICP 备案 — required for websites operated in mainland China */}
            {process.env.NEXT_PUBLIC_ICP_NUMBER && (
              <a
                href="https://beian.miit.gov.cn/"
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-muted-foreground transition-colors hover:text-foreground"
              >
                {process.env.NEXT_PUBLIC_ICP_NUMBER}
              </a>
            )}
          </div>

          <div className="flex items-center gap-4">
            <FooterStatus href={status.href} />
            <ThemeSwitcher />
          </div>
        </div>
      </div>
    </footer>
  );
}

FooterMinimal.displayName = "FooterMinimal";
