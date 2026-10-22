import { Check, Cross } from "@nebutra/icons";
import {
  type Evidence,
  GRADUATION_CRITERIA,
  GRADUATION_LABELS,
  type GraduationAudit,
  MIN_CONSUMERS,
} from "@/lib/showcase-model";

/**
 * The graduation bar, shown with the evidence for one entry.
 *
 * Three states, not two: met, not met, and not checked. An effect nobody has
 * audited is not a failing effect, and a list of red crosses would say so.
 */
function Mark({ value }: { value: Evidence | "unmet" }) {
  if (value === true) {
    return (
      <span className="text-success-strong">
        <Check aria-hidden="true" size={14} />
        <span className="sr-only">Met</span>
      </span>
    );
  }
  if (value === false || value === "unmet") {
    return (
      <span className="text-destructive-strong">
        <Cross aria-hidden="true" size={14} />
        <span className="sr-only">Not met</span>
      </span>
    );
  }
  return (
    <span className="text-muted-foreground">
      <span aria-hidden="true">?</span>
      <span className="sr-only">Not checked</span>
    </span>
  );
}

export function GraduationChecklist({ audit }: { audit: GraduationAudit }) {
  return (
    <div className="flex flex-col gap-3">
      <ul className="flex flex-col divide-y divide-border rounded-[var(--radius-lg)] border border-border">
        {GRADUATION_CRITERIA.map((criterion) => {
          const { label, rule } = GRADUATION_LABELS[criterion];
          const value: Evidence | "unmet" =
            criterion === "consumers"
              ? audit.consumers >= MIN_CONSUMERS
                ? true
                : "unmet"
              : audit[criterion];
          return (
            <li className="flex items-start gap-3 px-4 py-3" key={criterion}>
              <span className="mt-0.5 flex size-4 shrink-0 items-center justify-center">
                <Mark value={value} />
              </span>
              <span className="flex flex-col gap-0.5">
                <span className="text-foreground text-sm">
                  {label}
                  {criterion === "consumers" ? (
                    <span className="ms-2 text-muted-foreground tabular-nums">
                      {audit.consumers} of {MIN_CONSUMERS}
                    </span>
                  ) : null}
                </span>
                <span className="text-muted-foreground text-xs">{rule}</span>
              </span>
            </li>
          );
        })}
      </ul>
      <p className="text-muted-foreground text-xs">Evidence: {audit.note}</p>
    </div>
  );
}

/** The bar itself, without any one entry's evidence. */
export function GraduationRules() {
  return (
    <ol className="flex list-decimal flex-col gap-2 ps-5 text-sm marker:text-muted-foreground">
      {GRADUATION_CRITERIA.map((criterion) => {
        const { label, rule } = GRADUATION_LABELS[criterion];
        return (
          <li key={criterion}>
            <span className="text-foreground">{label}.</span>{" "}
            <span className="text-muted-foreground">{rule}</span>
          </li>
        );
      })}
    </ol>
  );
}
