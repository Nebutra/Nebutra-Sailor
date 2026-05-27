import { STATUS_BADGE_CONFIG, type Status } from "./status-badge-config";

export function StatusBadge({ status }: { status: Status }) {
  const config = STATUS_BADGE_CONFIG[status];
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium ${config.className}`}
    >
      {config.label}
    </span>
  );
}

export type { Status };
