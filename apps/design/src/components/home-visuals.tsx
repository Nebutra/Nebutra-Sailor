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
 * Semantic fills as Geist draws its scales: a capsule per role. Utilities, not
 * `var()`, because these tokens are bare HSL channels — a bare channel in a
 * colour slot voids the declaration — and so a language re-points each one.
 */
const CAPSULES = [
  { label: "foreground", fill: "bg-foreground" },
  { label: "neutral", fill: "bg-neutral-9" },
  { label: "ring", fill: "bg-ring" },
  { label: "accent", fill: "bg-brand-accent" },
  { label: "success", fill: "bg-success" },
  { label: "warning", fill: "bg-warning" },
  { label: "destructive", fill: "bg-destructive" },
];

export function ColourVisual() {
  return (
    <ul aria-label="Semantic fills" className="m-0 flex list-none items-center gap-3 p-0" inert>
      {CAPSULES.map((capsule) => (
        <li
          className="flex h-24 w-8 rounded-full border border-border bg-card p-[11px]"
          key={capsule.label}
        >
          <span className={`w-full flex-1 rounded-full ${capsule.fill}`} />
        </li>
      ))}
    </ul>
  );
}

/** The lockup on its construction lines — drawn in the border ink, so they read in every language. */
export function BrandVisual() {
  return (
    <div className="relative flex h-full w-full items-center justify-center" inert>
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
