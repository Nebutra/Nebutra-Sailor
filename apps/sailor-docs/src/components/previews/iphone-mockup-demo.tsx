import { Phone } from "@nebutra/ui/primitives";

function CapturedScreen() {
  return (
    <div
      role="img"
      aria-label="Nebutra mobile dashboard screenshot with usage cards and recent activity"
      className="flex size-full flex-col gap-5 bg-[var(--neutral-1)] px-6 py-12 text-[var(--neutral-12)]"
    >
      <div className="space-y-2">
        <div className="h-3 w-28 rounded-[var(--radius-full)] bg-[var(--neutral-12)]" />
        <div className="h-2 w-44 rounded-[var(--radius-full)] bg-[var(--neutral-7)]" />
      </div>
      <div className="rounded-[var(--radius-xl)] border border-border bg-[var(--neutral-2)] p-5">
        <div className="h-3 w-24 rounded-[var(--radius-full)] bg-[var(--neutral-12)]" />
        <div className="mt-5 h-2 w-52 rounded-[var(--radius-full)] bg-[var(--blue-9)]" />
        <div className="mt-3 h-2 w-36 rounded-[var(--radius-full)] bg-[var(--neutral-7)]" />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-[var(--radius-lg)] border border-border bg-background p-4">
          <div className="h-2 w-16 rounded-[var(--radius-full)] bg-[var(--neutral-8)]" />
          <div className="mt-5 h-4 w-20 rounded-[var(--radius-full)] bg-[var(--neutral-12)]" />
        </div>
        <div className="rounded-[var(--radius-lg)] border border-border bg-background p-4">
          <div className="h-2 w-14 rounded-[var(--radius-full)] bg-[var(--neutral-8)]" />
          <div className="mt-5 h-4 w-16 rounded-[var(--radius-full)] bg-[var(--neutral-12)]" />
        </div>
      </div>
      <div className="mt-auto space-y-3 rounded-[var(--radius-xl)] border border-border bg-background p-4">
        {[0, 1, 2].map((item) => (
          <div className="flex items-center gap-3" key={item}>
            <div className="size-8 rounded-[var(--radius-full)] bg-[var(--neutral-4)]" />
            <div className="min-w-0 flex-1 space-y-2">
              <div className="h-2 rounded-[var(--radius-full)] bg-[var(--neutral-9)]" />
              <div className="h-2 w-2/3 rounded-[var(--radius-full)] bg-[var(--neutral-6)]" />
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
