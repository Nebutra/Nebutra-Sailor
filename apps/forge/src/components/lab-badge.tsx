/**
 * Honest product label for tools with sotaStatus: lab.
 * Not a marketing SOTA badge — signals incomplete data / dictionary quality.
 */
export function LabBadge({ className }: { className?: string }) {
  return (
    <span
      className={[
        "inline-flex items-center rounded-full border border-[color-mix(in_srgb,var(--status-warning)_40%,transparent)] bg-[color-mix(in_srgb,var(--status-warning)_12%,transparent)] px-2 py-0.5 text-[11px] font-medium tracking-wide text-[color:var(--status-warning)]",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
      title="实验能力：数据/词典有限，不承诺完整生产精度"
    >
      实验
    </span>
  );
}
