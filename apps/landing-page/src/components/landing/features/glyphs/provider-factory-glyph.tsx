import { Check, Connection, SettingsGear } from "@nebutra/icons";
import { Badge } from "@nebutra/ui/primitives";
import type { SubpackageGlyphProps } from "./types";

type ProviderOption = {
  name: string;
  active?: boolean;
};

const PROVIDERS: ProviderOption[] = [
  { name: "Stripe", active: true },
  { name: "Polar" },
  { name: "LemonSqueezy" },
  { name: "ChinaPay" },
];

export function ProviderFactoryGlyph(_props: SubpackageGlyphProps) {
  return (
    <div className="flex w-full flex-col justify-between gap-3 px-4 py-3" style={{ height: 160 }}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5 font-mono text-[10px] text-[var(--neutral-11)]">
          <Connection className="h-3 w-3" />
          <span>provider.billing</span>
        </div>
        <SettingsGear className="h-3 w-3 text-[var(--neutral-10)]" />
      </div>

      <div className="flex flex-wrap items-center gap-1.5">
        {PROVIDERS.map((provider) => {
          if (provider.active) {
            return (
              <div
                key={provider.name}
                className="inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-medium text-white"
                style={{ background: "var(--brand-gradient)" }}
              >
                <Check className="h-3 w-3" />
                <span>{provider.name}</span>
              </div>
            );
          }
          return (
            <Badge
              key={provider.name}
              variant="outline"
              className="rounded-full border-[var(--neutral-7)] bg-transparent px-2.5 py-1 text-[11px] font-normal text-[var(--neutral-10)]"
            >
              {provider.name}
            </Badge>
          );
        })}
      </div>

      <div className="rounded-[var(--radius-md)] border border-[var(--neutral-6)] bg-[var(--neutral-2)] px-2.5 py-1.5">
        <div className="font-mono text-[10px] leading-snug text-[var(--neutral-11)]">
          <span className="text-[var(--neutral-10)]">Detected via</span>{" "}
          <span className="text-[var(--neutral-12)]">BILLING_PROVIDER</span>
          <span className="text-[var(--neutral-10)]"> env</span>
        </div>
        <div className="font-mono text-[10px] leading-snug text-[var(--neutral-10)]">
          falls back to <span className="text-[var(--neutral-12)]">Stripe</span>
        </div>
      </div>
    </div>
  );
}
