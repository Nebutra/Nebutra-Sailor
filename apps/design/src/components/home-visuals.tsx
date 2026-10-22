"use client";
// @primitive-exempt: the language options are toggle chips led by the language's palette glyph, the same control the header crumb exposes; FilterPills has no slot for it.

/**
 * The home page's first screen: a Nebutra product, built from the library.
 *
 * Nothing in the scene is a screenshot or a mock. The tabs, table, status dots,
 * badges, switch and buttons are `@nebutra/ui` exports, and every colour,
 * radius, face and shadow resolves against the semantic tokens — so the
 * language strip above it does not swap a picture, it re-skins the page the
 * scene is standing on. That is the argument this site makes, shown at the size
 * the product would actually render it.
 *
 * The rows are fixtures. They exist so the scene has something to show; no
 * figure on the page is claimed to be a measurement of anything.
 */

import { BrandMark } from "@nebutra/brand";
import {
  Analytics,
  Box,
  GitBranch,
  Globe,
  Key,
  MagnifyingGlass,
  Plus,
  SettingsSliders,
} from "@nebutra/icons";
import { LANGUAGES, useDesignLanguage } from "@nebutra/theme/language-switcher";
import { useTheme } from "@nebutra/tokens";
import {
  Badge,
  Button,
  CopyButton,
  Input,
  Kbd,
  StatusDot,
  Switch,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  Tabs,
} from "@nebutra/ui/primitives";
import { cn } from "@nebutra/ui/utils";
import * as React from "react";
import { type Mode, PaletteDots } from "@/components/language-gallery";
import { useMounted } from "@/lib/use-mounted";

type View = "deployments" | "keys";

const DEPLOYMENTS = [
  {
    id: "d1",
    name: "sailor-web",
    commit: "fix: tenant switch keeps the active plan",
    state: "READY",
    env: "Production",
    branch: "main",
    age: "2m",
  },
  {
    id: "d2",
    name: "sailor-web",
    commit: "feat: usage-based billing preview",
    state: "BUILDING",
    env: "Preview",
    branch: "billing/usage",
    age: "6m",
  },
  {
    id: "d3",
    name: "gateway",
    commit: "perf: cache tenant lookups per request",
    state: "READY",
    env: "Production",
    branch: "main",
    age: "1h",
  },
  {
    id: "d4",
    name: "sailor-docs",
    commit: "docs: China billing rails",
    state: "ERROR",
    env: "Preview",
    branch: "docs/cn-billing",
    age: "3h",
  },
  {
    id: "d5",
    name: "studio",
    commit: "chore: bump sanity to v5",
    state: "READY",
    env: "Preview",
    branch: "deps/sanity",
    age: "1d",
  },
] as const;

const KEYS = [
  {
    id: "k1",
    name: "Production gateway",
    secret: "nb_live_8f3a…c91d",
    scope: "Read and write",
    used: "2m ago",
  },
  { id: "k2", name: "CI preview", secret: "nb_test_21b7…04ae", scope: "Read only", used: "1h ago" },
  {
    id: "k3",
    name: "Local development",
    secret: "nb_test_9c0e…77f2",
    scope: "Read only",
    used: "6d ago",
  },
] as const;

const RAIL = [
  { label: "Overview", icon: Analytics },
  { label: "Deployments", icon: Box },
  { label: "API keys", icon: Key },
  { label: "Domains", icon: Globe },
  { label: "Settings", icon: SettingsSliders },
] as const;

function DeploymentsPanel() {
  const [query, setQuery] = React.useState("");
  const rows = DEPLOYMENTS.filter((row) =>
    `${row.name} ${row.commit} ${row.branch}`.toLowerCase().includes(query.trim().toLowerCase()),
  );
  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-2">
        <Input
          aria-label="Search deployments"
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search deployments"
          prefix={<MagnifyingGlass />}
          value={query}
        />
        <Button className="hidden sm:inline-flex" prefix={<GitBranch />} variant="outline">
          main
        </Button>
        <Button prefix={<Plus />}>
          <span className="hidden sm:inline">New deployment</span>
          <span className="sm:hidden">New</span>
        </Button>
      </div>
      <Table bare>
        <TableHeader>
          <TableRow>
            <TableHead>Deployment</TableHead>
            <TableHead className="hidden md:table-cell">Environment</TableHead>
            <TableHead className="hidden sm:table-cell">Branch</TableHead>
            <TableHead className="text-right">Age</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((row) => (
            <TableRow key={row.id}>
              <TableCell>
                <div className="flex min-w-0 flex-col gap-1">
                  <span className="flex items-center gap-2 font-medium text-foreground">
                    {row.name}
                    <StatusDot label state={row.state} titlePrefix={row.name} />
                  </span>
                  <span className="max-w-[18rem] truncate text-muted-foreground text-xs sm:max-w-sm">
                    {row.commit}
                  </span>
                </div>
              </TableCell>
              <TableCell className="hidden md:table-cell">
                <Badge variant={row.env === "Production" ? "secondary" : "outline"}>
                  {row.env}
                </Badge>
              </TableCell>
              <TableCell className="hidden font-mono text-muted-foreground text-xs sm:table-cell">
                {row.branch}
              </TableCell>
              <TableCell className="text-right text-muted-foreground tabular-nums">
                {row.age}
              </TableCell>
            </TableRow>
          ))}
          {rows.length === 0 ? (
            <TableRow>
              <TableCell className="py-8 text-center text-muted-foreground" colSpan={4}>
                Nothing matches “{query}”.
              </TableCell>
            </TableRow>
          ) : null}
        </TableBody>
      </Table>
    </div>
  );
}

