"use client";

import {
  ArrowRight,
  Message as Discord,
  LogoGithub as Github,
  LogoLinkedin as Linkedin,
  LogoTwitterX as Twitter,
  LogoYoutubeSmall as Youtube,
} from "@nebutra/icons";
import { Input } from "@nebutra/ui/primitives";
import { cva } from "class-variance-authority";
import Link from "next/link";
import { AnimateIn } from "../primitives/animate-in";
import { cn } from "../utils/cn";
import type { FooterProps } from "./types";

const EMPTY_FOOTER_SECTIONS: NonNullable<FooterProps["sections"]> = [];
const EMPTY_SOCIAL_LINKS: NonNullable<FooterProps["social"]> = [];
const DEFAULT_COPYRIGHT = `© ${new Date().getFullYear()} Nebutra. All rights reserved.`;

const footerVariants = cva("w-full bg-[var(--neutral-1)] border-t border-[var(--neutral-6)]", {
  variants: {
    density: {
      compact: "pt-12 pb-8",
      normal: "pt-16 pb-10 md:pt-24",
      spacious: "pt-24 pb-12 md:pt-32",
    },
  },
  defaultVariants: {
    density: "normal",
  },
});

function SocialIcon({ platform }: { platform: string }) {
  switch (platform) {
    case "twitter":
      return <Twitter className="w-5 h-5" />;
    case "github":
      return <Github className="w-5 h-5" />;
    case "linkedin":
      return <Linkedin className="w-5 h-5" />;
    case "discord":
      return <Discord className="w-5 h-5" />;
    case "youtube":
      return <Youtube className="w-5 h-5" />;
    default:
      return null;
  }
}

function isInternalHref(href: string) {
  return href.startsWith("/") && !href.startsWith("//");
}

