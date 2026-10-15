"use client";

import { brand } from "@nebutra/brand/metadata";
import {
  LogoAmex,
  LogoDiscord,
  LogoGithub,
  LogoLinkedinSmall,
  LogoMastercard,
  LogoTwitterX,
  LogoVisa,
} from "@nebutra/icons";
import Link from "next/link";
import { useTranslations } from "next-intl";
import type { ComponentType, SVGProps } from "react";
import { BrandLogo } from "@/components/brand-logo";
import { forgeHref } from "@/lib/forge-url";

const LANDING = `https://${brand.domains.landing}`;

/** Labels are message keys under `footer.*`; every href resolves to a real page. */
const QUICK_ACCESS = [
  { key: "models", href: "/models" },
  { key: "console", href: "/dashboard" },
  { key: "quickUse", href: "/use" },
] as const;

const SUPPORT = [
  { key: "forge", href: forgeHref(), external: true },
  { key: "apiDocs", href: "/docs" },
  { key: "faq", href: `${LANDING}/faq`, external: true },
  { key: "contact", href: `${LANDING}/contact`, external: true },
  { key: "status", href: `https://${brand.domains.status}`, external: true },
] as const;

const LEGAL = [
  { key: "terms", href: `${LANDING}/terms`, external: true },
  { key: "privacy", href: `${LANDING}/privacy`, external: true },
  { key: "refund", href: `${LANDING}/refund`, external: true },
  { key: "cookies", href: `${LANDING}/cookies`, external: true },
] as const;

type SvgIcon = ComponentType<SVGProps<SVGSVGElement> & { size?: number | string }>;

const SOCIAL: readonly { id: string; label: string; href: string; Icon: SvgIcon }[] = [
  { id: "github", label: "GitHub", href: brand.social.github, Icon: LogoGithub },
  {
    id: "x",
    label: "X",
    href: brand.social.twitter.replace("https://twitter.com/", "https://x.com/"),
    Icon: LogoTwitterX,
  },
  { id: "discord", label: "Discord", href: brand.social.discord, Icon: LogoDiscord },
  { id: "linkedin", label: "LinkedIn", href: brand.social.linkedin, Icon: LogoLinkedinSmall },
];

const PAY_BADGES: readonly {
  id: string;
  label: string;
  Icon: SvgIcon;
  /** square brand tile vs wide wordmark */
  wide?: boolean;
}[] = [
  { id: "visa", label: "Visa", Icon: LogoVisa },
  { id: "mastercard", label: "Mastercard", Icon: LogoMastercard },
  { id: "amex", label: "American Express", Icon: LogoAmex },
  { id: "jcb", label: "JCB", Icon: LogoJcb, wide: true },
  { id: "unionpay", label: "UnionPay", Icon: LogoUnionPay, wide: true },
];

/**
 * 302-style market footer: brand + social + pay · link columns
 * Social/pay logos: @nebutra/icons (Visa/MC/Amex) + compact brand marks (JCB/UnionPay)
 */
