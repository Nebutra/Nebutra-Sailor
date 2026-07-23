const TIER_CONFIG = {
  V0: { label: "v0", className: "bg-muted text-muted-foreground" },
  V1: { label: "v1 ⚡", className: "bg-[var(--blue-3)] text-[hsl(var(--primary))]" },
  V2: { label: "v2 🚀", className: "bg-[var(--blue-3)] text-[hsl(var(--primary))]" },
  V_INFINITY: {
    label: "v∞",
    className:
      "bg-gradient-to-r from-[var(--blue-3)] to-[var(--cyan-3)] text-[hsl(var(--primary))]",
  },
} as const;

type Tier = keyof typeof TIER_CONFIG;

export function TierBadge({ tier }: { tier: Tier }) {
  const { label, className } = TIER_CONFIG[tier];
  return (
    <span
      className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold ${className}`}
    >
      {label}
    </span>
  );
}
