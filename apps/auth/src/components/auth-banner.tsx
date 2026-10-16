import { AuthBrandPanel } from "@nebutra/auth/sign-in";
import { bootLogDensity, bootLogSpan, pickBootLogRotation } from "@nebutra/auth/sign-in/boot-log";
import { BootLogCard } from "@nebutra/auth/sign-in/boot-log-card";
import { brand } from "@nebutra/brand/metadata";
import { publicAssetUrl } from "@nebutra/brand/metadata-helpers";
import { loadBootLogCatalog } from "@nebutra/i18n/boot-log";
import { getLocale, getTranslations } from "next-intl/server";

/**
 * Sign-in left panel — the shared `AuthBrandPanel` (same as apps/web): the
 * brand line and the archive story as its body.
 */
export async function AuthBanner({ className }: { className?: string }) {
  const t = await getTranslations("auth.banner");
  // Drawn per request — the sign-in route is force-dynamic, so every visit
  // gets a different entry rather than one frozen at build time.
  const locale = await getLocale();
  // Editorial copy comes from its own message catalog; only the handful of
  // records this visit will show crosses to the client.
  const bootLogCatalog = await loadBootLogCatalog(locale);
  const bootLog = pickBootLogRotation(bootLogCatalog);
  // The rail runs to the current year, so the last slot on it is always empty.
  const railSpan = bootLogSpan(new Date().getFullYear());

  return (
    <AuthBrandPanel
      className={className}
      logo={
        // Plain img: next/image SVG optimizer is unreliable on standalone ECS
        // biome-ignore lint/performance/noImgElement: SVG brand mark in public/brand
        <img
          src={publicAssetUrl("brand/logo/logo-color.svg")}
          alt={t("logoAlt")}
          width={72}
          height={72}
          className="h-11 w-auto"
        />
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
