import { useTranslations } from "next-intl";

const LOGO_KEYS = ["lumen", "northwind", "helix", "ravensteel", "atlas", "boreal"] as const;
const METRIC_KEYS = ["developers", "projects", "uptime"] as const;

/**
 * Social proof strip for the marketing landing page.
 *
 * Renders a "trusted by" logo row (text-only placeholders so integrators can
 * see exactly which slots to fill with real customer logos) followed by three
 * headline metrics. Uses semantic neutral tokens so it works on any background.
 */
export function SocialProofBar() {
  const t = useTranslations("landing.socialProof");

  return (
    <section
      className="relative w-full border-y border-[var(--neutral-6)] bg-[var(--neutral-1)] py-16 md:py-20"
      aria-labelledby="landing-social-proof-title"
    >
      <div className="mx-auto max-w-[1400px] px-4 md:px-6">
        <h2
          id="landing-social-proof-title"
          className="text-center text-sm font-semibold uppercase tracking-[0.2em] text-[var(--neutral-11)]"
        >
          {t("title")}
        </h2>

        <ul
          aria-label={t("logosLabel")}
          className="mt-8 grid grid-cols-2 items-center justify-items-center gap-x-8 gap-y-6 sm:grid-cols-3 lg:grid-cols-6"
        >
          {LOGO_KEYS.map((key) => (
            <li
              key={key}
              className="flex h-10 items-center text-sm font-bold uppercase tracking-wider text-[var(--neutral-9)] grayscale transition-colors hover:text-[var(--neutral-12)]"
            >
              {t(`logos.${key}`)}
            </li>
          ))}
        </ul>

        <p className="sr-only">{t("logosLabel")}</p>

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

SocialProofBar.displayName = "LandingSocialProofBar";
