import { useTranslations } from "next-intl";
import { COMPARISON_GROUPS, type ComparisonCell, PLAN_IDS } from "@/lib/landing/pricing-features";

/**
 * next-intl types `t` with a deep template-literal key union. Every key this
 * table needs is computed (`feature.${groupId}.${rowId}`, `value.${token}`),
 * which pushes that union past TS2590 "type instantiation is excessively deep".
 *
 * The ids and tokens are the SSOT in `pricing-features.ts`, and a test asserts
 * every referenced token resolves in every locale — so the safety here comes
 * from that test, not from the key union. Narrow the escape to this ONE
 * documented boundary instead of scattering per-call-site escape hatches.
 */
type DynamicTranslate = (key: string) => string;

/**
 * Pricing comparison table for the marketing landing page.
 *
 * Renders an accessible HTML `<table>` with a sticky header row and per-group
 * section headers. Cell shape:
 *   - boolean true  → check glyph
 *   - boolean false → em-dash
 *   - string        → i18n token resolved against `landing.comparison.value.*`
 */
export function PricingComparisonTable() {
  const t = useTranslations("landing.comparison") as unknown as DynamicTranslate;

  return (
    <section
      className="relative w-full bg-background py-24 md:py-32"
      aria-labelledby="landing-comparison-title"
    >
      <div className="mx-auto max-w-[1400px] px-4 md:px-6">
        <div className="mx-auto max-w-3xl text-center">
          <p className="mb-4 text-sm font-bold uppercase tracking-[0.2em] text-[hsl(var(--primary))]">
            {t("badge")}
          </p>
          <h2
            id="landing-comparison-title"
            className="text-balance text-3xl md:text-4xl lg:text-5xl font-semibold text-foreground"
            style={{
              letterSpacing: "var(--tracking-heading)",
              lineHeight: "var(--leading-heading)",
            }}
          >
            {t("title")}
          </h2>
          <p className="mt-4 text-base text-muted-foreground">{t("subtitle")}</p>
        </div>

        <div className="mt-16 overflow-x-auto rounded-[var(--radius-2xl)] border border-border bg-background">
          <table
            aria-label={t("ariaTable")}
            className="w-full min-w-[640px] border-collapse text-left text-sm"
          >
            <thead className="sticky top-0 z-10 bg-muted">
              <tr>
                <th
                  scope="col"
                  className="w-1/3 px-6 py-4 text-xs font-bold uppercase tracking-wider text-muted-foreground"
                >
                  &nbsp;
                </th>
                {PLAN_IDS.map((plan) => (
                  <th
                    key={plan}
                    scope="col"
                    className="px-6 py-4 text-center text-sm font-bold text-foreground"
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
  t: DynamicTranslate;
}

function GroupBlock({ group, plans, t }: GroupBlockProps) {
  return (
    <>
      <tr className="bg-muted/60">
        <th
          scope="colgroup"
          colSpan={plans.length + 1}
          className="px-6 py-3 text-left text-xs font-bold uppercase tracking-wider text-[hsl(var(--primary))]"
        >
          {t(`feature.${group.id}.label`)}
        </th>
      </tr>
      {group.rows.map((row) => (
        <tr key={row.id} className="border-t border-border hover:bg-muted/40">
          <th scope="row" className="px-6 py-4 text-left text-sm font-medium text-foreground">
            {t(`feature.${group.id}.${row.id}`)}
          </th>
          {plans.map((plan) => (
            <td key={plan} className="px-6 py-4 text-center text-sm text-muted-foreground">
              <CellValue value={row.values[plan]} t={t} />
            </td>
          ))}
        </tr>
      ))}
    </>
  );
}

function CellValue({ value, t }: { value: ComparisonCell; t: DynamicTranslate }) {
  if (value === true) {
    return (
      <span
        data-cell="check"
        role="img"
        aria-label={t("value.included")}
        className="inline-flex h-6 w-6 items-center justify-center rounded-full font-semibold text-white"
        style={{ background: "hsl(var(--primary))" }}
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
        aria-label={t("value.notIncluded")}
        className="text-muted-foreground"
      >
        —
      </span>
    );
  }
  return (
    <span data-cell="text" className="font-medium text-foreground">
      {t(`value.${value}`)}
    </span>
  );
}
