import { MATURITY_BADGE_CONFIG, type Maturity } from "./status-badge-config";

export function MaturityBadge({ maturity }: { maturity: Maturity }) {
  const config = MATURITY_BADGE_CONFIG[maturity];
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium ${config.className}`}
    >
      {config.label}
    </span>
  );
}

export type { Maturity };
