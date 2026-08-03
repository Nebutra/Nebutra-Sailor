import Image from "next/image";
import { getTranslations, setRequestLocale } from "next-intl/server";
import type { Locale } from "@/i18n/routing";
import { getLogoUrl, techStackLogos } from "@/lib/landing-content";

/**
 * LogoStrip - Centered static tech stack credibility strip
 */
export async function LogoStrip({ locale }: { locale: Locale }) {
  setRequestLocale(locale);
  const t = await getTranslations({ locale, namespace: "logoStrip" });

  const allLogos = techStackLogos.slice(0, 12).map((logo) => ({
    name: logo.name,
    url: getLogoUrl(logo, "dark"),
  }));
  const [first, ...rest] = allLogos;
  const mid = Math.floor(rest.length / 2);
  const logos = [...rest.slice(0, mid), first, ...rest.slice(mid)];

  return (
    <section className="relative z-10 w-full bg-transparent pb-8 pt-4 md:pb-12 md:pt-6">
      <div className="mx-auto flex w-full max-w-3xl flex-col items-center px-4">
        <p className="mb-6 w-full text-center text-[10px] font-medium tracking-[0.2em] text-zinc-500 uppercase md:text-[11px] dark:text-zinc-400">
          {t.rich("tagline", {
            dot: () => (
              <span className="mx-1.5 mb-0.5 inline-block align-middle text-[8px] text-foreground/80 dark:text-zinc-300">
                •
              </span>
            ),
          })}
        </p>
        <div className="flex flex-wrap items-center justify-center gap-x-8 gap-y-4 opacity-70 grayscale hover:grayscale-0 transition-[filter,opacity] duration-500 select-none">
          {logos.map((logo) => {
            const isSmall = logo.name === first.name;
            return (
              <Image
                key={logo.name}
                src={logo.url}
                alt={logo.name}
                width={isSmall ? 20 : 24}
                height={isSmall ? 20 : 24}
                className={`${isSmall ? "h-[18px]" : "h-[22px] md:h-6"} w-auto brightness-0 dark:brightness-200 dark:invert-0 transition-[filter,opacity,transform] duration-150 hover:opacity-100 hover:-translate-y-px motion-reduce:hover:translate-y-0`}
                style={{ width: "auto" }}
                unoptimized={false}
                draggable={false}
              />
            );
          })}
        </div>
      </div>
    </section>
  );
}

LogoStrip.displayName = "LogoStrip";
