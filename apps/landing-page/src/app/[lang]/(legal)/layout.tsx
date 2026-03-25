import { getTranslations, setRequestLocale } from "next-intl/server";
import type { ReactNode } from "react";
import { LocaleSwitcher } from "@/components/ui/locale-switcher";
import { ThemeSwitcher } from "@/components/ui/theme-switcher";
import { Link } from "@/i18n/navigation";
import type { Locale } from "@/i18n/routing";
import { LegalLogo } from "./LegalLogo";

interface LegalLayoutProps {
  children: ReactNode;
  params: Promise<{ lang: string }>;
}

export default async function LegalLayout({ children, params }: LegalLayoutProps) {
  const { lang } = await params;
  const locale = lang as Locale;
  setRequestLocale(locale);
  const t = await getTranslations({ locale, namespace: "legal" });

  return (
    <div className="min-h-screen bg-[var(--neutral-1)] dark:bg-black">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-[var(--neutral-7)] bg-[var(--neutral-1)]/80 backdrop-blur-md dark:bg-black/80">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-6">
          <Link href="/">
            <LegalLogo />
          </Link>
          <nav className="flex items-center gap-3 sm:gap-5">
            <Link
              href="/"
              className="hidden sm:inline text-[13px] text-[var(--neutral-10)] transition-colors hover:text-[var(--neutral-12)]"
            >
              {t("nav.home")}
            </Link>
            <Link
              href="/contact"
              className="hidden sm:inline text-[13px] text-[var(--neutral-10)] transition-colors hover:text-[var(--neutral-12)]"
            >
              {t("nav.contact")}
            </Link>
            <div className="flex items-center gap-2 sm:border-l sm:border-[var(--neutral-7)] sm:pl-4">
              <LocaleSwitcher />
              <ThemeSwitcher />
            </div>
          </nav>
        </div>
      </header>

      {/* Main Content */}
      <main className="mx-auto max-w-4xl px-4 py-12 sm:px-6 lg:px-8">{children}</main>

      {/* Footer */}
      <footer className="relative border-t border-[var(--neutral-7)]">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-x-0 top-0 h-px"
          style={{ background: "var(--brand-gradient)" }}
        />
        <div className="mx-auto max-w-7xl px-6 py-8">
          <div className="flex flex-col items-center justify-between gap-4 sm:flex-row">
            <nav className="flex flex-wrap items-center gap-x-6 gap-y-2 text-[13px]">
              <Link
                href="/privacy"
                className="text-[var(--neutral-10)] transition-colors hover:text-[var(--neutral-12)]"
              >
                {t("footer.privacy")}
              </Link>
              <Link
                href="/terms"
                className="text-[var(--neutral-10)] transition-colors hover:text-[var(--neutral-12)]"
              >
                {t("footer.terms")}
              </Link>
              <Link
                href="/cookies"
                className="text-[var(--neutral-10)] transition-colors hover:text-[var(--neutral-12)]"
              >
                {t("footer.cookies")}
              </Link>
              <Link
                href="/refund"
                className="text-[var(--neutral-10)] transition-colors hover:text-[var(--neutral-12)]"
              >
                {t("footer.refund")}
              </Link>
            </nav>
            <p className="text-[13px] text-[var(--neutral-10)]">{t("footer.copyright")}</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
