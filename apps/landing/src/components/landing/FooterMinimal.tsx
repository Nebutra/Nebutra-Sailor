"use client";

import { Logo } from "@nebutra/brand";
import {
  ArrowRight,
  LogoGithub as Github,
  Message as MessageCircle,
  LogoTwitterX as Twitter,
} from "@nebutra/icons";
import { useTheme } from "@nebutra/tokens";
import { AuroraBackground, Button } from "@nebutra/ui/primitives";
import { useTranslations } from "next-intl";
import { useMount } from "@/hooks/useMount";
import { Link } from "@/i18n/navigation";
import { createPublicDocsUrl } from "@/lib/docs-links";
import { footerContent, heroContent } from "@/lib/landing-content";
import { cn } from "@/lib/utils";
import { CommandInstallBox } from "./CommandInstallBox";
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

interface FooterColumn {
  titleKey: string;
  links: {
    labelKey: string;
    href: string;
    external?: boolean;
  }[];
}

const FOOTER_COLUMNS: FooterColumn[] = [
  {
    titleKey: "product",
    links: [
      { labelKey: "features", href: "/features" },
      { labelKey: "pricing", href: "/pricing" },
      { labelKey: "about", href: "/about" },
      { labelKey: "careers", href: "/careers" },
    ],
  },
  {
    titleKey: "resources",
    links: [
      { labelKey: "blog", href: "/blog" },
      { labelKey: "playbook", href: "/playbook" },
      { labelKey: "changelog", href: "/changelog" },
      { labelKey: "roadmap", href: "/roadmap" },
      { labelKey: "docs", href: createPublicDocsUrl(), external: true },
      { labelKey: "ideas", href: "/ideas" },
      { labelKey: "opc", href: "/about/products" },
    ],
  },
  {
    titleKey: "legal",
    links: [
      { labelKey: "security", href: "/security" },
      { labelKey: "privacy", href: "/privacy" },
      { labelKey: "terms", href: "/terms" },
      { labelKey: "cookies", href: "/cookies" },
      { labelKey: "dpa", href: "/dpa" },
      { labelKey: "refund", href: "/refund" },
      { labelKey: "licensing", href: "/licensing" },
      { labelKey: "contact", href: "/contact" },
      { labelKey: "faq", href: "/faq" },
    ],
  },
  {
    titleKey: "community",
    links: [
      {
        labelKey: "github",
        href: "https://github.com/Nebutra/Nebutra-Sailor",
        external: true,
      },
      { labelKey: "discord", href: "https://discord.gg/nebutra", external: true },
      { labelKey: "twitter", href: "https://x.com/nebutra", external: true },
    ],
  },
];

interface FooterMinimalProps {
  /**
   * Show the product-pitch "stop fiddling, start building" CTA above the footer.
   * Default `false` — opt in only on conversion-intent pages (home, features,
   * pricing). Leaving it on by default polluted careers / legal / blog pages
   * with a misplaced product pitch.
   */
  showFinalCta?: boolean;
  /**
   * Visual variant.
   * - `"default"`: full 4-column footer + brand block + newsletter.
   * - `"legal"`: single row of privacy/terms/cookies/refund + copyright,
   *   optimized for reading-focused legal documents. Pairs with the shared
   *   `<Navbar>` so the brand experience stays consistent across the site.
   */
  variant?: "default" | "legal";
}

export function FooterMinimal({
  showFinalCta = false,
  variant = "default",
}: FooterMinimalProps = {}) {
  if (variant === "legal") {
    return <LegalFooter />;
  }
  return <DefaultFooter showFinalCta={showFinalCta} />;
}

function LegalFooter() {
  const t = useTranslations("footer");
  return (
    <footer className="border-t border-border bg-background/[0.08] dark:bg-background">
      <div className="mx-auto max-w-[1400px] px-6 py-8">
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
          <p className="text-[13px] text-muted-foreground">{t("copyright")}</p>
        </div>
      </div>
    </footer>
  );
}