export function MarketFooter() {
  const t = useTranslations("footer");
  const year = new Date().getFullYear();

  return (
    <footer className="mt-12 border-t border-border">
      <div className="router-market-shell grid gap-10 py-14 md:grid-cols-[1.15fr_1fr] md:gap-14 lg:grid-cols-[1.2fr_1.6fr]">
        {/* Brand column */}
        <div className="min-w-0">
          <Link href="/" className="inline-flex items-center" aria-label={brand.name}>
            <BrandLogo variant="horizontal" className="h-7 w-auto" />
          </Link>
          <p className="mt-4 max-w-xs text-sm text-muted-foreground">{t("tagline")}</p>

          <div className="mt-5 flex flex-wrap items-center gap-2">
            {SOCIAL.map((s) => {
              const Icon = s.Icon;
              return (
                <a
                  key={s.id}
                  href={s.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={s.label}
                  className="inline-flex h-8 w-8 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
                >
                  <Icon size={15} className="h-[15px] w-[15px]" />
                </a>
              );
            })}
          </div>

          <div className="mt-5 flex flex-wrap items-center gap-1.5">
            {PAY_BADGES.map((p) => {
              const Icon = p.Icon;
              return (
                <span
                  key={p.id}
                  role="img"
                  aria-label={p.label}
                  // A deliberate light plate: acceptance marks are specified on white,
                  // and several (Visa navy, Amex) vanish on a dark surface.
                  data-logo-plate
                  className={[
                    // allow-palette: payment network mark (Visa/MC/Amex) badge requires fixed white per brand guidelines (@allow-raw-color)
                    "inline-flex h-7 items-center justify-center overflow-hidden rounded-md border border-neutral-6 bg-white shadow-ambient-sm",
                    p.wide ? "px-1.5" : "w-10",
                  ].join(" ")}
                >
                  <Icon
                    size={p.wide ? 28 : 22}
                    className={p.wide ? "h-[18px] w-auto" : "h-[18px] w-[18px]"}
                    aria-hidden
                  />
                </span>
              );
            })}
          </div>
        </div>

        {/* Link columns */}
        <div className="grid grid-cols-2 gap-8 sm:grid-cols-3">
          <FooterCol title={t("quickAccess")} links={QUICK_ACCESS} t={t} />
          <FooterCol title={t("support")} links={SUPPORT} t={t} />
          <FooterCol title={t("legal")} links={LEGAL} t={t} />
        </div>
      </div>

      <div className="border-t border-border">
        <div className="router-market-shell flex flex-col gap-1 py-5 text-xs text-muted-foreground md:flex-row md:items-center md:justify-between">
          <p>{t("copyright", { year, brandName: brand.name })}</p>
          <p>{t("strapline")}</p>
        </div>
      </div>
    </footer>
  );
}

function FooterCol({
  title,
  links,
  t,
}: {
  title: string;
  links: readonly { key: string; href: string; external?: boolean }[];
  t: (key: string) => string;
}) {
  return (
    <div>
      <p className="text-sm font-medium text-neutral-12">{title}</p>
      <ul className="mt-3 space-y-2">
        {links.map((l) => (
          <li key={l.key}>
            {l.external ? (
              <a
                href={l.href}
                className="text-sm text-neutral-11 transition-colors hover:text-neutral-12"
              >
                {t(`links.${l.key}`)}
              </a>
            ) : (
              <Link
                href={l.href}
                className="text-sm text-neutral-11 transition-colors hover:text-neutral-12"
              >
                {t(`links.${l.key}`)}
              </Link>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}

/** JCB acceptance mark — compact tri-color wordmark (not in @nebutra/icons) */
function LogoJcb({
  size = 28,
  className,
  ...props
}: SVGProps<SVGSVGElement> & { size?: number | string }) {
  const w = typeof size === "number" ? size : 28;
  const h = typeof size === "number" ? Math.round(Number(size) * 0.62) : 18;
  return (
    <svg viewBox="0 0 40 24" width={w} height={h} className={className} aria-hidden {...props}>
      <rect width="40" height="24" rx="3" fill="#1B1F3B" />
      {/* simplified J C B monograms in brand blues/red/green */}
      <circle cx="10" cy="12" r="5.5" fill="#0B4EA2" />
      <circle cx="20" cy="12" r="5.5" fill="#E31C23" />
      <circle cx="30" cy="12" r="5.5" fill="#007B3D" />
      <text
        x="10"
        y="14.2"
        textAnchor="middle"
        fill="#fff"
        fontSize="7"
        fontFamily="system-ui,sans-serif"
        fontWeight="800"
      >
        J
      </text>
      <text
        x="20"
        y="14.2"
        textAnchor="middle"
        fill="#fff"
        fontSize="7"
        fontFamily="system-ui,sans-serif"
        fontWeight="800"
      >
        C
      </text>
      <text
        x="30"
        y="14.2"
        textAnchor="middle"
        fill="#fff"
        fontSize="7"
        fontFamily="system-ui,sans-serif"
        fontWeight="800"
      >
        B
      </text>
    </svg>
  );
}

/** China UnionPay acceptance mark — red / blue / teal bars (not in @nebutra/icons) */
function LogoUnionPay({
  size = 28,
  className,
  ...props
}: SVGProps<SVGSVGElement> & { size?: number | string }) {
  const w = typeof size === "number" ? size : 28;
  const h = typeof size === "number" ? Math.round(Number(size) * 0.62) : 18;
  return (
    <svg viewBox="0 0 40 24" width={w} height={h} className={className} aria-hidden {...props}>
      <rect width="40" height="24" rx="3" fill="#fff" stroke="#E5E7EB" />
      <path d="M3 4h11v16H3z" fill="#E21836" />
      <path d="M14.5 4h11v16h-11z" fill="#00447C" />
      <path d="M26 4h11v16H26z" fill="#007B84" />
      {/* abstract 银联 waves — no trademark glyphs */}
      <path
        d="M6 14c2-3 5-3 7 0M17.5 14c2-3 5-3 7 0M29 14c2-3 5-3 7 0"
        stroke="#fff"
        strokeWidth="1.4"
        fill="none"
        strokeLinecap="round"
      />
    </svg>
  );
}
