"use client";

import { Warning } from "@nebutra/icons";

type Status = "stable" | "beta" | "deprecated" | "experimental";

const STATUS_CONFIG: Record<Status, { label: string; className: string }> = {
  stable: {
    label: "Stable",
    className: "bg-success/10 text-success-strong",
  },
  beta: {
    label: "Beta",
    className: "bg-info/10 text-info",
  },
  deprecated: {
    label: "Deprecated",
    className: "bg-destructive/10 text-destructive-strong",
  },
  experimental: {
    label: "Experimental",
    className: "bg-warning/10 text-warning-strong",
  },
};

export function StatusBadge({ status }: { status: Status }) {
  const config = STATUS_CONFIG[status];
  return (
    <span
      className={`px-2.5 py-0.5 text-xs font-medium inline-flex items-center rounded-full ${config.className}`}
    >
      {config.label}
    </span>
  );
}

export function DeprecatedBanner() {
  return (
    <div
      role="alert"
      className="mb-6 gap-3 border-warning/30 bg-warning/10 px-4 py-3 text-sm text-warning-strong flex items-start rounded-lg border"
    >
      <Warning className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
      <div>
        <p className="font-semibold">Deprecated</p>
        <p className="mt-0.5 text-warning-strong">
          This component is deprecated and may be removed in a future release. Please migrate to the
          recommended alternative.
        </p>
      </div>
    </div>
  );
}

export type { Status };
