"use client";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@nebutra/ui/primitives";
import {
  nebutraAnimations,
  nebutraBorderRadius,
  nebutraColors,
  nebutraShadows,
  nebutraSpacing,
  nebutraTypography,
} from "@nebutra/ui/tailwind.preset";
import { Check, Copy, Play } from "lucide-react";
import * as React from "react";

// --- Colors Demo ---

function CopyButton({ value, label }: { value: string; label: string }) {
  const [copied, setCopied] = React.useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(value);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <DropdownMenuItem onClick={handleCopy} className="cursor-pointer">
      <span className="flex-1">{label}</span>
      {copied ? (
        <Check className="h-4 w-4 text-green-500" />
      ) : (
        <Copy className="h-4 w-4 text-muted-foreground" />
      )}
    </DropdownMenuItem>
  );
}

function Swatch({
  name,
  shade,
  hex,
  className = "",
}: {
  name: string;
  shade: string;
  hex: string;
  className?: string;
}) {
  const isLightBg = parseInt(shade, 10) < 400 || shade === "50" || shade === "foreground";
  const contrastClass = isLightBg ? "text-neutral-900" : "text-white";

  const twClass = `bg-${name}-${shade === "DEFAULT" ? name : shade}`;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          className={`group relative flex h-24 w-full flex-col items-start justify-between p-3 text-left transition-transform hover:z-10 focus:z-10 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 hover:scale-105 rounded-md mx-0.5 ${className} ${contrastClass}`}
          style={{ backgroundColor: hex }}
        >
          <div className="font-mono text-[10px] font-medium opacity-60 transition-opacity group-hover:opacity-100 uppercase">
            {shade}
          </div>
          <div className="font-mono text-xs font-semibold opacity-90 transition-opacity group-hover:opacity-100">
            {hex.toUpperCase()}
          </div>
          <div className="pointer-events-none absolute inset-0 rounded-md border border-black/10 opacity-0 mix-blend-overlay transition-opacity group-hover:opacity-100 dark:border-white/10" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-[180px]">
        <CopyButton value={hex} label="Copy HEX" />
        <CopyButton value={twClass} label="Copy Tailwind Class" />
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export function TailwindColorsDemo({
  colorName,
  mainShade,
}: {
  colorName: "blue" | "cyan" | "neutral" | "semantic";
  mainShade?: string;
}) {
  if (colorName === "semantic") {
    return (
      <div className="mb-8 overflow-hidden rounded-xl border border-[var(--neutral-6)] shadow-sm">
        <div className="bg-[var(--neutral-2)] px-4 py-3 border-b border-[var(--neutral-6)]">
          <h3 className="font-mono text-xs font-semibold uppercase tracking-widest text-muted-foreground">
            Semantic Colors
          </h3>
        </div>
        <div className="flex flex-wrap w-full sm:flex-nowrap p-4 gap-2 bg-card">
          <Swatch name="success" shade="DEFAULT" hex={nebutraColors.success} className="flex-1" />
          <Swatch name="warning" shade="DEFAULT" hex={nebutraColors.warning} className="flex-1" />
          <Swatch name="error" shade="DEFAULT" hex={nebutraColors.error} className="flex-1" />
          <Swatch name="info" shade="DEFAULT" hex={nebutraColors.info} className="flex-1" />
        </div>
      </div>
    );
  }

  const scale = nebutraColors[colorName];
  const entries = Object.entries(scale).filter(([k]) => k !== "DEFAULT" && k !== "foreground");

  return (
    <div className="mb-8 overflow-hidden rounded-xl border border-[var(--neutral-6)] shadow-sm">
      <div className="bg-[var(--neutral-2)] px-4 py-3 border-b border-[var(--neutral-6)]">
        <h3 className="font-mono text-xs font-semibold uppercase tracking-widest text-muted-foreground">
          {colorName} Scale
        </h3>
      </div>
      <div className="flex flex-wrap w-full sm:flex-nowrap p-4 gap-1 bg-card">
        {entries.map(([step, hex]) => (
          <Swatch
            key={step}
            name={colorName}
            shade={step}
            hex={hex as string}
            className={
              step === mainShade ? "ring-2 ring-primary ring-offset-2 ring-offset-background" : ""
            }
          />
        ))}
      </div>
    </div>
  );
}

// --- Spacing Demo ---

export function TailwindSpacingDemo() {
  const spacings = Object.entries(nebutraSpacing).sort((a, b) => {
    // Sort logic hack for specific values xs, sm, md, lg, xl, 2xl, 3xl
    const order = ["xs", "sm", "md", "lg", "xl", "2xl", "3xl"];
    return order.indexOf(a[0]) - order.indexOf(b[0]);
  });

  return (
    <div className="w-full overflow-hidden rounded-xl border border-[var(--neutral-6)] bg-card shadow-sm mb-8">
      <div className="grid grid-cols-[100px_80px_1fr] gap-4 p-4 border-b border-[var(--neutral-6)] bg-[var(--neutral-2)] text-xs font-semibold text-muted-foreground">
        <div>Token</div>
        <div>Value</div>
        <div>Preview</div>
      </div>
      <div className="flex flex-col">
        {spacings.map(([key, value]) => (
          <div
            key={key}
            className="grid grid-cols-[100px_80px_1fr] gap-4 p-4 items-center border-b border-[var(--neutral-6)] last:border-0 hover:bg-[var(--neutral-2)]/50 transition-colors"
          >
            <code className="text-xs font-mono text-primary font-semibold">space-{key}</code>
            <code className="text-xs font-mono text-muted-foreground">{String(value)}</code>
            <div className="flex items-center">
              <div
                className="bg-primary/20 border border-primary/40 rounded-sm h-8 shrink-0 transition-all hover:bg-primary/30"
                style={{ width: value as string }}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// --- Border Radius Demo ---

export function TailwindRadiusDemo() {
  const radii = Object.entries(nebutraBorderRadius);

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4 mb-8">
      {radii.map(([key, value]) => (
        <div
          key={key}
          className="flex flex-col items-center justify-center p-6 border border-[var(--neutral-6)] bg-card rounded-xl shadow-sm hover:border-primary/50 transition-colors group"
        >
          <div
            className="h-16 w-16 bg-primary/10 border-2 border-primary/30 group-hover:bg-primary/20 transition-colors mb-4"
            style={{ borderRadius: value as string }}
          />
          <code className="text-xs font-mono text-primary font-semibold mb-1">rounded-{key}</code>
          <span className="text-[10px] text-muted-foreground">{String(value)}</span>
        </div>
      ))}
    </div>
  );
}

// --- Shadows Demo ---

export function TailwindShadowsDemo() {
  const shadows = Object.entries(nebutraShadows);

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 mb-8 p-6 bg-[var(--neutral-2)] rounded-xl border border-[var(--neutral-6)]">
      {shadows.map(([key, value]) => (
        <div
          key={key}
          className="bg-card w-full h-32 rounded-lg flex flex-col items-center justify-center transition-all duration-300 hover:-translate-y-1"
          style={{ boxShadow: value as string }}
        >
          <code className="text-sm font-mono text-primary font-semibold">shadow-{key}</code>
        </div>
      ))}
    </div>
  );
}

// --- Typography Demo ---

export function TailwindTypographyDemo() {
  const fontSizes = Object.entries(nebutraTypography.fontSize).sort((a, b) => {
    const order = ["xs", "sm", "base", "lg", "xl", "2xl", "3xl", "4xl"];
    return order.indexOf(a[0]) - order.indexOf(b[0]);
  });

  return (
    <div className="w-full overflow-hidden rounded-xl border border-[var(--neutral-6)] bg-card shadow-sm mb-8">
      <div className="grid grid-cols-[80px_80px_1fr] gap-4 p-4 border-b border-[var(--neutral-6)] bg-[var(--neutral-2)] text-xs font-semibold text-muted-foreground">
        <div>Token</div>
        <div>Rem</div>
        <div>Preview (Inter)</div>
      </div>
      <div className="flex flex-col">
        {fontSizes.map(([key, value]) => (
          <div
            key={key}
            className="grid grid-cols-[80px_80px_1fr] gap-4 px-4 py-6 items-center border-b border-[var(--neutral-6)] last:border-0 hover:bg-[var(--neutral-2)]/50 transition-colors"
          >
            <code className="text-xs font-mono text-primary font-semibold">text-{key}</code>
            <code className="text-xs font-mono text-muted-foreground">{String(value)}</code>
            <div
              className="font-sans text-foreground truncate"
              style={{ fontSize: value as string, lineHeight: 1.2 }}
            >
              The quick brown fox jumps over the lazy dog
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// --- Animations Demo ---

export function TailwindAnimationsDemo() {
  const [playing, setPlaying] = React.useState<string | null>(null);

  const handlePlay = (key: string) => {
    setPlaying(key);
    setTimeout(() => setPlaying(null), 2500); // Most animations are short
  };

  const animations = Object.entries(nebutraAnimations);

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 mb-8">
      {animations.map(([key, value]) => (
        <button
          type="button"
          key={key}
          onClick={() => handlePlay(key)}
          className="flex flex-col items-center justify-center p-6 border border-[var(--neutral-6)] bg-card rounded-xl shadow-sm hover:border-primary/50 transition-colors group relative h-32"
        >
          <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
            <Play className="w-4 h-4 text-muted-foreground" />
          </div>

          <div
            className="w-10 h-10 rounded-md bg-gradient-to-br from-primary to-accent/50 flex items-center justify-center mb-4"
            style={{
              animation:
                playing === key ||
                key.includes("spin") ||
                key.includes("pulse") ||
                key.includes("bounce")
                  ? (value as string)
                  : "none",
            }}
          >
            <div className="w-4 h-4 bg-white/50 rounded-full" />
          </div>
          <code className="text-xs font-mono text-primary font-semibold truncate w-full text-center">
            animate-{key}
          </code>
        </button>
      ))}
    </div>
  );
}
