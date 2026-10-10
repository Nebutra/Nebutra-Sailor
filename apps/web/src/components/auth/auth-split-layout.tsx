import { AuthSplitShell } from "@nebutra/auth/sign-in";
import { getMarketingHomeUrl } from "@nebutra/brand/metadata-helpers";
import { DEFAULT_ROUTE_LOCALE, toRouteLocale } from "@nebutra/i18n/locales";
import { ArrowLeft } from "@nebutra/icons";
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
    <AuthSplitShell
      banner={<AuthBanner />}
      homeHref={homeHref}
      homeLabel={t("homeLink")}
      homeIcon={<ArrowLeft className="size-4" aria-hidden />}
      localeSwitcher={<LocaleSwitcher />}
      className={className}
    >
      {children}
    </AuthSplitShell>
  );
}
