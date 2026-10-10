import { brand } from "@nebutra/brand/metadata";
import { getTranslations } from "next-intl/server";
import { ThemedLogo } from "@/nebutra/shell/themed-logo";
import { SHOWCASE } from "./showcase";

/**
 * The company as a structure: one parent, two businesses (Sailor, the
 * consulting practice) and the products incubated on Sailor, drawn as a tree
 * rather than told in a paragraph. Sailor comes first because the rest stand on
 * it; it is the one node whose rule wears the signature. The incubated node is
 * set a step smaller: KCQ is a product, not a third business (owner, 2026-10-10).
 *
 * Responsive: Stack. Three columns hanging off one rule from md up; below md
 * the columns stack under a single vertical rule.
 */
export async function EcosystemMap({ lang }: { lang: string }) {
  const t = await getTranslations({ locale: lang, namespace: "sitePages.investors.built" });
  const practice = await getTranslations({
    locale: lang,
    namespace: "sitePages.investors.practice",
  });
  const nodes = [
    {
      key: "sailor",
      name: "Sailor",
      role: t("sailor.role"),
      body: t("sailor.body"),
      items: ["create-sailor", "Sailor Studio"],
      core: true,
    },
    {
      key: "practice",
      name: t("practice.name"),
      role: t("practice.role"),
      body: t("practice.body"),
      items: [practice("rnd.title"), practice("global.title")],
    },
    {
      key: "products",
      name: t("products.name"),
      role: t("products.role"),
      body: t("products.body"),
      items: SHOWCASE.filter((s) => s.id === "kcq").map((s) => s.name),
      incubated: true,
    },
  ];

  return (
    <div className="mt-16">
      <div className="flex justify-start md:justify-center" role="img" aria-label={brand.name}>
        <ThemedLogo size={120} />
      </div>
      <div aria-hidden className="mt-6 h-10 w-px bg-border md:mx-auto" />
      <ol className="relative grid grid-cols-1 gap-6 border-l border-border pl-6 md:grid-cols-3 md:border-l-0 md:pl-0">
        <span
          aria-hidden
          className="absolute top-0 right-[calc((100%-3rem)/6)] left-[calc((100%-3rem)/6)] hidden h-px bg-border md:block"
        />
        {nodes.map((n) => (
          <li key={n.key} className="relative flex flex-col md:pt-10">
            <span
              aria-hidden
              className="absolute top-0 left-1/2 hidden h-10 w-px bg-border md:block"
            />
            {/* No box around a node: a hairline on top, the core's in the signature
                gradient. The map is one figure, not three cards (restraint rule 9). */}
            <div className="flex h-full flex-col pt-6">
              <span
                aria-hidden
                className={
                  n.core
                    ? "inv-core-rule absolute inset-x-0 top-0 h-px md:top-10"
                    : "absolute inset-x-0 top-0 h-px bg-border md:top-10"
                }
              />
              <p className="text-sm text-muted-foreground">{n.role}</p>
              <p
                className={
                  n.incubated
                    ? "mt-2 font-heading text-xl text-secondary-foreground"
                    : "mt-2 font-heading text-2xl text-foreground"
                }
              >
                {n.name}
              </p>
              <p className="mt-3 text-base text-muted-foreground text-pretty">{n.body}</p>
              {n.items.length ? (
                <p className="mt-auto pt-6 text-sm text-secondary-foreground" translate="no">
                  {n.items.join(" · ")}
                </p>
              ) : null}
            </div>
          </li>
        ))}
      </ol>
    </div>
  );
}
