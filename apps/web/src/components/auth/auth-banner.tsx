import { AuthBrandPanel } from "@nebutra/auth/sign-in";
import { bootLogDensity, bootLogSpan, pickBootLogRotation } from "@nebutra/auth/sign-in/boot-log";
import { BootLogCard } from "@nebutra/auth/sign-in/boot-log-card";
import { BrandMark } from "@nebutra/brand";
import { brand } from "@nebutra/brand/metadata";
import { loadBootLogCatalog } from "@nebutra/i18n/boot-log";
import { getLocale, getTranslations } from "next-intl/server";

interface AuthBannerProps {
  className?: string;
}

/**
 * Sign-in left panel — the shared `AuthBrandPanel` with the archive story,
 * the same panel the auth center (apps/auth) renders.
 */
export async function AuthBanner({ className }: AuthBannerProps) {
  const [t, locale] = await Promise.all([getTranslations("auth.banner"), getLocale()]);
  // Only the handful of records this visit shows crosses to the client.
  const bootLogCatalog = await loadBootLogCatalog(locale);
  const bootLog = pickBootLogRotation(bootLogCatalog);
  // The rail runs to the current year, so the last slot on it is always empty.
  const railSpan = bootLogSpan(new Date().getFullYear());

  return (
    <AuthBrandPanel
      className={className}
      logo={
        <span role="img" aria-label={t("logoAlt")}>
          <BrandMark size={44} />
        </span>
      }
      slogan={t("slogan")}
      tagline={t("tagline")}
      story={
        <BootLogCard
          entries={bootLog}
          density={bootLogDensity(46, railSpan)}
          span={railSpan}
          label={bootLogCatalog.panelLabel}
        />
      }
      footer={`© ${new Date().getFullYear()} ${brand.name}`}
    />
  );
}
