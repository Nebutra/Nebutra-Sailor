"use client";

type Status = "stable" | "beta" | "deprecated" | "experimental";

const STATUS_CONFIG: Record<Status, { label: string; className: string }> = {
  stable: {
    label: "Stable",
    className: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
  },
  beta: {
    label: "Beta",
    className: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400",
  },
  deprecated: {
    label: "Deprecated",
    className: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
  },
  experimental: {
    label: "Experimental",
    className: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400",
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
      className="mb-6 gap-3 border-yellow-300 bg-yellow-50 px-4 py-3 text-sm text-yellow-800 dark:border-yellow-700/50 dark:bg-yellow-900/20 dark:text-yellow-300 flex items-start rounded-lg border"
    >
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 20 20"
        fill="currentColor"
        className="mt-0.5 h-4 w-4 shrink-0"
        aria-hidden="true"
      >
        <path
          fillRule="evenodd"
          d="M8.485 2.495c.673-1.167 2.357-1.167 3.03 0l6.28 10.875c.673 1.167-.17 2.625-1.516 2.625H3.72c-1.347 0-2.189-1.458-1.515-2.625L8.485 2.495zM10 5a.75.75 0 01.75.75v3.5a.75.75 0 01-1.5 0v-3.5A.75.75 0 0110 5zm0 9a1 1 0 100-2 1 1 0 000 2z"
          clipRule="evenodd"
        />
      </svg>
      <div>
        <p className="font-semibold">Deprecated</p>
        <p className="mt-0.5 text-yellow-700 dark:text-yellow-400">
          This component is deprecated and may be removed in a future release. Please migrate to the
          recommended alternative.
        </p>
      </div>
    </div>
  );
}

export type { Status };
