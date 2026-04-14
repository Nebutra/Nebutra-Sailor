"use client";

import { MagicCard } from "@nebutra/ui/primitives";
import { Check, Copy } from "lucide-react";
import { useState } from "react";

function CopyButton({ text, label }: { text: string; label?: string }) {
  const [hasCopied, setHasCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(text);
    setHasCopied(true);
    setTimeout(() => setHasCopied(false), 2000);
  };

  return (
    <button
      type="button"
      onClick={handleCopy}
      className="group flex items-center justify-between gap-2 px-3 py-2 w-full rounded-md bg-transparent hover:bg-muted transition-colors text-left"
      title="Click to copy CSS variable"
    >
      <span className="font-mono text-xs text-muted-foreground truncate">{label || text}</span>
      {hasCopied ? (
        <Check className="h-3 w-3 text-emerald-500 flex-shrink-0" />
      ) : (
        <Copy className="h-3 w-3 text-muted-foreground opacity-50 group-hover:opacity-100 transition-opacity flex-shrink-0" />
      )}
    </button>
  );
}

export function BrandGradientsDemo() {
  return (
    <div className="my-10 flex flex-col gap-8">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Primary */}
        <MagicCard
          className="p-0 rounded-2xl border-[var(--neutral-5)] flex flex-col overflow-hidden bg-[var(--neutral-1)]"
          gradientColor="var(--neutral-3)"
        >
          <div className="h-48 w-full bg-[linear-gradient(135deg,#0033FE_0%,#0BF1C3_100%)] relative overflow-hidden flex items-end p-6">
            <div className="absolute inset-0 bg-black/5" />
            <span className="text-white font-mono text-sm font-medium drop-shadow-md relative z-10 opacity-90">
              135deg
            </span>
          </div>
          <div className="p-6 flex flex-col gap-4">
            <div>
              <h3 className="text-xl font-semibold text-foreground mb-1">Brand Primary</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Hero sections, primary CTA buttons, and logo fills.
              </p>
            </div>
            <div className="bg-card border border-[var(--neutral-6)] rounded-lg overflow-hidden mt-auto">
              <CopyButton text="var(--gradient-brand)" label="var(--gradient-brand)" />
              <div className="h-[1px] w-full bg-[var(--neutral-6)]" />
              <CopyButton
                text="linear-gradient(135deg, #0033FE 0%, #0BF1C3 100%)"
                label="linear-gradient(...)"
              />
            </div>
          </div>
        </MagicCard>

        {/* Reverse */}
        <MagicCard
          className="p-0 rounded-2xl border-[var(--neutral-5)] flex flex-col overflow-hidden bg-[var(--neutral-1)]"
          gradientColor="var(--neutral-3)"
        >
          <div className="h-48 w-full bg-[linear-gradient(135deg,#0BF1C3_0%,#0033FE_100%)] relative overflow-hidden flex items-end p-6">
            <div className="absolute inset-0 bg-black/5" />
            <span className="text-white font-mono text-sm font-medium drop-shadow-md relative z-10 opacity-90">
              135deg (Reverse)
            </span>
          </div>
          <div className="p-6 flex flex-col gap-4">
            <div>
              <h3 className="text-xl font-semibold text-foreground mb-1">Brand Reverse</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Hover state on primary gradient elements and secondary emphasis.
              </p>
            </div>
            <div className="bg-card border border-[var(--neutral-6)] rounded-lg overflow-hidden mt-auto">
              <CopyButton
                text="var(--gradient-brand-reverse)"
                label="var(--gradient-brand-reverse)"
              />
              <div className="h-[1px] w-full bg-[var(--neutral-6)]" />
              <CopyButton
                text="linear-gradient(135deg, #0BF1C3 0%, #0033FE 100%)"
                label="linear-gradient(...)"
              />
            </div>
          </div>
        </MagicCard>

        {/* Vertical */}
        <MagicCard
          className="p-0 rounded-2xl border-[var(--neutral-5)] flex flex-col overflow-hidden bg-[var(--neutral-1)]"
          gradientColor="var(--neutral-3)"
        >
          <div className="h-48 w-full bg-[linear-gradient(180deg,#0033FE_0%,#0BF1C3_100%)] relative overflow-hidden flex items-end p-6">
            <div className="absolute inset-0 bg-[url('/grid.svg')] bg-repeat opacity-20 mix-blend-overlay" />
            <span className="text-white font-mono text-sm font-medium drop-shadow-md relative z-10 opacity-90">
              180deg
            </span>
          </div>
          <div className="p-6 flex flex-col gap-4">
            <div>
              <h3 className="text-xl font-semibold text-foreground mb-1">Section Vertical</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Page section dividers and tall vertical feature strips.
              </p>
            </div>
            <div className="bg-card border border-[var(--neutral-6)] rounded-lg overflow-hidden mt-auto">
              <CopyButton
                text="var(--gradient-brand-vertical)"
                label="var(--gradient-brand-vertical)"
              />
              <div className="h-[1px] w-full bg-[var(--neutral-6)]" />
              <CopyButton
                text="linear-gradient(180deg, ...)"
                label="linear-gradient(180deg, ...)"
              />
            </div>
          </div>
        </MagicCard>

        {/* Glow Radial */}
        <MagicCard
          className="p-0 rounded-2xl border-zinc-800 flex flex-col overflow-hidden bg-[#0A0A0A]"
          gradientColor="#1a1a1a"
          gradientFrom="#0033FE"
          gradientTo="#0BF1C3"
        >
          <div className="h-48 w-full bg-black relative overflow-hidden flex flex-col items-center justify-center p-6 border-b border-zinc-800">
            {/* The Glow */}
            <div className="absolute inset-0 bg-[radial-gradient(circle,#0BF1C3_0%,#0033FE_100%)] opacity-30 blur-[40px] mix-blend-screen scale-150" />

            <span className="text-zinc-400 font-mono text-sm font-medium relative z-10 opacity-90 mt-auto w-full text-left">
              Radial Glow
            </span>
          </div>
          <div className="p-6 flex flex-col gap-4 bg-zinc-950">
            <div>
              <h3 className="text-xl font-semibold text-white mb-1">Glow Radial</h3>
              <p className="text-sm text-zinc-400 leading-relaxed">
                Background halos, focus glows, and absolute positioned radial emphasis.
              </p>
            </div>
            <div className="bg-black border border-zinc-800 rounded-lg overflow-hidden mt-auto">
              <CopyButton text="var(--gradient-brand-glow)" label="var(--gradient-brand-glow)" />
              <div className="h-[1px] w-full bg-zinc-800" />
              <CopyButton
                text="radial-gradient(circle, #0BF1C3 0%, #0033FE 100%)"
                label="radial-gradient(...)"
              />
            </div>
          </div>
        </MagicCard>
      </div>
    </div>
  );
}
