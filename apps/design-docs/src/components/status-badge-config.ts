export type Status = "stable" | "beta" | "deprecated" | "experimental";
export type Maturity = "experimental" | "beta" | "stable" | "canonical";

export const STATUS_BADGE_CONFIG: Record<Status, { label: string; className: string }> = {
  stable: {
    label: "Stable",
    className: "border-success/30 bg-success/10 text-success",
  },
  beta: {
    label: "Beta",
    className: "border-primary/30 bg-primary/10 text-primary",
  },
  deprecated: {
    label: "Deprecated",
    className: "border-destructive/30 bg-destructive/10 text-destructive",
  },
  experimental: {
    label: "Experimental",
    className: "border-warning/30 bg-warning/10 text-warning",
  },
};

export const MATURITY_BADGE_CONFIG: Record<Maturity, { label: string; className: string }> = {
  canonical: {
    label: "Canonical",
    className: "border-primary/35 bg-primary/10 text-primary",
  },
  stable: STATUS_BADGE_CONFIG.stable,
  beta: STATUS_BADGE_CONFIG.beta,
  experimental: STATUS_BADGE_CONFIG.experimental,
};
