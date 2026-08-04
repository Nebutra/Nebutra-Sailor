"use client";

/**
 * The home page's first screen, and the whole argument in one panel.
 *
 * Nothing here is a screenshot, a mock or a styled `div`. Every control is the
 * same export the product imports from `@nebutra/ui`, rendered against the same
 * runtime tokens, inside the same `html[data-brand]` scope the language picker
 * writes to. So switching the language above visibly rebuilds this surface —
 * fills, radii, elevation, type and easing at once — and a token change that
 * would break a product screen breaks this one first.
 *
 * It is deliberately a plausible product fragment rather than a swatch grid.
 * A grid of specimens proves the tokens exist; a working surface proves they
 * compose, which is the part a palette page cannot show.
 */

import { Card } from "@nebutra/ui/patterns";
import {
  AnimateIn,
  Avatar,
  Badge,
  Button,
  Input,
  Kbd,
  Label,
  Progress,
  Separator,
  StatusDot,
  Switch,
  Table,
  Tabs,
} from "@nebutra/ui/primitives";
import * as React from "react";

/**
 * An inline data URI rather than a remote avatar, for the same reason the
 * Avatar demo uses one: this panel must render identically offline, in CI and
 * in a sandbox, and a first screen that depends on the network has a blank
 * circle in it the first time someone opens the site on hotel wifi.
 */
