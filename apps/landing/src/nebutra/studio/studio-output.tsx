"use client";

import { encodePreset, type Preset } from "@nebutra/tokens/preset";
import { Badge, CopyButton } from "@nebutra/ui/primitives";
import type { ReactNode } from "react";
import { contrastLevel, contrastRatio } from "./contrast";
import { channelsToCss, type TokenRow } from "./theme-token-data";

/**
 * What Studio hands over: the preset as a code, and the two commands that put
 * it on a project. A plain language is its own id (`linear`); anything tuned
 * is a code. Both commands take either.
 */
export function presetArgument(preset: Preset): string {
  return Object.keys(preset).length === 1 ? preset.base : encodePreset(preset);
}

const copyProps = {
  variant: "tertiary",
  size: "tiny",
  showToast: false,
  timeout: 1200,
  className: "h-7 shrink-0 border-border/70 bg-card/70 px-2 text-2xs",
} as const;

function Block({
  title,
  action,
  children,
}: {
  title: string;
  action?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section className="grid min-w-0 gap-2">
      <div className="flex items-center justify-between gap-3">
        <h3 className="font-medium text-muted-foreground text-xs">{title}</h3>
        {action}
      </div>
      {children}
    </section>
  );
}

function Command({ command }: { command: string }) {
  return (
    <div className="flex min-w-0 items-center gap-2 rounded-[var(--radius-md)] border border-border bg-background py-1.5 pr-1.5 pl-3">
      <code className="min-w-0 flex-1 overflow-x-auto whitespace-nowrap font-mono text-2xs text-foreground">
        {command}
      </code>
      <CopyButton {...copyProps} value={command} label="Copy" />
    </div>
  );
}

function ContrastRow({ label, fg, bg }: { label: string; fg?: string; bg?: string }) {
  const ratio = fg && bg ? contrastRatio(fg, bg) : null;
  if (ratio === null) return null;
  const level = contrastLevel(ratio);
  return (
    <div className="flex items-center justify-between gap-3 text-xs">
      <span className="text-muted-foreground">{label}</span>
      <span className="flex items-center gap-2">
        <span className="font-mono text-foreground tabular-nums">{ratio.toFixed(2)}:1</span>
        <Badge variant={level === "Fail" ? "red-subtle" : "green-subtle"} size="sm">
          {level}
        </Badge>
      </span>
    </div>
  );
}

export function StudioOutput({
  preset,
  rows,
  shareUrl,
}: {
  preset: Preset;
  /** The variables the artboard actually resolves (read off its computed style). */
  rows: TokenRow[];
  shareUrl: string;
}) {
  const argument = presetArgument(preset);
  const value = (name: string) => rows.find((row) => row.name === name)?.value;

  return (
    <div className="grid min-w-0 gap-5">
      <Block
        title="Your preset"
        action={<CopyButton {...copyProps} value={argument} label="Copy" />}
      >
        <div className="truncate rounded-[var(--radius-md)] border border-border bg-background px-3 py-2 font-mono text-foreground text-lg tracking-wide">
          {argument}
        </div>
      </Block>

      <Block title="New project">
        <Command command={`npx create-sailor@latest my-app --preset ${argument}`} />
      </Block>

      <Block title="Existing project">
        <Command command={`nebutra apply --preset ${argument}`} />
      </Block>

      <Block
        title="Share"
        action={<CopyButton {...copyProps} value={shareUrl} label="Copy link" />}
      >
        <p className="truncate font-mono text-2xs text-muted-foreground">{shareUrl}</p>
      </Block>

      <Block title="Contrast">
        <div className="grid gap-1.5">
          <ContrastRow
            label="Text on canvas"
            fg={value("--foreground")}
            bg={value("--background")}
          />
          <ContrastRow
            label="Muted text"
            fg={value("--muted-foreground")}
            bg={value("--background")}
          />
          <ContrastRow
            label="Button label"
            fg={value("--primary-foreground")}
            bg={value("--primary")}
          />
        </div>
      </Block>

      <Block title="Tokens">
        <div className="grid gap-1.5">
          {rows.map((row) => (
            <div
              key={row.name}
              className="grid grid-cols-[1rem_minmax(0,1fr)] items-center gap-2 text-xs"
            >
              <span
                className="size-4 rounded-[var(--radius-sm)] border border-border"
                style={{ background: channelsToCss(row.value, "transparent") }}
              />
              <div className="flex min-w-0 justify-between gap-2">
                <span className="truncate font-mono text-foreground">{row.name}</span>
                <span className="truncate font-mono text-muted-foreground text-2xs">
                  {row.value}
                </span>
              </div>
            </div>
          ))}
        </div>
      </Block>
    </div>
  );
}
