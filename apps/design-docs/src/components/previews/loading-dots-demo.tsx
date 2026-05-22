import { LoadingDots } from "@nebutra/ui/primitives";

export function LoadingDotsDemo() {
  return (
    <div className="grid w-full max-w-md gap-3 rounded-[var(--radius-lg)] border bg-card p-5 text-card-foreground">
      <LoadingDots className="text-sm" size={4}>
        Saving
      </LoadingDots>
      <LoadingDots className="text-sm text-muted-foreground" size={5}>
        Building preview
      </LoadingDots>
      <LoadingDots className="text-sm text-[color:var(--status-success)]" size={3}>
        Syncing changes
      </LoadingDots>
    </div>
  );
}