const FACE =
  "data:image/svg+xml;utf8," +
  encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">
       <rect width="64" height="64" fill="#1f2937"/>
       <circle cx="32" cy="24" r="11" fill="#9ca3af"/>
       <path d="M8 64c0-13.3 10.7-24 24-24s24 10.7 24 24z" fill="#9ca3af"/>
     </svg>`,
  );

const VIEWS = [
  { title: "Overview", value: "overview" },
  { title: "Deployments", value: "deployments" },
  { title: "Analytics", value: "analytics" },
];

const ROWS = [
  { env: "Production", commit: "a4f21c8", state: "READY", p95: "184 ms" },
  { env: "Preview", commit: "9e0b73d", state: "BUILDING", p95: "—" },
  { env: "Staging", commit: "1c7fa02", state: "ERROR", p95: "512 ms" },
] as const;

/** The semantic fills a language re-points. Utility classes rather than raw
 * `var()`, because these tokens hold bare HSL channels and a colour slot given
 * bare channels silently voids the whole declaration. */
const ROLES = [
  { className: "bg-primary", label: "primary", short: "prim" },
  { className: "bg-secondary", label: "secondary", short: "sec" },
  { className: "bg-accent", label: "accent", short: "acc" },
  { className: "bg-muted", label: "muted", short: "mut" },
  { className: "bg-success", label: "success", short: "ok" },
  { className: "bg-warning", label: "warning", short: "warn" },
  { className: "bg-destructive", label: "destructive", short: "err" },
];

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-1">
      <span className="text-[11px] text-muted-foreground uppercase tracking-wide">{label}</span>
      <span className="font-semibold text-[19px] text-foreground tabular-nums tracking-tight">
        {value}
      </span>
    </div>
  );
}

export function LiveSpecimen() {
  const [view, setView] = React.useState("overview");
  const [density, setDensity] = React.useState("comfortable");

  return (
    <AnimateIn preset="emerge">
      <div className="grid gap-4 lg:grid-cols-[minmax(0,1.55fr)_minmax(0,1fr)]">
        <Card padding="lg" variant="elevated">
          <Card.Header>
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <Avatar size="md" src={FACE} title="Ada" />
                <div className="flex flex-col gap-0.5">
                  <Card.Title>sailor-web</Card.Title>
                  <div className="flex items-center gap-2">
                    <StatusDot label state="READY" />
                    <span className="text-[12px] text-muted-foreground">
                      deployed 4 minutes ago
                    </span>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="success">live</Badge>
                <Button size="sm" variant="secondary">
                  Logs
                </Button>
                <Button size="sm">Redeploy</Button>
              </div>
            </div>
          </Card.Header>

          <Card.Body className="flex flex-col gap-6">
            <Tabs aria-label="Project views" selected={view} setSelected={setView} tabs={VIEWS} />

            <div className="grid grid-cols-3 gap-6">
              <Stat label="Requests" value="1.28M" />
              <Stat label="p95" value="184 ms" />
              <Stat label="Errors" value="0.02%" />
            </div>

            <div className="flex flex-col gap-2">
              <div className="flex items-baseline justify-between">
                <span className="text-[12px] text-muted-foreground">Build cache</span>
                <span className="text-[12px] text-muted-foreground tabular-nums">72%</span>
              </div>
              <Progress value={72} />
            </div>

            <Table>
              <Table.Header>
                <Table.Row>
                  <Table.Head>Environment</Table.Head>
                  <Table.Head>Commit</Table.Head>
                  <Table.Head>State</Table.Head>
                  <Table.Head numeric>p95</Table.Head>
                </Table.Row>
              </Table.Header>
              <Table.Body interactive>
                {ROWS.map((row) => (
                  <Table.Row key={row.env}>
                    <Table.Cell>{row.env}</Table.Cell>
                    <Table.Cell>
                      <code className="font-mono text-[12px]">{row.commit}</code>
                    </Table.Cell>
                    <Table.Cell>
                      <StatusDot label state={row.state} />
                    </Table.Cell>
                    <Table.Cell numeric>{row.p95}</Table.Cell>
                  </Table.Row>
                ))}
              </Table.Body>
            </Table>
          </Card.Body>
        </Card>

        <div className="flex flex-col gap-4">
          <Card padding="lg" variant="elevated">
            <Card.Header>
              <Card.Title>Filter</Card.Title>
            </Card.Header>
            <Card.Body className="flex flex-col gap-5">
              <div className="flex flex-col gap-2">
                <Label htmlFor="specimen-search">Search deployments</Label>
                <div className="flex items-center gap-2">
                  <Input id="specimen-search" placeholder="branch or commit" />
                  <Kbd>⌘K</Kbd>
                </div>
              </div>

              <div className="flex flex-col gap-2">
                <span className="text-[12px] text-muted-foreground">Density</span>
                <Switch name="specimen-density" onValueChange={setDensity} value={density}>
                  <Switch.Control label="Compact" value="compact" />
                  <Switch.Control label="Comfortable" value="comfortable" />
                </Switch>
              </div>

              <Separator />

              <div className="flex flex-wrap gap-2">
                <Badge variant="secondary">main</Badge>
                <Badge variant="outline">preview</Badge>
                <Badge variant="warning">draft</Badge>
                <Badge variant="destructive">failed</Badge>
              </div>

              <div className="flex gap-2">
                <Button size="sm" variant="ghost">
                  Reset
                </Button>
                <Button size="sm" variant="outline">
                  Apply
                </Button>
              </div>
            </Card.Body>
          </Card>

          {/* The roles, shown as the fills themselves rather than as hex. Every
              cell below is a Tailwind semantic utility, so the row is a direct
              readout of what the active language points each role at. */}
          <div className="rounded-panel bg-card p-5 shadow-ambient-sm">
            <p className="text-[12px] text-muted-foreground">Semantic fills, live</p>
            {/* Named, not merely shown. Three of these roles are near-white in
                several languages, and an unlabelled strip of pale cells reads
                as a rendering fault rather than as the honest answer that
                secondary, accent and muted are all pale there. The seam is a
                gap over a tinted backdrop, so adjacent pale cells still part. */}
            <ul className="mt-3 grid grid-cols-7 gap-px overflow-hidden rounded-[var(--radius-sm)] bg-border/50">
              {ROLES.map((role) => (
                <li className="flex flex-col bg-card" key={role.label}>
                  <span className={`h-10 ${role.className}`} />
                  <span className="pt-1.5 pb-0.5 text-center text-[9px] text-muted-foreground">
                    {role.short}
                  </span>
                </li>
              ))}
            </ul>
            <p className="mt-3 text-[12px] text-muted-foreground leading-relaxed">
              Seven roles. A language re-points them; nothing above imports a colour.
            </p>
          </div>
        </div>
      </div>
    </AnimateIn>
  );
}
