"use client";

/**
 * The pictures on the home grid — and none of them is a picture.
 *
 * Geist's front door is a grid of foundations, each cell headed by an image of
 * what it links to. Here every one of those images is the thing itself: the
 * controls are `@nebutra/ui` exports, the capsules are semantic fills, the
 * glyphs are `@nebutra/icons`, the cards sit on the shadow ramp. Pressing a
 * language in the strip above re-skins all six, which is the argument the old
 * mock dashboard tried to make by being a dashboard.
 *
 * Each visual is `inert`: the cell is a link, and a link may not contain
 * controls a keyboard can reach. They are specimens here, not instruments.
 */

import { BrandMark, WordmarkEnSVG } from "@nebutra/brand";
import {
  Analytics,
  ArrowUpRight,
  Bell,
  Box,
  ChartBarMiddle,
  Clock,
  Code,
  CodeBracket,
  Command,
  Database,
  File,
  Flag,
  FloppyDisk,
  Gauge,
  GitBranch,
  Globe,
  Inbox,
  Key,
  Paperclip,
  Pencil,
  SettingsSliders,
  Shield,
  Sparkles,
  Terminal,
} from "@nebutra/icons";
import { Badge, Button, Checkbox, Input, Kbd, Switch } from "@nebutra/ui/primitives";
import * as React from "react";

export function ComponentsVisual() {
  const [env, setEnv] = React.useState("preview");
  return (
    <div className="flex w-full max-w-sm flex-col gap-3" inert>
      <div className="flex items-center gap-2">
        <Input
          aria-label="Search deployments"
          placeholder="Search deployments"
          suffix={
            <Kbd meta small>
              K
            </Kbd>
          }
        />
        <Button prefix={<GitBranch />} variant="outline">
          main
        </Button>
      </div>
      <div className="flex items-center gap-3">
        <Switch name="home-env" onValueChange={setEnv} value={env}>
          <Switch.Control label="Preview" value="preview" />
          <Switch.Control label="Production" value="production" />
        </Switch>
        <Checkbox defaultChecked>Notify</Checkbox>
      </div>
      <div className="flex items-center gap-2">
        <Button>Deploy</Button>
        <Button variant="secondary">Cancel</Button>
        <Badge variant="secondary">Ready</Badge>
      </div>
    </div>
  );
}

/**
 * The palette as it is built: three twelve-step scales and the status fills,
 * as flush strips on the card — no per-swatch chrome. Full class names, not
 * built strings, so Tailwind emits every one; each is the scale variable, so
 * a language that re-points a scale re-paints its strip.
 */
const STRIPS: ReadonlyArray<{ label: string; steps: readonly string[] }> = [
  {
    label: "Neutral",
    steps: [
      "bg-neutral-1",
      "bg-neutral-2",
      "bg-neutral-3",
      "bg-neutral-4",
      "bg-neutral-5",
      "bg-neutral-6",
      "bg-neutral-7",
      "bg-neutral-8",
      "bg-neutral-9",
      "bg-neutral-10",
      "bg-neutral-11",
      "bg-neutral-12",
    ],
  },
  {
    label: "Blue",
    steps: [
      "bg-blue-1",
      "bg-blue-2",
      "bg-blue-3",
      "bg-blue-4",
      "bg-blue-5",
      "bg-blue-6",
      "bg-blue-7",
      "bg-blue-8",
      "bg-blue-9",
      "bg-blue-10",
      "bg-blue-11",
      "bg-blue-12",
    ],
  },
  {
    label: "Cyan",
    steps: [
      "bg-cyan-1",
      "bg-cyan-2",
      "bg-cyan-3",
      "bg-cyan-4",
      "bg-cyan-5",
      "bg-cyan-6",
      "bg-cyan-7",
      "bg-cyan-8",
      "bg-cyan-9",
      "bg-cyan-10",
      "bg-cyan-11",
      "bg-cyan-12",
    ],
  },
];

const STATUS = ["bg-success", "bg-warning", "bg-destructive", "bg-info"] as const;

