"use client";

/**
 * Scale indicators visual showing post-launch growth.
 */
const METRICS = [
  { label: "Tenants", value: "∞", desc: "Multi-tenant from day one" },
  { label: "API", value: "oRPC", desc: "Type-safe + OpenAPI" },
  { label: "CI", value: "15", desc: "Automated workflows" },
];

export function ScaleVisual() {
  return (
    <div className="grid grid-cols-3 gap-2">
      {METRICS.map((m) => (
        <div
          key={m.label}
          className="flex flex-col items-center rounded-xl border border-border/40 bg-muted/30 p-3 text-center"
        >
          <span className="text-lg font-black text-primary tabular-nums">{m.value}</span>
          <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mt-1">
            {m.label}
          </span>
        </div>
      ))}
    </div>
  );
}