export function Footer({
  locale = "en",
  sections = EMPTY_FOOTER_SECTIONS,
  social = EMPTY_SOCIAL_LINKS,
  showNewsletter = true,
  copyright,
  className,
  id,
  density = "normal",
}: FooterProps) {
  return (
    <footer id={id} className={cn(footerVariants({ density }), className)}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Main Footer Layout */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-12 lg:gap-8 xl:gap-12 mb-16 md:mb-24">
          {/* Brand & Social Column */}
          <div className="md:col-span-4 lg:col-span-4 flex flex-col gap-6">
            <AnimateIn preset="fadeUp">
              {/* Brand Logo */}
              <Link
                href={`/${locale}`}
                className="inline-flex items-center gap-2 outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[var(--neutral-12)] rounded-[var(--radius-md)]"
              >
                {/* Generic Standard Logo Placeholder */}
                <div className="flex items-center justify-center w-8 h-8 rounded-[var(--radius-lg)] bg-[var(--brand-gradient-start,var(--blue-9))] text-white font-bold">
                  N
                </div>
                <span className="text-xl font-bold tracking-tight text-[var(--neutral-12)]">
                  Nebutra
                </span>
              </Link>

              <p className="mt-4 text-sm leading-relaxed text-[var(--neutral-11)] max-w-sm">
                Building the future of AI-native SaaS. A premium, high-fidelity monorepo
                architecture engineered for 2026 SV Best Practices.
              </p>

              {social.length > 0 && (
                <div className="flex items-center gap-4 mt-6">
                  {social.map((link) => (
                    <a
                      key={link.platform}
                      href={link.href}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[var(--neutral-10)] hover:text-[var(--brand-gradient-start,var(--blue-11))] transition-colors outline-none focus-visible:ring-2 focus-visible:ring-[var(--neutral-8)] rounded-[var(--radius-md)]"
                      aria-label={link.platform}
                    >
                      <SocialIcon platform={link.platform} />
                    </a>
                  ))}
                </div>
              )}
            </AnimateIn>
          </div>

          {/* Navigation Links Columns */}
          <div className="md:col-span-8 lg:col-span-8 grid grid-cols-2 md:grid-cols-4 gap-8">
            {sections.map((section, idx) => (
              <AnimateIn key={section.title} preset="fadeUp" delay={0.1 + idx * 0.05}>
                <div className="flex flex-col gap-4">
                  <h4 className="text-sm font-semibold tracking-wide text-[var(--neutral-12)]">
                    {section.title}
                  </h4>
                  <ul className="flex flex-col gap-3">
                    {section.links.map((link) => (
                      <li key={link.href}>
                        {link.external || !isInternalHref(link.href) ? (
                          <a
                            href={link.href}
                            target={link.external ? "_blank" : undefined}
                            rel={link.external ? "noopener noreferrer" : undefined}
                            className="inline-flex items-center gap-2 text-sm text-[var(--neutral-11)] hover:text-[var(--neutral-12)] transition-colors outline-none focus-visible:ring-2 focus-visible:ring-[var(--neutral-8)] rounded-[var(--radius-sm)]"
                          >
                            {link.label}
                            {link.badge && (
                              <span className="px-2 py-0.5 text-[10px] uppercase tracking-wider font-semibold bg-[var(--brand-gradient-start,var(--blue-3))] text-[var(--brand-gradient-end,var(--blue-11))] rounded-full">
                                {link.badge}
                              </span>
                            )}
                          </a>
                        ) : (
                          <Link
                            href={link.href}
                            className="inline-flex items-center gap-2 text-sm text-[var(--neutral-11)] hover:text-[var(--neutral-12)] transition-colors outline-none focus-visible:ring-2 focus-visible:ring-[var(--neutral-8)] rounded-[var(--radius-sm)]"
                          >
                            {link.label}
                            {link.badge && (
                              <span className="px-2 py-0.5 text-[10px] uppercase tracking-wider font-semibold bg-[var(--brand-gradient-start,var(--blue-3))] text-[var(--brand-gradient-end,var(--blue-11))] rounded-full">
                                {link.badge}
                              </span>
                            )}
                          </Link>
                        )}
                      </li>
                    ))}
                  </ul>
                </div>
              </AnimateIn>
            ))}

            {/* Newsletter Injection into the responsive grid if there is space */}
            {showNewsletter && sections.length < 4 && (
              <AnimateIn
                preset="fadeUp"
                delay={0.3}
                className="col-span-2 md:col-span-4 lg:col-span-1 min-w-[240px]"
              >
                <div className="flex flex-col gap-4">
                  <h4 className="text-sm font-semibold tracking-wide text-[var(--neutral-12)]">
                    Subscribe
                  </h4>
                  <p className="text-sm text-[var(--neutral-11)]">
                    Get the latest updates and release notes straight to your inbox.
                  </p>
                  <div className="mt-2 flex flex-col gap-3">
                    <div className="relative flex items-center">
                      <Input
                        type="email"
                        placeholder="Enter your email"
                        aria-label="Email address"
                        required
                      />
                      <button
                        type="button"
                        className="absolute right-1 p-1.5 flex items-center justify-center text-[var(--neutral-11)] hover:text-[var(--neutral-12)] hover:bg-[var(--neutral-4)] rounded-[var(--radius-md)] transition-colors focus:outline-none focus:ring-2 focus:ring-[var(--neutral-8)]"
                        aria-label="Submit newsletter subscription"
                      >
                        <ArrowRight className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              </AnimateIn>
            )}
          </div>
        </div>

        {/* Bottom Bar: Legal & Locale */}
        <AnimateIn preset="fadeUp" delay={0.4}>
          <div className="pt-8 border-t border-[var(--neutral-6)] flex flex-col md:flex-row items-center justify-between gap-6">
            <p className="text-sm text-[var(--neutral-11)] order-2 md:order-1 text-center md:text-left">
              {copyright || DEFAULT_COPYRIGHT}
            </p>

            <div className="flex flex-col sm:flex-row items-center gap-4 sm:gap-8 order-1 md:order-2">
              <div className="flex items-center gap-6 text-sm text-[var(--neutral-11)]">
                <Link
                  href={`/${locale}/privacy`}
                  className="hover:text-[var(--neutral-12)] transition-colors outline-none focus-visible:ring-2 focus-visible:ring-[var(--neutral-8)] rounded-[var(--radius-sm)]"
                >
                  Privacy Policy
                </Link>
                <Link
                  href={`/${locale}/terms`}
                  className="hover:text-[var(--neutral-12)] transition-colors outline-none focus-visible:ring-2 focus-visible:ring-[var(--neutral-8)] rounded-[var(--radius-sm)]"
                >
                  Terms of Service
                </Link>
              </div>

              <div className="flex items-center gap-2 text-sm text-[var(--neutral-11)] border-l-0 sm:border-l border-[var(--neutral-6)] pl-0 sm:pl-8">
                <span className="font-medium text-[var(--neutral-12)] uppercase tracking-wider text-xs bg-[var(--neutral-3)] px-2 py-1 rounded">
                  {locale}
                </span>
              </div>
            </div>
          </div>
        </AnimateIn>
      </div>
    </footer>
  );
}

Footer.displayName = "Footer";
