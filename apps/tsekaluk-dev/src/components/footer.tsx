"use client";

import { brand } from "@nebutra/brand/metadata";
import { getBrandOrigin } from "@nebutra/brand/metadata-helpers";
import { ArrowRight, ArrowUpRight, Check, Rss } from "@nebutra/icons";
import { ScrollVelocityContainer, ScrollVelocityRow } from "@nebutra/ui/primitives";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { Feedback } from "@/components/ui/feedback";
import { LocalTime } from "@/components/ui/local-time";
import { Link } from "@/i18n/navigation";

function XIcon({ className }: { className?: string }) {
  return (
    <svg aria-hidden="true" className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
    </svg>
  );
}

function GitHubIcon({ className }: { className?: string }) {
  return (
    <svg aria-hidden="true" className={className} viewBox="0 0 24 24" fill="currentColor">
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z"
      />
    </svg>
  );
}

function LinkedInIcon({ className }: { className?: string }) {
  return (
    <svg aria-hidden="true" className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
    </svg>
  );
}

function WeChatIcon({ className }: { className?: string }) {
  return (
    <svg aria-hidden="true" className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M8.281 2.457c4.542 0 8.267 3.018 8.267 6.762 0 .408-.05.803-.133 1.181a9.588 9.588 0 00-5.485-1.71c-4.996 0-9.102 3.42-9.102 7.854 0 .376.036.745.105 1.107C.797 16.324 0 14.636 0 12.753c0-4.04 4.048-7.319 9.043-7.319h.034zM15.424 9.9c4.116 0 7.458 2.768 7.458 6.182s-3.342 6.181-7.458 6.181c-1.026 0-2.001-.19-2.894-.531l-3.328 1.637.893-2.964c-1.229-1.03-2.129-2.525-2.129-4.323C8.077 12.668 11.42 9.9 15.536 9.9z" />
    </svg>
  );
}

