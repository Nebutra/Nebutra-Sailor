import { StatusDot } from "@nebutra/ui/primitives";

export function StatusDotDemo() {
  return (
    <div className="grid gap-3 rounded-[var(--radius-lg)] border bg-card p-5 text-card-foreground">
      <StatusDot state="READY" label titlePrefix="Production" />
      <StatusDot state="BUILDING" label titlePrefix="Preview deployment" />
      <StatusDot state="ERROR" label titlePrefix="Cron deployment" />
      <StatusDot state="CANCELED" label titlePrefix="Staging deployment" />
    </div>
  );
}