function DefaultFooter({ showFinalCta }: { showFinalCta: boolean }) {
  const t = useTranslations("footer");
  const tCta = useTranslations("microLanding.cta");
  const tCommand = useTranslations("cta");
  type FooterTranslationKey = Parameters<typeof t>[0];
  const { resolvedTheme } = useTheme();
  const isMounted = useMount();
  const { social, status } = footerContent;
  const isDark = !isMounted || resolvedTheme !== "light";

  const linkClassName = cn(
    "text-[13px] text-muted-foreground transition-colors duration-200",
    "hover:text-foreground",
    "",
  );

  return (
    <footer
      data-testid="footer-minimal"
      className="relative w-full overflow-hidden bg-[var(--neutral-1)] text-[var(--neutral-12)]"
    >
      {/* Final CTA — opt-in via `showFinalCta`; default off to avoid polluting
          non-conversion pages (careers, legal, blog) with a product pitch. */}
      {showFinalCta && (
        <section
          data-testid="footer-final-cta"
          className="relative overflow-hidden border-b border-[color:hsl(var(--muted))]/[0.06]"
        >
          <AuroraBackground variant="vivid" position="bottom" intensity={0.5} />
          <div className="relative mx-auto max-w-[1400px] px-6 py-24 text-center">
            <p className="mb-4 text-xs font-medium uppercase tracking-[0.12em] text-muted-foreground">
              {tCta("eyebrow")}
            </p>
            <h2
              className="text-3xl md:text-4xl lg:text-5xl font-semibold text-foreground text-balance"
              style={{
                letterSpacing: "var(--tracking-heading)",
                lineHeight: "var(--leading-heading)",
              }}
            >
              {tCta("title")}
            </h2>
            <p className="mt-4 text-base md:text-lg text-muted-foreground max-w-4xl mx-auto leading-relaxed">
              {tCta("description")}
            </p>
            <div className="mx-auto mt-8 max-w-xl">
              <CommandInstallBox
                command={heroContent.command}
                copyLabel={tCommand("copyLabel")}
                copiedLabel={tCommand("copiedLabel")}
              />
            </div>
            <div className="mt-6">
              <Button asChild variant="ink" size="lg">
                <Link href="/get-license">
                  {tCta("button")}
                  <ArrowRight className="ml-2 size-4" />
                </Link>
              </Button>
            </div>
            <p className="mt-6 text-sm text-muted-foreground">{tCta("license")}</p>
          </div>
        </section>
      )}

      <div className="mx-auto max-w-[1400px] px-6 pt-16 pb-8">
        {/* Main grid: Brand + Navigation */}
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-[minmax(14rem,2fr)_minmax(0,4fr)] lg:gap-12">
          {/* Brand block — real track min avoids CJK 1-glyph min-content collapse */}
          <div className="flex w-full min-w-0 max-w-sm flex-col gap-5">
            <Logo variant="en" size={120} inverted={isDark} />
            <p className="w-full max-w-sm text-[13px] leading-relaxed break-words text-muted-foreground">
              {t("brandDescription")}
            </p>

            {/* Social icons */}
            <div className="flex items-center gap-3 pt-1">
              {social.map((item) => {
                const Icon = SOCIAL_ICONS[item.platform as keyof typeof SOCIAL_ICONS] || Github;
                return (
                  <a
                    key={item.platform}
                    href={item.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={cn(
                      "rounded-[var(--radius-md)] p-2.5 text-[color:hsl(var(--muted-foreground))] transition-colors duration-200",
                      "hover:bg-muted hover:text-foreground",
                      "/[0.06]",
                    )}
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
            {FOOTER_COLUMNS.map((column) => (
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
        <div className="mt-12 flex flex-col items-center gap-3 border-t border-[color:hsl(var(--muted))] pt-8 sm:flex-row sm:justify-between">
          <p className="text-sm font-medium text-foreground">{t("newsletterTitle")}</p>
          <NewsletterForm />
        </div>

        {/* Bottom bar */}
        <div className="mt-8 flex flex-col items-center justify-between gap-4 border-t border-[color:hsl(var(--muted))] pt-6 md:flex-row">
          <div className="flex flex-col items-center gap-1 md:items-start">
            <p className="text-xs text-[color:hsl(var(--muted-foreground))]">{t("copyright")}</p>
            {/* ICP 备案 — required for websites operated in mainland China */}
            {process.env.NEXT_PUBLIC_ICP_NUMBER && (
              <a
                href="https://beian.miit.gov.cn/"
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-[color:hsl(var(--border))] transition-colors hover:text-muted-foreground"
              >
                {process.env.NEXT_PUBLIC_ICP_NUMBER}
              </a>
            )}
          </div>

          {/* Status indicator */}
          <a
            href={status.href}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 text-xs text-muted-foreground transition-colors hover:text-foreground"
          >
            <span
              data-testid="status-dot"
              className="size-1.5 rounded-full bg-[color:var(--cyan-9)] shadow-[0_0_0_3px_color-mix(in_srgb,var(--cyan-9)_20%,transparent)]"
            />
            {t("statusOnline")}
          </a>
        </div>
      </div>
    </footer>
  );
}

FooterMinimal.displayName = "FooterMinimal";
