import { DEMAND_ROOTS, type ForgeToolSummary } from "@nebutra/forge-runtime";
import Link from "next/link";
import { getTranslations } from "next-intl/server";

/**
 * Demand-root chip rail for home — links to /r/{root} hubs (SEO + IA).
 */
export async function RootNav({ tools }: { tools: readonly ForgeToolSummary[] }) {
  const t = await getTranslations("roots");
  const counts = new Map<string, number>();
  for (const tool of tools) {
    for (const root of tool.roots ?? []) {
      counts.set(root, (counts.get(root) ?? 0) + 1);
    }
  }
  const roots = DEMAND_ROOTS.filter((r) => (counts.get(r) ?? 0) > 0);

  if (roots.length === 0) return null;

  return (
    <nav aria-label={t("hubLabel")} className="space-y-3">
      <div className="flex items-end justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold tracking-tight text-neutral-12">{t("hubLabel")}</h2>
          <p className="mt-0.5 text-xs text-neutral-10">{t("dualSurface")}</p>
        </div>
      </div>
      <ul className="flex flex-wrap gap-2">
        {roots.map((root) => {
          const count = counts.get(root) ?? 0;
          return (
            <li key={root}>
              <Link
                href={`/r/${root}`}
                className="inline-flex h-9 items-center gap-1.5 rounded-full border border-neutral-6 bg-neutral-1 px-3.5 text-sm text-neutral-11 transition-colors hover:border-neutral-8 hover:bg-neutral-2 hover:text-neutral-12"
              >
                <span className="font-medium capitalize">{root}</span>
                <span className="font-mono text-[11px] tabular-nums text-neutral-10">{count}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
