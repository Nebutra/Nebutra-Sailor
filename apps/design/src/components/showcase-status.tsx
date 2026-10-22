import { Badge } from "@nebutra/ui/primitives";
import { GRADUATION_LABELS, type ShowcaseStatus, type ShowcaseTier } from "@/lib/showcase-model";

/**
 * The badge is the showcase's one promise, so it only ever says what the data
 * says: `stable` is a catalog status (something outside the library imports it),
 * `experimental` is the catalog's other status, and `lab` is the showcase's own
 * for anything expressive that has not met the graduation bar.
 */
const VARIANT = {
  stable: "green-subtle",
  experimental: "amber-subtle",
  lab: "purple-subtle",
} as const satisfies Record<ShowcaseStatus, string>;

export function StatusBadge({ status }: { status: ShowcaseStatus }) {
  return (
    <Badge size="sm" variant={VARIANT[status]}>
      {status}
    </Badge>
  );
}

export const TIER_TITLE: Record<ShowcaseTier, string> = {
  core: "Core",
  patterns: "Patterns",
  blocks: "Blocks",
  expressive: "Expressive",
  lab: "Lab",
};

/** One line for a card: what a Lab entry still has to do to graduate. */
export function GraduationSummary({ gaps }: { gaps: readonly (keyof typeof GRADUATION_LABELS)[] }) {
  if (!gaps.length) return null;
  return (
    <p className="text-muted-foreground text-xs">
      <span className="text-foreground">To graduate:</span>{" "}
      {gaps.map((gap) => GRADUATION_LABELS[gap].label.toLowerCase()).join(", ")}
    </p>
  );
}
