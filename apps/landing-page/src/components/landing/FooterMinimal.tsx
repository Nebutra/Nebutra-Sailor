"use client";

import { Logo } from "@nebutra/brand";
import {
  LogoGithub as Github,
  Message as MessageCircle,
  LogoTwitterX as Twitter,
} from "@nebutra/icons";
import { useTranslations } from "next-intl";
import { useTheme } from "next-themes";
import { useMount } from "@/hooks/useMount";
import { Link } from "@/i18n/navigation";
import { footerContent } from "@/lib/landing-content";
import { cn } from "@/lib/utils";
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
      { labelKey: "showcase", href: "/showcase" },
    ],
  },
  {
    titleKey: "resources",
    links: [
      { labelKey: "blog", href: "/blog" },
      { labelKey: "changelog", href: "/changelog" },
      { labelKey: "roadmap", href: "/roadmap" },
      { labelKey: "docs", href: "https://docs.nebutra.com", external: true },
      { labelKey: "ideas", href: "/ideas" },
      { labelKey: "opc", href: "/opc" },
    ],
  },
  {
    titleKey: "legal",
    links: [
      { labelKey: "privacy", href: "/privacy" },
      { labelKey: "terms", href: "/terms" },
      { labelKey: "cookies", href: "/cookies" },
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

export function FooterMinimal() {
  const t = useTranslations("footer");
  type FooterTranslationKey = Parameters<typeof t>[0];
  const { resolvedTheme } = useTheme();
  const isMounted = useMount();
  const { social, status } = footerContent;
  const isDark = !isMounted || resolvedTheme !== "light";

  const linkClassName = cn(
    "text-[13px] text-[color:var(--neutral-10)] transition-colors duration-200",
    "hover:text-[color:var(--neutral-12)]",
    "dark:text-white/50 dark:hover:text-white/90",
  );

  return (
    <footer
      data-testid="footer-minimal"
      className="relative w-full overflow-hidden bg-[color:var(--neutral-1)] dark:bg-black"
    >
      {/* Gradient top border */}
      <div
        aria-hidden="true"
        data-testid="footer-gradient-line"
        className="pointer-events-none absolute inset-x-0 top-0 h-px"
        style={{ background: "var(--brand-gradient)" }}
      />

      <div className="mx-auto max-w-[1400px] px-6 pt-16 pb-8">
        {/* Main grid: Brand + Navigation */}
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-[minmax(0,2fr)_minmax(0,4fr)] lg:gap-12">
          {/* Brand block — spans 2 cols on large */}
          <div className="flex flex-col gap-5">
            <Logo variant="en" size={120} inverted={isDark} />
            <p className="max-w-xs text-[13px] leading-relaxed text-[color:var(--neutral-10)] dark:text-white/50">
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
                      "rounded-md p-2.5 text-[color:var(--neutral-9)] transition-all duration-200",
                      "hover:bg-[color:var(--neutral-3)] hover:text-[color:var(--neutral-12)]",
                      "dark:text-white/40 dark:hover:bg-white/[0.06] dark:hover:text-white/90",
                    )}
                    aria-label={SOCIAL_LABELS[item.platform] ?? item.platform}
                  >
                    <Icon className="h-[18px] w-[18px]" />
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
                <h3 className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[color:var(--neutral-11)] dark:text-white/60">
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
        <div className="mt-12 flex flex-col items-center gap-3 border-t border-[color:var(--neutral-4)] pt-8 dark:border-white/[0.06] sm:flex-row sm:justify-between">
          <p className="text-sm font-medium text-[color:var(--neutral-12)] dark:text-white">
            {t("newsletterTitle")}
          </p>
          <NewsletterForm />
        </div>

        {/* Bottom bar */}
        <div className="mt-8 flex flex-col items-center justify-between gap-4 border-t border-[color:var(--neutral-4)] pt-6 dark:border-white/[0.06] md:flex-row">
          <div className="flex flex-col items-center gap-1 md:items-start">
            <p className="text-xs text-[color:var(--neutral-9)] dark:text-white/40">
              {t("copyright")}
            </p>
            {/* ICP 备案 — required for websites operated in mainland China */}
            {process.env.NEXT_PUBLIC_ICP_NUMBER && (
              <a
                href="https://beian.miit.gov.cn/"
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-[color:var(--neutral-8)] transition-colors hover:text-[color:var(--neutral-11)] dark:text-white/30 dark:hover:text-white/60"
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
            className="flex items-center gap-2 text-xs text-[color:var(--neutral-10)] transition-colors hover:text-[color:var(--neutral-12)] dark:text-white/50 dark:hover:text-white/80"
          >
            <span
              data-testid="status-dot"
              className="h-1.5 w-1.5 rounded-full bg-[color:var(--cyan-9)] shadow-[0_0_0_3px_color-mix(in_srgb,var(--cyan-9)_20%,transparent)]"
            />
            {t("statusOnline")}
          </a>
        </div>
      </div>
    </footer>
  );
}

FooterMinimal.displayName = "FooterMinimal";
