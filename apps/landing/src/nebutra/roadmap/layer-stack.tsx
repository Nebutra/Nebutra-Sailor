import { ArrowDown } from "@nebutra/icons";
import { getTranslations } from "next-intl/server";
import { LAYERS } from "@/nebutra/data/roadmap";
import { Dot } from "./marker";
import { entryAnchor, layerNo, type Phase } from "./model";

type Loose = (key: string, values?: Record<string, string | number>) => string;

/**
 * L1–L8 as one stacked figure rather than eight essay rows: the layer, the
 * founder's line, and a mark for every entry on the timeline that answers to
 * it. L9 closes the stack and hands the reader to the timeline below.
 *
 * Pointing at a layer (hover or keyboard focus, desktop) dims the timeline
 * entries that serve other layers — pure CSS (`:has()` in site.css), no
 * script. On touch and narrow screens the figure is static.
 */
export async function LayerStack({
  lang,
  zh,
  phases,
}: {
  lang: string;
  zh: boolean;
  phases: Phase[];
}) {
  const t = (await getTranslations({ locale: lang, namespace: "roadmapPage" })) as unknown as Loose;
  const entries = phases.flatMap((p) => p.entries);

  return (
    <figure className="mt-12 max-w-content">
      <figcaption className="sr-only">{t("stack.label")}</figcaption>
      <ol className="divide-y divide-border rounded-xl border border-border">
        {LAYERS.map((layer) => {
          const serving = entries.filter((e) => e.serves === layer.id);
          const [first, second] = zh
            ? [layer.name.zh, layer.name.en]
            : [layer.name.en, layer.name.zh];
          return (
            <li
              key={layer.id}
              id={layer.id}
              data-layer={layer.id}
              className="rm-layer grid scroll-mt-24 grid-cols-[2.5rem_minmax(0,1fr)] gap-x-3 gap-y-2 px-5 py-5 transition-colors duration-micro md:grid-cols-[3rem_8.5rem_minmax(0,1fr)_7rem] md:gap-x-6 md:px-6"
            >
              <span className="text-sm text-muted-foreground tabular-nums">
                L{layerNo(layer.id)}
              </span>
              <p className="flex items-baseline gap-2 md:flex-col md:gap-0.5">
                <span className="text-base text-foreground">{first}</span>
                <span className="text-sm text-muted-foreground">{second}</span>
              </p>
              <div className="col-start-2 max-w-2xl md:col-start-auto">
                <p className="text-base text-pretty text-foreground">
                  {t(`layers.${layer.id}.line`)}
                </p>
                {layer.also ? (
                  <p className="mt-1.5 text-sm text-pretty text-muted-foreground">
                    {t(`layers.${layer.id}.also`)}
                  </p>
                ) : null}
              </div>
              {serving[0] ? (
                <a
                  href={`#${entryAnchor(serving[0])}`}
                  className="col-start-2 flex items-center gap-1.5 self-start py-1.5 md:col-start-auto md:justify-end"
                >
                  {serving.map((e) => (
                    <Dot key={e.id} status={e.status} />
                  ))}
                  <span className="sr-only">{t("stack.count", { count: serving.length })}</span>
                </a>
              ) : null}
            </li>
          );
        })}
        <li
          id="l9"
          className="grid grid-cols-[2.5rem_minmax(0,1fr)] gap-x-3 gap-y-2 px-5 py-5 md:grid-cols-[3rem_8.5rem_minmax(0,1fr)_7rem] md:gap-x-6 md:px-6"
        >
          <span className="text-sm text-foreground tabular-nums">L9</span>
          <p className="flex items-baseline gap-2 md:flex-col md:gap-0.5">
            <span className="text-base text-foreground">{t("stack.l9")}</span>
            <span className="text-sm text-muted-foreground">{t("stack.l9Alt")}</span>
          </p>
          <a
            href="#timeline"
            className="col-start-2 inline-flex items-center gap-2 self-start text-base text-secondary-foreground transition-colors duration-micro hover:text-foreground md:col-span-2 md:col-start-auto"
          >
            {t("stack.l9Line")}
            <ArrowDown size={14} />
          </a>
        </li>
      </ol>
    </figure>
  );
}
