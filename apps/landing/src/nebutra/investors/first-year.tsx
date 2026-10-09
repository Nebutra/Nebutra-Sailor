import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";

const DAYS = [1, 30, 90, 180, 270, 365] as const;

/**
 * The first year of a vibe-coded company, from the founder's essay "Why we
 * are building Nebutra" — the one picture of the problem the page needs.
 *
 * The rule fills with scroll (CSS view timeline, see site.css `.inv-track`);
 * where that is unsupported or motion is reduced, it is simply drawn full.
 *
 * Responsive: Replace. A horizontal rule with six stops from md up; a
 * vertical list with a left rule below it.
 */
export async function FirstYear({ lang }: { lang: string }) {
  const t = await getTranslations({ locale: lang, namespace: "sitePages.investors.why.timeline" });
  return (
    <figure className="inv-track mt-16">
      <figcaption className="text-sm text-muted-foreground">{t("label")}</figcaption>
      <ol className="relative mt-8 grid grid-cols-1 gap-8 border-l border-border pl-6 md:grid-cols-6 md:gap-6 md:border-l-0 md:border-t md:pl-0 md:pt-8">
        <span
          aria-hidden
          className="inv-track-fill inv-track-fill-y absolute top-0 bottom-0 -left-px w-px md:hidden"
        />
        <span
          aria-hidden
          className="inv-track-fill inv-track-fill-x absolute -top-px right-0 left-0 hidden h-px md:block"
        />
        {DAYS.map((n, i) => {
          const last = i === DAYS.length - 1;
          return (
            <li key={n} className="inv-stop relative">
              <span
                aria-hidden
                className={
                  last
                    ? "inv-stop-dot absolute -left-[1.6875rem] top-1.5 size-2 rounded-full md:-top-[2.3125rem] md:left-0"
                    : "absolute -left-[1.6875rem] top-1.5 size-2 rounded-full bg-muted-foreground md:-top-[2.3125rem] md:left-0"
                }
              />
              <p className="text-sm tabular-nums text-muted-foreground">{t("day", { n })}</p>
              <p
                className={
                  last
                    ? "mt-2 text-base text-foreground text-pretty"
                    : "mt-2 text-base text-secondary-foreground text-pretty"
                }
              >
                {t(`d${n}`)}
              </p>
            </li>
          );
        })}
      </ol>
      <p className="mt-10 text-sm text-muted-foreground">
        {t("source")}{" "}
        <Link
          href="/blog/why-we-build-nebutra"
          className="text-secondary-foreground underline-offset-4 hover:text-foreground hover:underline"
        >
          {t("essay")}
        </Link>
      </p>
    </figure>
  );
}