export function Footer() {
  const t = useTranslations("footer");
  const [wechatCopied, setWechatCopied] = useState(false);

  const navLinks = [
    { label: t("nav_work"), url: "/work" },
    { label: t("nav_thinking"), url: "/thinking" },
    { label: t("nav_now"), url: "/now" },
    { label: t("nav_about"), url: "/about" },
    { label: t("nav_links"), url: "/links" },
  ];

  return (
    <footer className="relative mt-24 bg-white dark:bg-black overflow-hidden">
      {/* 顶线 accent 1px */}
      <div className="absolute top-0 w-full h-px bg-[var(--color-accent)] opacity-40 dark:opacity-20 shadow-[0_0_15px_var(--color-accent)] dark:shadow-none" />

      <div className="mx-auto max-w-7xl px-6 pt-16 pb-24 md:pb-32 relative z-10">
        {/* Top Section */}
        <div className="flex justify-start mb-6">
          <Feedback label="Feedback" />
        </div>
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-12 mb-16">
          <div className="space-y-6">
            <h2 className="font-serif italic text-3xl md:text-5xl tracking-tight text-gray-900 dark:text-gray-100">
              {t("tagline")}
            </h2>
            <div className="flex flex-wrap items-center gap-x-2 gap-y-3 font-mono text-xs text-gray-600 dark:text-gray-400">
              <span className="relative flex h-2 w-2 mr-1">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[var(--color-accent)] opacity-75" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-[var(--color-accent-dark)]" />
              </span>
              <span>{t("status_available")}</span>
              <span className="hidden sm:inline">·</span>
              <span>{t("location")}</span>
              <span className="hidden sm:inline">·</span>
              <LocalTime />
            </div>
          </div>
          <div className="shrink-0 pb-2">
            <a
              href="mailto:contact@tsekaluk.dev"
              className="group inline-flex items-center gap-2 rounded-full border border-gray-200 dark:border-white/10 bg-white/50 dark:bg-white/5 backdrop-blur-sm px-6 py-3 text-sm font-medium text-gray-900 dark:text-white transition-colors hover:border-[var(--color-accent)] hover:bg-[var(--color-accent)]/10 dark:hover:bg-[var(--color-accent)]/20"
            >
              {t("email_cta")}{" "}
              <ArrowRight className="h-3.5 w-3.5 transition-transform duration-200 group-hover:translate-x-0.5" />
            </a>
          </div>
        </div>

        {/* Divider 1 */}
        <div className="h-px w-full bg-gray-200 dark:bg-white/5 mb-8" />

        {/* Navigation Links */}
        <nav className="flex flex-wrap items-center gap-8 md:gap-12 mb-8">
          {navLinks.map((link) => (
            <Link
              key={link.label}
              href={link.url}
              className="text-[10px] uppercase tracking-widest font-semibold text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 transition-colors"
            >
              {link.label}
            </Link>
          ))}
        </nav>

        {/* Divider 2 */}
        <div className="h-px w-full bg-gray-200 dark:bg-white/5 mb-8" />

        {/* Bottom Section */}
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-8">
          <div className="flex flex-col md:flex-row md:items-center gap-2 md:gap-6 text-xs text-gray-500 dark:text-gray-400 font-mono tracking-tight">
            <span>&copy; {new Date().getFullYear()} Tseka Luk</span>
            <span className="hidden md:inline text-gray-300 dark:text-gray-700">|</span>
            <span className="tracking-tight flex items-center gap-1.5">
              {t("built_with")}{" "}
              <a
                href={`${brand.social.github}/${brand.name}-Sailor`}
                target="_blank"
                rel="noopener noreferrer"
                className="underline underline-offset-4 hover:text-gray-700 dark:hover:text-gray-300 transition-colors"
                title="open-source portfolio kit"
              >
                {`${brand.name} Sailor`}
              </a>
            </span>
          </div>

          <div className="flex items-center gap-6">
            <div className="flex items-center gap-4 text-gray-500 dark:text-gray-400">
              <a
                href="/rss.xml"
                aria-label={t("rss_label")}
                className="hover:text-gray-900 dark:hover:text-gray-100 transition-colors"
              >
                <Rss className="h-4 w-4" />
              </a>
              <a
                href="https://github.com/TsekaLuk"
                target="_blank"
                rel="noopener noreferrer me"
                aria-label={t("github_label")}
                className="hover:text-gray-900 dark:hover:text-gray-100 transition-colors"
              >
                <GitHubIcon className="h-4 w-4" />
              </a>
              <a
                href="https://x.com/tseka_luk"
                target="_blank"
                rel="noopener noreferrer me"
                aria-label={t("x_label")}
                className="hover:text-gray-900 dark:hover:text-gray-100 transition-colors"
              >
                <XIcon className="h-4 w-4" />
              </a>
              <a
                href="https://linkedin.com/in/tsekaluk"
                target="_blank"
                rel="noopener noreferrer me"
                aria-label={t("linkedin_label")}
                className="hover:text-gray-900 dark:hover:text-gray-100 transition-colors"
              >
                <LinkedInIcon className="h-4 w-4" />
              </a>
              <button
                type="button"
                onClick={() => {
                  navigator.clipboard?.writeText("Tseka_Luk").then(() => {
                    setWechatCopied(true);
                    setTimeout(() => setWechatCopied(false), 2000);
                  });
                }}
                title={wechatCopied ? t("wechat_copied") : t("wechat_label")}
                aria-label={wechatCopied ? t("wechat_copied") : t("wechat_label")}
                className="transition-colors hover:text-[#07C160]"
              >
                {wechatCopied ? (
                  <Check className="h-4 w-4 text-[#07C160]" />
                ) : (
                  <WeChatIcon className="h-4 w-4" />
                )}
              </button>
            </div>

            <button
              type="button"
              onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
              className="text-xs text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 transition-colors group flex items-center gap-1 font-mono tracking-tight"
            >
              {t("back_to_top")}{" "}
              <ArrowUpRight className="h-3 w-3 opacity-0 group-hover:opacity-100 transition-opacity -ml-1 group-hover:ml-1" />
            </button>
          </div>
        </div>
      </div>

      <div className="absolute overflow-hidden bottom-0 pointer-events-none w-full select-none flex justify-center z-0 opacity-60 dark:opacity-100 translate-y-[5%]">
        <ScrollVelocityContainer className="text-[15vw] sm:text-[12vw] md:text-[8vw] font-serif italic uppercase leading-none tracking-tighter text-transparent [-webkit-text-stroke:1px_#e5e7eb] dark:[-webkit-text-stroke:1px_rgba(255,255,255,0.06)]">
          <ScrollVelocityRow baseVelocity={3}>
            {["TSEKALUK", "BUILDING", "WHAT", "DOESNT", "EXIST", "YET"].map((t) => (
              <span key={t} className="mx-8">
                {t}
              </span>
            ))}
          </ScrollVelocityRow>
        </ScrollVelocityContainer>
      </div>
    </footer>
  );
}
