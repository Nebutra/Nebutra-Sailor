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
import type { ComponentType, SVGProps } from "react";
import { BrandLogo } from "@/components/brand-logo";

const QUICK_ACCESS = [
  { label: "应用集市", href: "/?product_type=tool" },
  { label: "API 集市", href: "/?product_type=api" },
  { label: "模型目录", href: "/models" },
  { label: "管理后台", href: "/dashboard" },
  { label: "快捷使用", href: "/use" },
] as const;

const SUPPORT = [
  { label: "客户端", href: "http://localhost:3105", external: true },
  { label: "API 文档", href: "/docs" },
  { label: "费用说明", href: "/docs" },
  { label: "常见问题", href: "/docs" },
  { label: "帮助中心", href: "/docs" },
  { label: "联系我们", href: "/docs" },
] as const;

const LEGAL = [
  { label: "服务条款", href: "/docs" },
  { label: "隐私政策", href: "/docs" },
  { label: "退款政策", href: "/docs" },
  { label: "知识产权", href: "/docs" },
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
  const year = new Date().getFullYear();

  return (
    <footer className="mt-12 border-t border-[var(--rm-panel-border,var(--neutral-6))] bg-white/80">
      <div className="router-market-shell grid gap-10 py-14 md:grid-cols-[1.15fr_1fr] md:gap-14 lg:grid-cols-[1.2fr_1.6fr]">
        {/* Brand column */}
        <div className="min-w-0">
          <Link href="/" className="inline-flex items-center" aria-label={brand.name}>
            <BrandLogo variant="horizontal" className="h-7 w-auto" />
          </Link>
          <p className="mt-4 text-[13px] leading-relaxed text-[var(--neutral-10)]">
            Need more information?
          </p>
          <p className="mt-1 text-[12px] text-[var(--neutral-9)]">
            {brand.name} · Router API 集市（lab）
          </p>

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
                  className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-[var(--neutral-3)] text-[var(--neutral-12)] transition hover:bg-[var(--neutral-4)]"
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
                  title={p.label}
                  aria-label={p.label}
                  className={[
                    "inline-flex h-7 items-center justify-center overflow-hidden rounded-md border border-[var(--neutral-6)] bg-white shadow-[0_1px_1px_rgb(15_23_42/0.04)]",
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
          <FooterCol title="Quick Access" links={QUICK_ACCESS} />
          <FooterCol title="Support" links={SUPPORT} />
          <FooterCol title="Legal" links={LEGAL} />
        </div>
      </div>

      <div className="border-t border-[var(--rm-panel-border,var(--neutral-6))]">
        <div className="router-market-shell flex flex-col gap-1 py-5 text-[12px] text-[var(--neutral-9)] md:flex-row md:items-center md:justify-between">
          <p>
            © {year} {brand.name}. All rights reserved.
          </p>
          <p className="text-[var(--neutral-8)]">API 集市 · 按量付费 · 多模型统一接入</p>
        </div>
      </div>
    </footer>
  );
}

function FooterCol({
  title,
  links,
}: {
  title: string;
  links: readonly { label: string; href: string; external?: boolean }[];
}) {
  return (
    <div>
      <p className="text-[13px] font-semibold text-[var(--neutral-12)]">{title}</p>
      <ul className="mt-3 space-y-2">
        {links.map((l) => (
          <li key={l.label}>
            {l.external ? (
              <a
                href={l.href}
                className="text-[12px] text-[var(--neutral-10)] transition hover:text-[var(--neutral-12)]"
              >
                {l.label}
              </a>
            ) : (
              <Link
                href={l.href}
                className="text-[12px] text-[var(--neutral-10)] transition hover:text-[var(--neutral-12)]"
              >
                {l.label}
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
