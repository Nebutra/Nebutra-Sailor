import { brand } from "@nebutra/brand/metadata";
import { getTranslations } from "next-intl/server";
import { ThemedLogo } from "@/nebutra/shell/themed-logo";
import { SHOWCASE } from "./showcase";

/**
 * The company as a structure: one parent, three lines of business, drawn as a
 * tree rather than told in a paragraph. Sailor sits in the middle because the
 * other two stand on it; it is the one node that wears the signature edge.
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
      key: "products",
      name: t("products.name"),
      role: t("products.role"),
      body: t("products.body"),
      items: SHOWCASE.map((s) => s.name),
    },
    {
      key: "sailor",
      name: "Sailor",
      role: t("sailor.role"),
      body: t("sailor.body"),
      items: ["create-sailor", "Sailor Studio", "Open Platform"],
      core: true,
    },
    {
      key: "practice",
      name: t("practice.name"),
      role: t("practice.role"),
      body: t("practice.body"),
      items: [practice("rnd.title"), practice("global.title")],
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
            <div
              className={
                n.core
                  ? "inv-core flex h-full flex-col rounded-[var(--radius-lg)] border border-border bg-card p-6"
                  : "flex h-full flex-col rounded-[var(--radius-lg)] border border-border p-6"
              }
            >
              <p className="text-sm text-muted-foreground">{n.role}</p>
              <p className="mt-2 font-heading text-2xl text-foreground">{n.name}</p>
              <p className="mt-3 text-base text-muted-foreground text-pretty">{n.body}</p>
              {n.items.length ? (
                <ul className="mt-auto flex flex-wrap gap-2 pt-6">
                  {n.items.map((item) => (
                    <li
                      key={item}
                      className="rounded-full border border-border px-3 py-1 text-sm text-secondary-foreground"
                      translate="no"
                    >
                      {item}
                    </li>
                  ))}
                </ul>
              ) : null}
            </div>
          </li>
        ))}
      </ol>
    </div>
  );
}
