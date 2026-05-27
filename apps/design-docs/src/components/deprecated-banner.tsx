export function DeprecatedBanner() {
  return (
    <div
      role="alert"
      className="mb-6 flex items-start gap-3 rounded-[var(--radius-md)] border border-warning/30 bg-warning/10 px-4 py-3 text-sm text-warning"
    >
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 20 20"
        fill="currentColor"
        className="mt-0.5 size-4 shrink-0"
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
        <p className="mt-0.5 text-muted-foreground">
          This component is deprecated and may be removed in a future release. Please migrate to the
          recommended alternative.
        </p>
      </div>
    </div>
  );
}
