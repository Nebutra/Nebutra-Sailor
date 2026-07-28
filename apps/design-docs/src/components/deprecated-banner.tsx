import { Warning } from "@nebutra/icons";

export function DeprecatedBanner() {
  return (
    <div
      role="alert"
      className="mb-6 flex items-start gap-3 rounded-[var(--radius-md)] border border-warning/30 bg-warning/10 px-4 py-3 text-sm text-warning"
    >
      <Warning className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
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
