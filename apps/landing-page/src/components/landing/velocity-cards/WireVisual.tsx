"use client";

/**
 * Config checklist visual showing the wiring phase.
 */
const ITEMS = [
  { label: "Prisma + Supabase", done: true },
  { label: "Clerk Authentication", done: true },
  { label: "Stripe Billing", done: true },
  { label: "AI Gateway (OpenAI, Anthropic)", done: true },
  { label: "i18n (7 languages)", done: false },
];

export function WireVisual() {
  return (
    <div className="rounded-xl border border-border/40 bg-muted/30 p-4 space-y-2.5">
      {ITEMS.map((item) => (
        <div key={item.label} className="flex items-center gap-3">
          <span
            className={[
              "flex h-5 w-5 items-center justify-center rounded-md text-xs font-bold",
              item.done
                ? "bg-emerald-500/10 text-emerald-500 border border-emerald-500/20"
                : "bg-muted border border-border/50 text-muted-foreground",
            ].join(" ")}
          >
            {item.done ? "✓" : ""}
          </span>
          <span
            className={[
              "text-xs font-medium",
              item.done ? "text-foreground" : "text-muted-foreground",
            ].join(" ")}
          >
            {item.label}
          </span>
        </div>
      ))}
    </div>
  );
}
