import { AuthSplitShell } from "@nebutra/auth/sign-in";
import { getMarketingHomeUrl } from "@nebutra/brand/metadata-helpers";
import { DEFAULT_ROUTE_LOCALE, toRouteLocale } from "@nebutra/i18n/locales";
import { ArrowLeft } from "@nebutra/icons";
import { getLocale, getTranslations } from "next-intl/server";
import { AuthBanner } from "./auth-banner";
import { LocaleSwitcher } from "./locale-switcher";

/**
 * Same split shell as apps/web AuthSplitLayout (Agent OS login) —
 * including top-right locale switcher.
 *
 * Form column width is SSOT via AUTH_FORM_COLUMN_CLASS
 * (@nebutra/ui/utils/auth-surfaces — RSC-safe). No nested card chrome —
 * fields sit on the white pane. Do not reintroduce magic max-width or
 * border/rounded card wrappers here.
 */
export async function AuthSplitLayout({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  const [t, locale] = await Promise.all([getTranslations("auth.signIn"), getLocale()]);
  // Marketing home (`?home`), not this host and not the product launcher.
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
