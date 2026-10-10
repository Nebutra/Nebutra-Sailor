import { cn } from "@nebutra/ui/utils";
import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import type { DecisionLayer } from "@/nebutra/data/offerings";

/**
 * The layers an offering answers to, as a quiet line under it — "L1 Purpose ·
 * L3 Principles". Each one links to that layer on /about, where the nine
 * layers are written out as the way Nebutra decides.
 */
export async function LayerTags({
  lang,
  serves,
  className,
}: {
  lang: string;
  serves: readonly DecisionLayer[];
  className?: string;
}) {
  const t = await getTranslations({ locale: lang, namespace: "sitePages.about.layers" });
  return (
    <p className={cn("text-sm text-muted-foreground", className)}>
      <span>{t("answersTo")}</span>{" "}
      {serves.map((id, i) => (
        <span key={id}>
          {i > 0 ? <span aria-hidden> · </span> : null}
          <Link
            href={`/about#${id}`}
            className="text-secondary-foreground underline-offset-4 transition-colors duration-micro hover:text-foreground hover:underline"
          >
            {id.toUpperCase()} {t(`${id}.name`)}
          </Link>
        </span>
      ))}
    </p>
  );
}
