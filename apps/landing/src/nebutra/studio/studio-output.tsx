"use client";

import { ArrowUpRight, ChevronDown } from "@nebutra/icons";
import { encodePreset, PRESET_SCHEMA_ID, type Preset } from "@nebutra/tokens/preset";
import {
  Badge,
  ButtonLink,
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
  CopyButton,
} from "@nebutra/ui/primitives";
import { cn } from "@nebutra/ui/utils";
import { type ReactNode, useState } from "react";
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

/** Existing project — the command the apply bar always shows. */
export const applyCommand = (preset: Preset) => `nebutra apply --preset ${presetArgument(preset)}`;

/** Existing project, as an agent runs it (same apply path, reads JSON / links too). */
export const pullCommand = (preset: Preset) => `nebutra studio pull ${presetArgument(preset)}`;

/**
 * What a person pastes to their coding agent: the look, how to apply it, and
 * how to propose the next one — so the loop continues in the agent, not here.
 */
export const agentPrompt = (preset: Preset) =>
  [
    `Use this Sailor Studio look: ${presetArgument(preset)}.`,
    `In this Sailor project run \`${pullCommand(preset)}\` (new project: \`${createCommand(preset)}\`).`,
    `To change it, write a preset against ${PRESET_SCHEMA_ID}, run \`nebutra studio preview '<json>' --from claude-code\`, and send me the link to review before pulling.`,
  ].join("\n");

/** New project. */
export const createCommand = (preset: Preset) =>
  `npx create-sailor@latest my-app --preset ${presetArgument(preset)}`;

const copyProps = {
  variant: "tertiary",
  size: "tiny",
  showToast: false,
  timeout: 1200,
  className: "h-7 shrink-0 border-border/70 bg-card/70 px-2 text-2xs",
} as const;

function Block({
  title,
  hint,
  action,
  children,
}: {
  title: string;
  hint?: string;
  action?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section className="grid min-w-0 gap-2">
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <h3 className="font-medium text-foreground text-xs">{title}</h3>
          {hint ? <p className="text-2xs text-muted-foreground">{hint}</p> : null}
        </div>
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
  siteUrl,
}: {
  preset: Preset;
  /** The variables the artboard actually resolves (read off its computed style). */
  rows: TokenRow[];
  shareUrl: string;
  /** The template site, wearing this look. */
  siteUrl: string;
}) {
  const argument = presetArgument(preset);
  const value = (name: string) => rows.find((row) => row.name === name)?.value;
  const [tokensOpen, setTokensOpen] = useState(false);

  return (
    <div className="grid min-w-0 gap-5">
      <Block
        title="Your preset"
        hint="The whole look, as one code"
        action={<CopyButton {...copyProps} value={argument} label="Copy" />}
      >
        <div className="truncate rounded-[var(--radius-md)] border border-border bg-background px-3 py-2 font-mono text-foreground text-lg tracking-wide">
          {argument}
        </div>
      </Block>

      <Block
        title="Hand to your agent"
        hint="Paste into Claude Code, Codex or Cursor — it applies this look and can propose the next"
        action={<CopyButton {...copyProps} value={agentPrompt(preset)} label="Copy" />}
      >
        <pre className="whitespace-pre-wrap rounded-[var(--radius-md)] border border-border bg-background px-3 py-2 font-mono text-2xs text-muted-foreground leading-relaxed">
          {agentPrompt(preset)}
        </pre>
      </Block>

      <Block title="Existing project" hint="Run it at the project root">
        <Command command={applyCommand(preset)} />
      </Block>

      <Block title="New project">
        <Command command={createCommand(preset)} />
      </Block>

      <Block
        title="Share"
        hint="Opens Studio on this look"
        action={
          <CopyButton
            {...copyProps}
            value={shareUrl}
            label="Copy link"
            copiedLabel="Link copied"
            iconType="link"
          />
        }
      >
        <p className="truncate font-mono text-2xs text-muted-foreground">{shareUrl}</p>
      </Block>

      <ButtonLink
        href={siteUrl}
        target="_blank"
        rel="noopener"
        variant="secondary"
        size="sm"
        className="w-full"
        suffix={<ArrowUpRight className="size-3.5" />}
      >
        See it as a site
      </ButtonLink>

      <Block title="Contrast" hint="WCAG ratio for the three pairs that carry text">
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

      <Collapsible
        open={tokensOpen}
        onOpenChange={setTokensOpen}
        className="border-border/70 border-t pt-3"
      >
        <CollapsibleTrigger className="flex h-8 w-full items-center justify-between rounded-[var(--radius-md)] text-left font-medium text-muted-foreground text-xs hover:text-foreground">
          <span>Tokens — the values the preview resolves</span>
          <ChevronDown
            className={cn("size-4 transition-transform duration-flow", tokensOpen && "rotate-180")}
          />
        </CollapsibleTrigger>
        <CollapsibleContent>
          <div className="grid gap-1.5 pt-2">
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
                  <span className="truncate font-mono text-2xs text-muted-foreground">
                    {row.value}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </CollapsibleContent>
      </Collapsible>
    </div>
  );
}