function KeysPanel() {
  const [approval, setApproval] = React.useState("on");
  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Switch name="home-approval" onValueChange={setApproval} value={approval}>
            <Switch.Control label="Approval on" value="on" />
            <Switch.Control label="Off" value="off" />
          </Switch>
          <span className="hidden text-muted-foreground text-xs sm:inline">
            New keys need an admin to approve them.
          </span>
        </div>
        <Button prefix={<Plus />}>Create key</Button>
      </div>
      <Table bare>
        <TableHeader>
          <TableRow>
            <TableHead>Name</TableHead>
            <TableHead className="hidden md:table-cell">Scope</TableHead>
            <TableHead className="text-right">Last used</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {KEYS.map((key) => (
            <TableRow key={key.id}>
              <TableCell>
                <div className="flex min-w-0 flex-col gap-1">
                  <span className="font-medium text-foreground">{key.name}</span>
                  <span className="flex items-center gap-1 font-mono text-muted-foreground text-xs">
                    {key.secret}
                    <CopyButton
                      showToast={false}
                      size="icon"
                      successMessage={`${key.name} key copied`}
                      tooltipText="Copy key"
                      value={key.secret}
                    />
                  </span>
                </div>
              </TableCell>
              <TableCell className="hidden md:table-cell">
                <Badge variant={key.scope === "Read only" ? "outline" : "secondary"}>
                  {key.scope}
                </Badge>
              </TableCell>
              <TableCell className="text-right text-muted-foreground tabular-nums">
                {key.used}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

/** A small product window: rail, title row with tabs, and the panel they select. */
export function ProductScene({ className }: { className?: string }) {
  const [view, setView] = React.useState<View>("deployments");
  return (
    <div
      className={cn(
        "grid overflow-hidden rounded-[var(--radius-card)] border border-border bg-card text-card-foreground shadow-ambient-md md:grid-cols-[13rem_1fr]",
        className,
      )}
    >
      <aside className="hidden flex-col gap-1 border-border border-r bg-background p-3 md:flex">
        <div className="flex items-center gap-2 px-2 pt-1 pb-4">
          <BrandMark size={18} />
          <span className="font-medium text-foreground text-sm">Acme</span>
        </div>
        {RAIL.map((item) => {
          const current =
            (view === "deployments" && item.label === "Deployments") ||
            (view === "keys" && item.label === "API keys");
          return (
            <span
              aria-current={current ? "page" : undefined}
              className={cn(
                "flex h-8 items-center gap-2 rounded-[var(--radius-md)] px-2 text-sm",
                current ? "bg-accent text-foreground" : "text-muted-foreground",
              )}
              key={item.label}
            >
              <item.icon aria-hidden className="size-4" />
              {item.label}
            </span>
          );
        })}
      </aside>
      <div className="flex min-w-0 flex-col gap-5 p-4 sm:p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="m-0 font-heading text-foreground text-xl tracking-heading">
            {view === "deployments" ? "Deployments" : "API keys"}
          </h2>
          <Tabs
            aria-label="Product view"
            selected={view}
            setSelected={(value) => setView(value as View)}
            size="sm"
            tabs={[
              { title: "Deployments", value: "deployments" },
              { title: "API keys", value: "keys" },
            ]}
          />
        </div>
        {view === "deployments" ? <DeploymentsPanel /> : <KeysPanel />}
      </div>
    </div>
  );
}

/**
 * The nine languages as one row of options, directly above the scene they act
 * on. It drives the same state as the header crumb and the `L` key, so the
 * three always agree.
 */
export function LanguageStrip() {
  const { active, select } = useDesignLanguage();
  const { resolvedTheme } = useTheme();
  const mounted = useMounted();
  const mode: Mode = mounted && resolvedTheme === "dark" ? "dark" : "light";
  const current = LANGUAGES.find((language) => language.id === active) ?? LANGUAGES[0];

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1">
        <p className="m-0 text-muted-foreground text-sm">
          <span className="font-medium text-foreground">{current?.name}</span>
          {current?.tagline ? <span> — {current.tagline}</span> : null}
        </p>
        <p className="m-0 hidden items-center gap-1.5 text-muted-foreground text-sm sm:flex">
          Same product, {LANGUAGES.length} languages · press <Kbd small>L</Kbd>
        </p>
      </div>
      <fieldset className="-mx-4 flex min-w-0 gap-2 border-0 overflow-x-auto px-4 pb-1 md:mx-0 md:flex-wrap md:overflow-visible md:px-0">
        <legend className="sr-only">Design language</legend>
        {LANGUAGES.map((language) => {
          const selected = language.id === active;
          return (
            <button
              aria-pressed={selected}
              className={cn(
                "inline-flex h-8 shrink-0 items-center gap-2 rounded-full border px-3 text-sm transition-colors duration-micro",
                selected
                  ? "border-foreground bg-accent text-foreground"
                  : "border-border text-neutral-11 hover:border-input hover:text-foreground",
              )}
              key={language.id}
              onClick={() => select(language.id)}
              type="button"
            >
              <PaletteDots id={language.id} mode={mode} />
              {language.shortName}
            </button>
          );
        })}
      </fieldset>
    </div>
  );
}
