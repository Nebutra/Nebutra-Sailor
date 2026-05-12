import Image from "next/image";
import { getTranslations } from "next-intl/server";
import type { Locale } from "@/i18n/routing";

/**
 * Real integration partners / tech stack brands.
 *
 * Logos are served from `apps/landing-page/public/logos/` (downloaded
 * from svgl.app once at commit time). We do NOT pull from svgl's CDN at
 * request time — their filenames drift (clerk.svg / resend.svg were
 * renamed in 2026, breaking the marketing strip until this commit). The
 * tradeoff: re-download manually when a brand updates its mark.
 */
const BRANDS = [
  { name: "Vercel", light: "/logos/vercel-light.svg", dark: "/logos/vercel-dark.svg" },
  { name: "Stripe", light: "/logos/stripe.svg", dark: "/logos/stripe.svg" },
  { name: "Supabase", light: "/logos/supabase.svg", dark: "/logos/supabase.svg" },
  { name: "Clerk", light: "/logos/clerk-light.svg", dark: "/logos/clerk-dark.svg" },
  { name: "Resend", light: "/logos/resend-light.svg", dark: "/logos/resend-dark.svg" },
  { name: "Cloudflare", light: "/logos/cloudflare.svg", dark: "/logos/cloudflare.svg" },
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
                src={brand.light}
                alt={brand.name}
                width={0}
                height={28}
                className="h-7 w-auto opacity-60 grayscale transition-all duration-300 hover:opacity-100 hover:grayscale-0 dark:hidden"
                style={{ width: "auto" }}
                unoptimized
                draggable={false}
              />
              <Image
                src={brand.dark}
                alt={brand.name}
                width={0}
                height={28}
                className="hidden h-7 w-auto opacity-60 grayscale transition-all duration-300 hover:opacity-100 hover:grayscale-0 dark:block"
                style={{ width: "auto" }}
                unoptimized
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
