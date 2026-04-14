"use client";

import { colors } from "@nebutra/brand";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@nebutra/ui/primitives";
import { Check, Copy } from "lucide-react";
import * as React from "react";

interface ColorSwatchProps {
  name: string;
  step?: string;
  hex: string;
  className?: string;
  contrastForeground?: string;
}

function ColorSwatch({
  name,
  step,
  hex,
  className = "",
  contrastForeground = "#ffffff",
}: ColorSwatchProps) {
  const [copiedData, setCopiedData] = React.useState<string | null>(null);

  const handleCopy = (text: string, type: string) => {
    navigator.clipboard.writeText(text);
    setCopiedData(type);
    setTimeout(() => setCopiedData(null), 2000);
  };

  // Convert hex to tailwind arbitrary value or variable format for easy copying
  const cssVar = `--color-${name.toLowerCase()}${step ? `-${step}` : ""}`;
  const tailwindClass = `bg-${name.toLowerCase()}${step ? `-${step}` : ""}`;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          className={`group relative flex h-24 flex-col items-start justify-between p-3 text-left transition-all hover:z-10 focus:z-10 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 ${className}`}
          style={{ backgroundColor: hex, color: contrastForeground }}
        >
          <div className="font-mono text-[10px] font-medium opacity-60 transition-opacity group-hover:opacity-100">
            {step ? step : "Base"}
          </div>
          <div className="font-mono text-xs font-semibold opacity-90 transition-opacity group-hover:opacity-100">
            {hex.toUpperCase()}
          </div>
          {/* Subtle inset border on hover for definition in seamless grids */}
          <div className="pointer-events-none absolute inset-0 border border-black/10 opacity-0 mix-blend-overlay transition-opacity group-hover:opacity-100 dark:border-white/10" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-[160px]">
        <DropdownMenuItem onClick={() => handleCopy(hex, "hex")}>
          <span className="flex-1">Copy HEX</span>
          {copiedData === "hex" ? (
            <Check className="h-4 w-4 text-green-500" />
          ) : (
            <Copy className="h-4 w-4 text-muted-foreground" />
          )}
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => handleCopy(cssVar, "var")}>
          <span className="flex-1">Copy CSS Var</span>
          {copiedData === "var" ? (
            <Check className="h-4 w-4 text-green-500" />
          ) : (
            <Copy className="h-4 w-4 text-muted-foreground" />
          )}
        </DropdownMenuItem>
        {step && (
          <DropdownMenuItem onClick={() => handleCopy(tailwindClass, "tw")}>
            <span className="flex-1">Copy Tailwind</span>
            {copiedData === "tw" ? (
              <Check className="h-4 w-4 text-green-500" />
            ) : (
              <Copy className="h-4 w-4 text-muted-foreground" />
            )}
          </DropdownMenuItem>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function ColorScale({
  name,
  scale,
  mainStep = "500",
}: {
  name: string;
  scale: Record<string, string>;
  mainStep?: string;
}) {
  return (
    <div className="mb-12 overflow-hidden rounded-xl border border-[var(--neutral-6)] shadow-sm">
      <div className="bg-[var(--neutral-2)] px-4 py-3 border-b border-[var(--neutral-6)]">
        <h3 className="font-mono text-xs font-semibold uppercase tracking-widest text-muted-foreground">
          {name} Scale
        </h3>
      </div>
      <div className="flex flex-wrap w-full sm:flex-nowrap">
        {Object.entries(scale).map(([step, hex]) => {
          const isLightBg = parseInt(step, 10) < 500 || step === "0" || step === "50";
          const contrast = isLightBg ? "#000000" : "#ffffff";

          return (
            <ColorSwatch
              key={step}
              name={name}
              step={step}
              hex={hex}
              contrastForeground={contrast}
              className={`flex-[1_1_50%] sm:flex-[1_1_0%] ${step === mainStep ? "ring-inset ring-2 ring-foreground" : ""}`}
            />
          );
        })}
      </div>
    </div>
  );
}

export function ColorPalette() {
  return (
    <div className="my-10 w-full max-w-5xl">
      <ColorScale name="Brand Blue" scale={colors.primary} mainStep="500" />
      <ColorScale name="Brand Cyan" scale={colors.accent} mainStep="500" />
      <ColorScale name="Neutral" scale={colors.neutral} mainStep="900" />

      <div className="mb-12 overflow-hidden rounded-xl border border-[var(--neutral-6)] shadow-sm">
        <div className="bg-[var(--neutral-2)] px-4 py-3 border-b border-[var(--neutral-6)]">
          <h3 className="font-mono text-xs font-semibold uppercase tracking-widest text-muted-foreground">
            Semantic Colors
          </h3>
        </div>
        <div className="flex flex-wrap w-full sm:flex-nowrap">
          <ColorSwatch
            name="Success"
            hex={colors.success}
            contrastForeground="#ffffff"
            className="flex-[1_1_50%] sm:flex-[1_1_0%]"
          />
          <ColorSwatch
            name="Warning"
            hex={colors.warning}
            contrastForeground="#ffffff"
            className="flex-[1_1_50%] sm:flex-[1_1_0%]"
          />
          <ColorSwatch
            name="Error"
            hex={colors.error}
            contrastForeground="#ffffff"
            className="flex-[1_1_50%] sm:flex-[1_1_0%]"
          />
          <ColorSwatch
            name="Info"
            hex={colors.info}
            contrastForeground="#ffffff"
            className="flex-[1_1_50%] sm:flex-[1_1_0%]"
          />
        </div>
      </div>
    </div>
  );
}
