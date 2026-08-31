import { getMarketingHomeUrl } from "@nebutra/brand/metadata-helpers";
import { DEFAULT_ROUTE_LOCALE, toRouteLocale } from "@nebutra/i18n/locales";
import { ArrowLeft } from "@nebutra/icons";
import { cn } from "@nebutra/ui/utils";
import { AUTH_FORM_COLUMN_CLASS } from "@nebutra/ui/utils/auth-surfaces";
import { useLocale, useTranslations } from "next-intl";
import { LocaleSwitcher } from "@/components/navigation/locale-switcher";
import { AuthBanner } from "./auth-banner";

interface AuthSplitLayoutProps {
  children: React.ReactNode;
  className?: string;
}

/**
 * Agent OS split login shell. Form column width is SSOT via
 * AUTH_FORM_COLUMN_CLASS (@nebutra/ui/utils/auth-surfaces, RSC-safe) —
 * keep in lock-step with apps/auth. No nested card chrome on the form.
 */
export function AuthSplitLayout({ children, className }: AuthSplitLayoutProps) {
  const t = useTranslations("auth.signIn");
  const locale = useLocale();

  // Same helper as apps/auth. NEXT_PUBLIC_SITE_URL is this app's origin, so
  // using it here sent "Home" back to the dashboard (and then to login).
  const homeHref = getMarketingHomeUrl({
    locale: toRouteLocale(locale),
    defaultLocale: DEFAULT_ROUTE_LOCALE,
  });

  return (
    <div
      className={cn(
        "grid min-h-screen bg-background lg:grid-cols-[minmax(360px,36vw)_1fr]",
        className,
      )}
    >
      <AuthBanner />
      <main
        id="main-content"
        className="relative flex min-h-[100svh] flex-col items-center justify-center px-5 py-20 sm:px-8 lg:px-16"
      >
        <a
          href={homeHref}
          className="absolute left-5 top-6 z-20 inline-flex items-center gap-2 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[hsl(var(--primary))] sm:left-8 lg:left-12 lg:top-10"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden />
          {t("homeLink")}
        </a>
        <div className="absolute right-5 top-6 sm:right-8 lg:right-12 lg:top-10">
          <LocaleSwitcher />
        </div>
        <div
          aria-hidden
          className="pointer-events-none absolute inset-x-0 top-0 h-40 bg-[linear-gradient(180deg,color-mix(in_srgb,hsl(var(--muted))_80%,transparent),transparent)] lg:hidden"
        />
        <div className={AUTH_FORM_COLUMN_CLASS}>{children}</div>
      </main>
    </div>
  );
}