export function ColourVisual() {
  return (
    <div
      aria-label="Colour scales"
      className="flex w-full max-w-md flex-col gap-2"
      inert
      role="img"
    >
      {STRIPS.map((strip) => (
        <div className="grid grid-cols-[3.5rem_1fr] items-center gap-3" key={strip.label}>
          <span className="text-muted-foreground text-xs">{strip.label}</span>
          {/* One rounded strip; the steps meet without gaps, so the ramp reads
              as a ramp. The inset hairline keeps the pale end off the card. */}
          <span className="relative grid h-7 grid-cols-12 overflow-hidden rounded-[var(--radius-sm)] after:pointer-events-none after:absolute after:inset-0 after:rounded-[inherit] after:ring-1 after:ring-border after:ring-inset">
            {strip.steps.map((fill) => (
              <span className={fill} key={fill} />
            ))}
          </span>
        </div>
      ))}
      <div className="grid grid-cols-[3.5rem_1fr] items-center gap-3">
        <span className="text-muted-foreground text-xs">Status</span>
        <span className="grid h-7 grid-cols-4 overflow-hidden rounded-[var(--radius-sm)]">
          {STATUS.map((fill) => (
            <span className={fill} key={fill} />
          ))}
        </span>
      </div>
    </div>
  );
}

/** The lockup on its construction lines — drawn in the border ink, so they read in every language. */
export function BrandVisual() {
  return (
    <div className="relative flex h-40 w-full items-center justify-center" inert>
      <svg
        aria-hidden
        role="presentation"
        className="absolute inset-0 h-full w-full text-border"
        fill="none"
        preserveAspectRatio="none"
      >
        <line stroke="currentColor" strokeDasharray="3 4" x1="0" x2="100%" y1="30%" y2="30%" />
        <line stroke="currentColor" strokeDasharray="3 4" x1="0" x2="100%" y1="70%" y2="70%" />
        <line stroke="currentColor" strokeDasharray="3 4" x1="22%" x2="22%" y1="0" y2="100%" />
        <line stroke="currentColor" strokeDasharray="3 4" x1="78%" x2="78%" y1="0" y2="100%" />
      </svg>
      <div className="relative flex items-center gap-4 text-foreground">
        <BrandMark size={52} />
        <WordmarkEnSVG aria-hidden className="h-8 w-auto" />
      </div>
    </div>
  );
}

const GLYPHS = [
  Box,
  ArrowUpRight,
  ChartBarMiddle,
  Clock,
  Globe,
  Flag,
  Bell,
  Database,
  Shield,
  Inbox,
  Pencil,
  File,
  Paperclip,
  Code,
  Key,
  CodeBracket,
  FloppyDisk,
  GitBranch,
  Command,
  SettingsSliders,
  Terminal,
  Gauge,
  Analytics,
  Sparkles,
];

export function IconsVisual() {
  return (
    <div className="grid w-full grid-cols-8 gap-x-4 gap-y-5 text-foreground" inert>
      {GLYPHS.map((Glyph, index) => (
        <span className="flex justify-center" key={index}>
          <Glyph aria-hidden className="size-5" />
        </span>
      ))}
    </div>
  );
}

/** The two faces, in the families the active language sets for heading and code. */
export function TypeVisual() {
  return (
    <div className="grid w-full grid-cols-2" inert>
      <div className="flex h-24 items-center justify-center border border-border border-dashed font-heading text-3xl text-foreground tracking-heading">
        Aa Display
      </div>
      <div className="-ml-px flex h-24 items-center justify-center border border-border border-dashed font-mono text-2xl text-foreground">
        Mono
      </div>
    </div>
  );
}

/** Three cards on three steps of the ramp — the shadows themselves, not swatches of them. */
export function ElevationVisual() {
  return (
    <div className="flex w-full items-end justify-center gap-5" inert>
      {(
        [
          ["sm", "shadow-ambient-sm", "h-16"],
          ["md", "shadow-ambient-md", "h-20"],
          ["lg", "shadow-ambient-lg", "h-24"],
        ] as const
      ).map(([label, shadow, height]) => (
        <div
          className={`flex ${height} w-24 items-end rounded-lg border border-border bg-card p-3 text-muted-foreground text-xs ${shadow}`}
          key={label}
        >
          {label}
        </div>
      ))}
    </div>
  );
}
