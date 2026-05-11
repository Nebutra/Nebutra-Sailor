import Image from "next/image";
import { getTranslations } from "next-intl/server";
import type { Locale } from "@/i18n/routing";

const SVGL_BASE = "https://svgl.app/library";

/**
 * Real integration partners / tech stack brands.
 * Uses SVGL CDN — same source as LogoStrip, zero licensing risk.
 */
const BRANDS = [
  { name: "Vercel", light: "vercel.svg", dark: "vercel_dark.svg" },
  { name: "Stripe", light: "stripe.svg", dark: "stripe.svg" },
  { name: "Supabase", light: "supabase.svg", dark: "supabase.svg" },
  { name: "Clerk", light: "clerk.svg", dark: "clerk.svg" },
  { name: "Resend", light: "resend.svg", dark: "resend_dark.svg" },
  { name: "Cloudflare", light: "cloudflare.svg", dark: "cloudflare.svg" },
] as const;

const METRIC_KEYS = ["developers", "projects", "uptime"] as const;

/**
 * Social proof strip — real brand icons + headline metrics.
 *
 * Renders logos of real integration partners (Vercel, Stripe, etc.)
 * followed by three headline metrics. Server component — uses
 * getTranslations instead of useTranslations.
 */
export async function SocialProofBar({ locale }: { locale: Locale }) {
  const t = await getTranslations({ locale, namespace: "landing.socialProof" });

  return (
    <section
      className="relative w-full border-y border-[var(--neutral-6)] bg-[var(--neutral-1)] py-16 md:py-20"
      aria-labelledby="social-proof-title"
    >
      <div className="mx-auto max-w-[1400px] px-4 md:px-6">
        <h2
          id="social-proof-title"
          className="text-center text-sm font-semibold uppercase tracking-[0.2em] text-[var(--neutral-11)]"
        >
          {t("title")}
        </h2>

        <ul
          aria-label={t("logosLabel")}
          className="mt-10 grid grid-cols-2 items-center justify-items-center gap-x-10 gap-y-8 sm:grid-cols-3 lg:grid-cols-6"
        >
          {BRANDS.map((brand) => (
            <li key={brand.name} className="flex h-10 items-center">
              <Image
                src={`${SVGL_BASE}/${brand.light}`}
                alt={brand.name}
                width={0}
                height={28}
                className="h-7 w-auto opacity-60 grayscale transition-all duration-300 hover:opacity-100 hover:grayscale-0 dark:hidden"
                style={{ width: "auto" }}
                unoptimized={false}
                draggable={false}
              />
              <Image
                src={`${SVGL_BASE}/${brand.dark}`}
                alt={brand.name}
                width={0}
                height={28}
                className="hidden h-7 w-auto opacity-60 grayscale transition-all duration-300 hover:opacity-100 hover:grayscale-0 dark:block"
                style={{ width: "auto" }}
                unoptimized={false}
                draggable={false}
              />
            </li>
          ))}
        </ul>

        <div className="mt-12 grid grid-cols-1 gap-8 border-t border-[var(--neutral-6)] pt-12 sm:grid-cols-3">
          {METRIC_KEYS.map((key) => (
            <div key={key} className="flex flex-col items-center text-center">
              <span
                className="text-4xl font-black tracking-tight md:text-5xl"
                style={{
                  background: "var(--brand-gradient)",
                  WebkitBackgroundClip: "text",
                  WebkitTextFillColor: "transparent",
                  backgroundClip: "text",
                }}
              >
                {t(`metrics.${key}.value`)}
              </span>
              <span className="mt-2 text-sm font-medium text-[var(--neutral-11)]">
                {t(`metrics.${key}.label`)}
              </span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

SocialProofBar.displayName = "SocialProofBar";
