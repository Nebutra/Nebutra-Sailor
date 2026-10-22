"use client";

import { Check, Copy } from "@nebutra/icons";
import { Button } from "@nebutra/ui/primitives";
import * as React from "react";
import { type Palette, toCssVariables, toDtcg } from "@/lib/color";
import { useCopy } from "@/lib/use-copy";

type Format = "css" | "dtcg";

const FORMATS: { id: Format; label: string; file: string }[] = [
  { id: "css", label: "CSS variables", file: "palette.css" },
  { id: "dtcg", label: "DTCG JSON", file: "palette.tokens.json" },
];

/** The palette as a file a repo can take: custom properties, or a DTCG token tree. */
export function PaletteExport({ palette, name }: { palette: Palette; name: string }) {
  const [format, setFormat] = React.useState<Format>("css");
  const { copied, copy } = useCopy();

  const text = format === "css" ? toCssVariables(palette, name) : toDtcg(palette, name);
  const active = FORMATS.find((entry) => entry.id === format);

  return (
    <div className="overflow-hidden rounded-lg border border-border bg-card">
      <div className="flex flex-wrap items-center justify-between gap-3 border-border border-b px-3 py-2">
        <fieldset className="m-0 flex min-w-0 gap-1 border-0 p-0">
          <legend className="sr-only">Export format</legend>
          {FORMATS.map((entry) => (
            <Button
              aria-pressed={entry.id === format}
              key={entry.id}
              onClick={() => setFormat(entry.id)}
              size="sm"
              variant={entry.id === format ? "secondary" : "ghost"}
            >
              {entry.label}
            </Button>
          ))}
        </fieldset>
        <div className="flex items-center gap-3">
          <span className="hidden font-mono text-muted-foreground text-xs sm:inline">
            {active?.file}
          </span>
          <Button onClick={() => void copy(text, format)} size="sm" variant="outline">
            {copied === format ? <Check size={14} /> : <Copy size={14} />}
            {copied === format ? "Copied" : "Copy"}
          </Button>
        </div>
      </div>
      <pre className="m-0 max-h-96 overflow-auto p-4 font-mono text-foreground text-xs leading-relaxed">
        <code>{text}</code>
      </pre>
    </div>
  );
}
