import { useTranslations } from "next-intl";
import { COMPARISON_GROUPS, type ComparisonCell, PLAN_IDS } from "@/lib/landing/pricing-features";

/**
 * Pricing comparison table for the marketing landing page.
 *
 * Renders an accessible HTML `<table>` with a sticky header row and per-group
 * section headers. Cell shape:
 *   - boolean true  → check glyph
 *   - boolean false → em-dash
 *   - string       → rendered verbatim
 */
export function PricingComparisonTable() {
  const t = useTranslations("landing.comparison");

  return (
    <section
      className="relative w-full bg-[var(--neutral-1)] py-24 md:py-32"
      aria-labelledby="landing-comparison-title"
    >
      <div className="mx-auto max-w-[1400px] px-4 md:px-6">
        <div className="mx-auto max-w-3xl text-center">
          <p className="mb-4 text-sm font-bold uppercase tracking-[0.2em] text-[var(--brand-primary)]">
            {t("badge")}
          </p>
          <h2
            id="landing-comparison-title"
            className="text-balance text-3xl md:text-4xl lg:text-5xl font-semibold text-[var(--neutral-12)]"
            style={{
              letterSpacing: "var(--tracking-heading)",
              lineHeight: "var(--leading-heading)",
            }}
          >
            {t("title")}
          </h2>
          <p className="mt-4 text-base text-[var(--neutral-11)]">{t("subtitle")}</p>
        </div>

        <div className="mt-16 overflow-x-auto rounded-2xl border border-[var(--neutral-6)] bg-[var(--neutral-1)]">
          <table
            aria-label={t("ariaTable")}
            className="w-full min-w-[640px] border-collapse text-left text-sm"
          >
            <thead className="sticky top-0 z-10 bg-[var(--neutral-2)]">
              <tr>
                <th
                  scope="col"
                  className="w-1/3 px-6 py-4 text-xs font-bold uppercase tracking-wider text-[var(--neutral-11)]"
                >
                  &nbsp;
                </th>
                {PLAN_IDS.map((plan) => (
                  <th
                    key={plan}
                    scope="col"
                    className="px-6 py-4 text-center text-sm font-bold text-[var(--neutral-12)]"
                  >
                    {t(`plan.${plan}`)}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {COMPARISON_GROUPS.map((group) => (
                <GroupBlock key={group.id} group={group} t={t} plans={PLAN_IDS} />
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}

PricingComparisonTable.displayName = "LandingPricingComparisonTable";

interface GroupBlockProps {
  group: (typeof COMPARISON_GROUPS)[number];
  plans: typeof PLAN_IDS;
  t: ReturnType<typeof useTranslations>;
}

function GroupBlock({ group, plans, t }: GroupBlockProps) {
  return (
    <>
      <tr className="bg-[var(--neutral-2)]/60">
        <th
          scope="colgroup"
          colSpan={plans.length + 1}
          className="px-6 py-3 text-left text-xs font-bold uppercase tracking-wider text-[var(--brand-primary)]"
        >
          {t(`feature.${group.id}.label`)}
        </th>
      </tr>
      {group.rows.map((row) => (
        <tr
          key={row.id}
          className="border-t border-[var(--neutral-6)] hover:bg-[var(--neutral-2)]/40"
        >
          <th
            scope="row"
            className="px-6 py-4 text-left text-sm font-medium text-[var(--neutral-12)]"
          >
            {t(`feature.${group.id}.${row.id}`)}
          </th>
          {plans.map((plan) => (
            <td key={plan} className="px-6 py-4 text-center text-sm text-[var(--neutral-11)]">
              <CellValue value={row.values[plan]} />
            </td>
          ))}
        </tr>
      ))}
    </>
  );
}

function CellValue({ value }: { value: ComparisonCell }) {
  if (value === true) {
    return (
      <span
        data-cell="check"
        role="img"
        aria-label="Included"
        className="inline-flex h-6 w-6 items-center justify-center rounded-full font-semibold text-white"
        style={{ background: "var(--brand-gradient)" }}
      >
        ✓
      </span>
    );
  }
  if (value === false) {
    return (
      <span
        data-cell="dash"
        role="img"
        aria-label="Not included"
        className="text-[var(--neutral-9)]"
      >
        —
      </span>
    );
  }
  return (
    <span data-cell="text" className="font-medium text-[var(--neutral-12)]">
      {value}
    </span>
  );
}
