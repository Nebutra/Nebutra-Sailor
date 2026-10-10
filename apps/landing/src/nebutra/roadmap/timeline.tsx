import { Heading } from "@nebutra/ui/primitives";
import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { essayHref, prUrl } from "@/nebutra/data/roadmap";
import { RoadmapBeam } from "./beam";
import { Node } from "./marker";
import { type Entry, entryAnchor, layerName, layerNo, type Phase } from "./model";

type Loose = (key: string, values?: Record<string, string | number>) => string;

const monthLabel = (ym: string, lang: string) =>
  new Date(`${ym}-01T00:00:00Z`).toLocaleDateString(lang, {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });

/**
 * The roadmap as one vertical timeline, oldest first: every month that
 * landed, then Now, Next and Later. Each phase label parks at the top of the
 * viewport (CSS sticky, md and up) while its entries scroll past; the beam
 * on the track fills as the reader goes (beam.tsx). The status of each phase
 * is written beside its mark, never shown by colour alone.
 */
export async function Timeline({
  lang,
  zh,
  phases,
}: {
  lang: string;
  zh: boolean;
  phases: Phase[];
}) {
  const t = (await getTranslations({ locale: lang, namespace: "roadmapPage" })) as unknown as Loose;

  return (
    <div className="rm-timeline relative mt-16 max-w-content">
      <span
        aria-hidden
        className="pointer-events-none absolute top-1.5 bottom-0 left-[5.5px] w-px bg-border"
      />
      <RoadmapBeam />
      <ol className="relative flex flex-col gap-16 md:gap-24">
        {phases.map((phase) => {
          const headingId = `phase-${phase.key}`;
          const label =
            phase.kind === "month"
              ? monthLabel(phase.month, lang)
              : t(`horizons.${phase.horizon}.label`);
          return (
            <li
              key={phase.key}
              aria-labelledby={headingId}
              data-status={phase.status}
              className="rm-phase grid grid-cols-1 gap-6 pl-8 md:grid-cols-[12rem_minmax(0,1fr)] md:gap-12 md:pl-10"
            >
              <div className="relative self-start md:sticky md:top-24">
                <Node status={phase.status} className="absolute top-2 -left-8 md:-left-10" />
                <Heading level={3} id={headingId}>
                  {label}
                </Heading>
                <p className="mt-1.5 text-sm text-secondary-foreground">
                  {t(`status.${phase.status}`)}
                </p>
                {phase.kind === "horizon" ? (
                  <p className="mt-1 text-sm text-muted-foreground">
                    {t(`horizons.${phase.horizon}.is`)}
                  </p>
                ) : null}
              </div>
              <ul className="divide-y divide-border">
                {phase.entries.map((entry) => (
                  <Item key={entry.id} entry={entry} t={t} zh={zh} />
                ))}
              </ul>
            </li>
          );
        })}
      </ol>
      <Link
        href="/changelog"
        className="mt-16 ml-8 inline-flex text-sm text-secondary-foreground transition-colors duration-micro hover:text-foreground md:ml-10"
      >
        {t("landed.releaseNotes")}
      </Link>
    </div>
  );
}

function Item({ entry, t, zh }: { entry: Entry; t: Loose; zh: boolean }) {
  const title =
    entry.kind === "landed" ? t(`landed.items.${entry.id}`) : t(`bets.${entry.id}.title`);
  const name = layerName(entry.serves, zh);
  return (
    <li
      id={entryAnchor(entry)}
      data-serves={entry.serves}
      className="rm-item scroll-mt-24 py-5 transition-opacity duration-micro first:pt-0 md:first:pt-1.5"
    >
      {entry.kind === "bet" && entry.href ? (
        <Link
          href={essayHref(entry.href, zh)}
          className="text-base text-foreground underline-offset-4 hover:underline"
        >
          {title}
        </Link>
      ) : (
        <p className="text-base text-pretty text-foreground">{title}</p>
      )}
      {entry.kind === "bet" ? (
        <p className="mt-1.5 max-w-2xl text-sm text-pretty text-muted-foreground">
          {t(`bets.${entry.id}.what`)}
        </p>
      ) : null}
      <p className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 text-sm">
        <a
          href={`#${entry.serves}`}
          aria-label={t("serves", { n: layerNo(entry.serves), name })}
          className="rounded-full border border-border px-2.5 py-0.5 text-muted-foreground transition-colors duration-micro hover:text-foreground"
        >
          L{layerNo(entry.serves)} · {name}
        </a>
        {entry.kind === "landed"
          ? entry.prs.map((n) => (
              <a
                key={n}
                href={prUrl(n)}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={t("pr", { n: `#${n}` })}
                className="font-mono text-muted-foreground tabular-nums transition-colors duration-micro hover:text-foreground"
              >
                #{n}
              </a>
            ))
          : null}
      </p>
    </li>
  );
}
