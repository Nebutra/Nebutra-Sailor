import {
  ArrowUpRight,
  Sparkles as Leaf,
  type Icon as LucideIcon,
  RefreshClockwise as Recycle,
  Shield,
} from "@nebutra/icons";
import { ViewTransitionLink } from "@/components/navigation/view-transition-link";

/**
 * TEMPLATE — Reusable "values commitment" block.
 *
 * Currently not wired into any surface. Drop into the billing page footer,
 * the marketing landing /about page, or the onboarding flow when product
 * decides to publicly commit to one or more of these values.
 *
 * Honesty contract:
 *   - Do not surface a value commitment until it is real (contract signed,
 *     percentage allocated, partner integrated). The component is the
 *     vehicle; the truth is the underlying contract.
 *   - Each pillar should have an outbound link to the partner / charter so
 *     users can verify (Stripe Climate, Frontier, etc.).
 */

export interface ValuePillar {
  id: string;
  icon: LucideIcon;
  title: string;
  description: string;
  linkLabel?: string;
  href?: string;
  /** Quantified commitment (e.g. "0.5%", "100k tons"). Optional. */
  metric?: string;
}

/**
 * Suggested pillar set. Consumers can override by passing their own array.
 * These are templates — the partner integrations need to be real before
 * displaying them publicly.
 */
export const DEFAULT_VALUE_PILLARS: ValuePillar[] = [
  {
    id: "carbon",
    icon: Leaf,
    title: "Carbon offset on every dollar",
    description: "A portion of every subscription is routed to permanent carbon-removal partners.",
    metric: "0.5%",
    linkLabel: "Learn more",
    href: "https://stripe.com/climate",
  },
  {
    id: "data",
    icon: Shield,
    title: "Your data, your control",
    description: "We don't train on your prompts. Export and delete anytime, no questions asked.",
    linkLabel: "Read the policy",
    href: "/legal/privacy",
  },
  {
    id: "circular",
    icon: Recycle,
    title: "Recycled compute",
    description:
      "Idle inference capacity is matched to research workloads through partner programs.",
    linkLabel: "How it works",
    href: "/about/sustainability",
  },
];

interface Props {
  /** Override the default pillar set. */
  pillars?: ValuePillar[];
  /** Heading text. Defaults to a neutral statement; pass empty string to hide. */
  heading?: string;
  /** Short copy under the heading. */
  description?: string;
  /** Layout density. */
  density?: "compact" | "comfortable";
  className?: string;
}

export function ValuesStatement({
  pillars = DEFAULT_VALUE_PILLARS,
  heading = "What we commit to",
  description = "Choosing Sailor means these are non-negotiable.",
  density = "comfortable",
  className = "",
}: Props) {
  const padding = density === "compact" ? "p-4" : "p-6";
  const grid =
    density === "compact"
      ? "grid gap-3 sm:grid-cols-3"
      : "grid gap-5 sm:grid-cols-2 lg:grid-cols-3";

  return (
    <section
      className={`rounded-2xl border border-neutral-7 bg-neutral-1 dark:border-white/10 dark:bg-white/[0.02] ${padding} ${className}`}
      aria-label="Our values commitment"
    >
      {heading && (
        <div className="mb-4">
          <h2 className="text-sm font-semibold text-neutral-12 dark:text-white">{heading}</h2>
          {description && (
            <p className="mt-1 text-xs text-neutral-10 dark:text-white/50">{description}</p>
          )}
        </div>
      )}

      <div className={grid}>
        {pillars.map(({ id, icon: Icon, title, description: desc, metric, linkLabel, href }) => (
          <div
            key={id}
            className="flex h-full flex-col gap-2 rounded-xl border border-neutral-6 bg-neutral-2 p-4 dark:border-white/10 dark:bg-white/[0.03]"
          >
            <div className="flex items-center justify-between">
              <div
                className="flex h-8 w-8 items-center justify-center rounded-lg text-white"
                style={{ background: "var(--brand-gradient)" }}
              >
                <Icon className="h-4 w-4" />
              </div>
              {metric && (
                <span
                  className="text-sm font-semibold tabular-nums"
                  style={{
                    background: "var(--brand-gradient)",
                    WebkitBackgroundClip: "text",
                    WebkitTextFillColor: "transparent",
                    backgroundClip: "text",
                  }}
                >
                  {metric}
                </span>
              )}
            </div>
            <h3 className="text-sm font-semibold text-neutral-12 dark:text-white">{title}</h3>
            <p className="text-xs leading-relaxed text-neutral-10 dark:text-white/50">{desc}</p>
            {href && linkLabel && (
              <ViewTransitionLink
                href={href}
                className="mt-auto inline-flex items-center gap-0.5 pt-1 text-xs font-medium text-blue-11 transition-colors hover:text-blue-12 dark:text-blue-9 dark:hover:text-blue-8"
              >
                {linkLabel}
                <ArrowUpRight className="h-3 w-3" />
              </ViewTransitionLink>
            )}
          </div>
        ))}
      </div>
    </section>
  );
}
