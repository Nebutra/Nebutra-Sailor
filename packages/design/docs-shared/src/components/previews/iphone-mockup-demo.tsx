import { Phone } from "@nebutra/ui/primitives";

function CapturedScreen() {
  return (
    <div
      role="img"
      aria-label="Nebutra mobile dashboard screenshot with usage cards and recent activity"
      className="flex size-full flex-col gap-5 bg-background px-6 py-12 text-foreground"
    >
      <div className="space-y-2">
        <div className="h-3 w-28 rounded-[var(--radius-full)] bg-[hsl(var(--foreground))]" />
        <div className="h-2 w-44 rounded-[var(--radius-full)] bg-[hsl(var(--border))]" />
      </div>
      <div className="rounded-[var(--radius-xl)] border border-border bg-muted p-5">
        <div className="h-3 w-24 rounded-[var(--radius-full)] bg-[hsl(var(--foreground))]" />
        <div className="mt-5 h-2 w-52 rounded-[var(--radius-full)] bg-[hsl(var(--primary))]" />
        <div className="mt-3 h-2 w-36 rounded-[var(--radius-full)] bg-[hsl(var(--border))]" />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-[var(--radius-lg)] border border-border bg-background p-4">
          <div className="h-2 w-16 rounded-[var(--radius-full)] bg-[hsl(var(--border))]" />
          <div className="mt-5 h-4 w-20 rounded-[var(--radius-full)] bg-[hsl(var(--foreground))]" />
        </div>
        <div className="rounded-[var(--radius-lg)] border border-border bg-background p-4">
          <div className="h-2 w-14 rounded-[var(--radius-full)] bg-[hsl(var(--border))]" />
          <div className="mt-5 h-4 w-16 rounded-[var(--radius-full)] bg-[hsl(var(--foreground))]" />
        </div>
      </div>
      <div className="mt-auto space-y-3 rounded-[var(--radius-xl)] border border-border bg-background p-4">
        {[0, 1, 2].map((item) => (
          <div className="flex items-center gap-3" key={item}>
            <div className="size-8 rounded-[var(--radius-full)] bg-muted" />
            <div className="min-w-0 flex-1 space-y-2">
              <div className="h-2 rounded-[var(--radius-full)] bg-[hsl(var(--muted-foreground))]" />
              <div className="h-2 w-2/3 rounded-[var(--radius-full)] bg-[hsl(var(--border))]" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function IphoneMockupDemo() {
  return (
    <div className="mx-auto w-full max-w-xs px-4 py-8">
      <Phone className="w-full" chrome="graphite">
        <CapturedScreen />
      </Phone>
    </div>
  );
}
