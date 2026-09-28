"use client";

import {
  ArrowRight,
  ArrowUpRight,
  Check,
  ChevronDown,
  ChevronUp,
  Clipboard,
  Moon,
  MagnifyingGlass as Search,
  Sparkles,
  Sun,
} from "@nebutra/icons";
import { LANGUAGE_REGISTRY } from "@nebutra/theme/languages";
import { PRESET_BASES, type Preset, type PresetBase, parsePreset } from "@nebutra/tokens/preset";
import {
  Badge,
  Button,
  ButtonLink,
  Checkbox,
  CopyButton,
  Input,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Tabs,
  TabsList,
  TabsTrigger,
  ToggleGroup,
  ToggleGroupItem,
} from "@nebutra/ui/primitives";
import { cn } from "@nebutra/ui/utils";
import {
  type CSSProperties,
  type ReactNode,
  type RefObject,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { CONSENT_SLOT_ID } from "@/components/cookie-consent-banner";
import { type PreviewCarrier, paintedCarrierForPreset } from "@/lib/preset-carrier";
import { writePresetCookie } from "@/lib/preset-cookie";
import { ACME_SITE } from "@/nebutra/routes";
import type { CatalogFilter } from "./frame-protocol";
import { CatalogControls, CatalogFrame } from "./studio-catalog";
import { changedKnobs, StudioKnobs } from "./studio-knobs";
import { applyCommand, presetArgument, StudioOutput } from "./studio-output";
import type { ThemeMode, TokenRow } from "./theme-token-data";

/**
 * Sailor Studio — where a project's look is chosen (ADR 2026-09-27 Sailor
 * Studio). Three steps, one question each: choose a look, adjust it, apply
 * it. The apply command is always on screen (the bar under the canvas), so the
 * goal is never below the fold. The artboard is painted by the same resolver
 * and emitter the project build uses, so what it shows is what
 * `nebutra apply --preset` produces.
 */

type PreviewSuite = "dashboard" | "pricing" | "forms" | "ai-chat" | "components";
type Step = "look" | "adjust" | "apply";

/** The Components view's filter — what the catalog frame is asked to show. */
interface CatalogView {
  category: CatalogFilter;
  query: string;
  entry: string | null;
  setCategory: (category: CatalogFilter) => void;
  setQuery: (query: string) => void;
  setEntry: (entry: string | null) => void;
}
type ViewportId = "1440x1024" | "1280x800" | "390x844";

const viewportSpec: Record<ViewportId, { width: number; height: number; label: string }> = {
  "1440x1024": { width: 1440, height: 1024, label: "Desktop, 1440 × 1024" },
  "1280x800": { width: 1280, height: 800, label: "Laptop, 1280 × 800" },
  "390x844": { width: 390, height: 844, label: "Phone, 390 × 844" },
};

/** Real pages first — the result is legible at a glance. The catalog is last. */
const suites: Array<{ id: PreviewSuite; label: string }> = [
  { id: "dashboard", label: "Dashboard" },
  { id: "pricing", label: "Pricing" },
  { id: "forms", label: "Sign-up" },
  { id: "ai-chat", label: "AI chat" },
  { id: "components", label: "All components" },
];

const steps: Array<{ id: Step; label: string; title: string; hint: string }> = [
  {
    id: "look",
    label: "Look",
    title: "Choose a look",
    hint: "A design language to start from. You can adjust it next.",
  },
  {
    id: "adjust",
    label: "Adjust",
    title: "Make it yours",
    hint: "Four knobs change most of what a page reads as.",
  },
  {
    id: "apply",
    label: "Apply",
    title: "Put it on a project",
    hint: "One command, for a new project or one you already have.",
  },
];

/**
 * Variables the output panel reports and grades. They are the carrier's own
 * names, read from the artboard's computed style rather than re-derived.
 */
const INSPECTED_VARS = [
  "--primary",
  "--primary-foreground",
  "--background",
  "--foreground",
  "--card",
  "--muted",
  "--muted-foreground",
  "--border",
  "--ring",
] as const;

const LANGUAGES = new Map(LANGUAGE_REGISTRY.languages.map((lang) => [lang.id, lang]));
const languageName = (id: string) => LANGUAGES.get(id)?.name ?? id;

/** Each thumbnail wears its own language, scoped to its own class. */
const thumbClass = (id: PresetBase) => `studio-thumb-${id}`;
const THUMB_CSS = PRESET_BASES.map(
  (id) => paintedCarrierForPreset({ base: id }, `.${thumbClass(id)}`).css,
).join("\n");

/** A miniature page in the language: heading face, surfaces, radius, the action fill. */
function LanguageThumb({ id, mode }: { id: PresetBase; mode: ThemeMode }) {
  return (
    <div
      aria-hidden="true"
      data-brand="studio"
      className={cn(
        thumbClass(id),
        "pointer-events-none flex h-20 flex-col gap-1.5 overflow-hidden bg-background p-2.5 text-foreground",
        mode === "dark" && "dark",
      )}
    >
      <div className="flex items-center justify-between">
        <span
          className="font-semibold text-2xs leading-none"
          style={{ fontFamily: "var(--font-heading, var(--font-sans))" }}
        >
          Aa
        </span>
        <span className="h-1 w-7 rounded-full bg-muted-foreground/30" />
      </div>
      <div className="flex min-h-0 flex-1 flex-col justify-center gap-1 rounded-[var(--radius-md)] border border-border bg-card px-1.5">
        <span className="h-1 w-3/4 rounded-full bg-foreground/70" />
        <span className="h-1 w-1/2 rounded-full bg-muted-foreground/40" />
      </div>
      <div className="flex gap-1">
        <span className="h-3.5 flex-1 rounded-[var(--radius-sm)] bg-primary" />
        <span className="h-3.5 flex-1 rounded-[var(--radius-sm)] border border-border bg-secondary" />
      </div>
    </div>
  );
}

function LookStep({
  base,
  mode,
  onSelect,
}: {
  base: PresetBase;
  mode: ThemeMode;
  onSelect: (base: PresetBase) => void;
}) {
  const [query, setQuery] = useState("");
  const bases = useMemo(() => {
    const q = query.trim().toLowerCase();
    return PRESET_BASES.filter((id) => {
      if (!q) return true;
      const lang = LANGUAGES.get(id);
      return `${id} ${lang?.name ?? ""} ${lang?.description ?? ""}`.toLowerCase().includes(q);
    });
  }, [query]);

  return (
    <div className="grid gap-3">
      <style>{THUMB_CSS}</style>
      <Input
        aria-label="Search languages"
        placeholder="Search languages"
        value={query}
        onValueChange={setQuery}
        prefix={<Search className="size-4" />}
        size="sm"
      />
      <div className="grid grid-cols-2 gap-2.5">
        {bases.map((id) => {
          const lang = LANGUAGES.get(id);
          const active = id === base;
          return (
            <Button
              key={id}
              type="button"
              variant="ghost"
              aria-pressed={active}
              onClick={() => onSelect(id)}
              className={cn(
                "block h-auto w-full min-w-0 overflow-hidden whitespace-normal rounded-[var(--radius-lg)] border p-0 text-left font-normal",
                "hover:bg-transparent hover:shadow-ambient-sm",
                active
                  ? "border-foreground ring-1 ring-foreground"
                  : "border-border hover:border-muted-foreground/50",
              )}
            >
              <LanguageThumb id={id} mode={mode} />
              <div className="flex items-start justify-between gap-2 border-border/70 border-t px-2.5 py-2">
                <div className="min-w-0">
                  <div className="truncate font-medium text-foreground text-xs">
                    {lang?.name ?? id}
                  </div>
                  <div className="truncate text-2xs text-muted-foreground">
                    {lang?.tagline ?? lang?.description}
                  </div>
                </div>
                {active ? (
                  <span className="grid size-4 shrink-0 place-items-center rounded-full bg-foreground text-background">
                    <Check className="size-2.5" />
                  </span>
                ) : null}
              </div>
            </Button>
          );
        })}
      </div>
      {bases.length === 0 ? (
        <p className="text-muted-foreground text-xs">Nothing matches “{query}”.</p>
      ) : null}
    </div>
  );
}

/** The goal, always on screen: what you have, the command, share, see it live. */
function ApplyBar({
  preset,
  shareUrl,
  siteUrl,
}: {
  preset: Preset;
  shareUrl: string;
  siteUrl: string;
}) {
  const command = applyCommand(preset);
  const changes = changedKnobs(preset);
  return (
    <div className="studio-apply-bar flex min-w-0 items-center gap-3 border-border/80 border-t bg-card px-3 py-2.5 sm:px-4">
      <div className="studio-apply-summary min-w-0 shrink-0">
        <div className="font-medium text-foreground text-xs">{languageName(preset.base)}</div>
        <div className="text-2xs text-muted-foreground">
          {changes === 0 ? "As designed" : `${changes} ${changes === 1 ? "change" : "changes"}`}
        </div>
      </div>
      <div className="flex min-w-0 flex-1 items-center gap-2 rounded-[var(--radius-md)] border border-border bg-background py-1 pr-1 pl-3">
        <span aria-hidden="true" className="select-none font-mono text-2xs text-muted-foreground">
          $
        </span>
        <code className="min-w-0 flex-1 truncate font-mono text-foreground text-xs">{command}</code>
        <CopyButton
          value={command}
          label="Copy"
          variant="default"
          size="tiny"
          showToast={false}
          timeout={1400}
          className="shrink-0"
        />
      </div>
      <div className="studio-apply-extra flex shrink-0 items-center gap-1.5">
        <CopyButton
          value={shareUrl}
          label="Copy link"
          copiedLabel="Link copied"
          iconType="link"
          variant="secondary"
          size="sm"
          showToast={false}
          timeout={1400}
        />
        <ButtonLink
          href={siteUrl}
          target="_blank"
          rel="noopener"
          variant="secondary"
          size="sm"
          suffix={<ArrowUpRight className="size-3.5" />}
        >
          See it as a site
        </ButtonLink>
      </div>
    </div>
  );
}

function CanvasToolbar({
  activeSuite,
  onSuiteChange,
  viewport,
  onViewportChange,
  mode,
  onModeChange,
}: {
  activeSuite: PreviewSuite;
  onSuiteChange: (suite: PreviewSuite) => void;
  viewport: ViewportId;
  onViewportChange: (viewport: ViewportId) => void;
  mode: ThemeMode;
  onModeChange: (mode: ThemeMode) => void;
}) {
  return (
    <div className="flex min-w-0 items-center gap-2 border-border/70 border-b px-3 py-2">
      {/* Wide canvas: every page as a tab. Narrow: one select — never a clipped row. */}
      <div className="studio-page-tabs min-w-0 flex-1">
        <Tabs
          value={activeSuite}
          size="sm"
          onValueChange={(value) => onSuiteChange(value as PreviewSuite)}
        >
          <TabsList aria-label="Preview page">
            {suites.map((suite) => (
              <TabsTrigger key={suite.id} value={suite.id}>
                {suite.label}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
      </div>
      <div className="studio-page-select min-w-0 flex-1">
        <Select value={activeSuite} onValueChange={(v) => onSuiteChange(v as PreviewSuite)}>
          <SelectTrigger size="small" className="h-8 w-40" aria-label="Preview page">
            <SelectValue>{suites.find((suite) => suite.id === activeSuite)?.label}</SelectValue>
          </SelectTrigger>
          <SelectContent>
            {suites.map((suite) => (
              <SelectItem key={suite.id} value={suite.id}>
                {suite.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <ToggleGroup
        type="single"
        aria-label="Preview width"
        value={viewport}
        onValueChange={(next) => next && onViewportChange(next as ViewportId)}
        className="studio-viewport shrink-0 rounded-[var(--radius-md)] border border-border bg-muted p-0.5"
      >
        {(Object.keys(viewportSpec) as ViewportId[]).map((id) => (
          <ToggleGroupItem
            key={id}
            value={id}
            aria-label={viewportSpec[id].label}
            title={viewportSpec[id].label}
            className="h-7 rounded-[calc(var(--radius-md)-2px)] px-2 font-mono text-2xs tabular-nums"
          >
            {viewportSpec[id].width}
          </ToggleGroupItem>
        ))}
      </ToggleGroup>
      <Button
        type="button"
        variant="secondary"
        size="sm"
        shape="square"
        aria-label={mode === "dark" ? "Preview in light mode" : "Preview in dark mode"}
        title={mode === "dark" ? "Preview in light mode" : "Preview in dark mode"}
        onClick={() => onModeChange(mode === "dark" ? "light" : "dark")}
        className="size-8 shrink-0 p-0"
      >
        {mode === "dark" ? <Sun className="size-4" /> : <Moon className="size-4" />}
      </Button>
    </div>
  );
}

function PreviewCanvas({
  preset,
  carrier,
  mode,
  onModeChange,
  activeSuite,
  onSuiteChange,
  viewport,
  onViewportChange,
  artboardRef,
  catalog,
}: {
  preset: Preset;
  carrier: PreviewCarrier;
  mode: ThemeMode;
  onModeChange: (mode: ThemeMode) => void;
  activeSuite: PreviewSuite;
  onSuiteChange: (suite: PreviewSuite) => void;
  viewport: ViewportId;
  onViewportChange: (viewport: ViewportId) => void;
  artboardRef: RefObject<HTMLDivElement | null>;
  catalog: CatalogView;
}) {
  const { width: viewportWidth, height: viewportHeight } = viewportSpec[viewport];
  const frameState = useMemo(
    () => ({
      preset,
      dark: mode === "dark",
      category: catalog.category,
      query: catalog.query,
      entry: catalog.entry,
    }),
    [preset, mode, catalog.category, catalog.query, catalog.entry],
  );

  const toolbar = (
    <CanvasToolbar
      activeSuite={activeSuite}
      onSuiteChange={onSuiteChange}
      viewport={viewport}
      onViewportChange={onViewportChange}
      mode={mode}
      onModeChange={onModeChange}
    />
  );

  if (activeSuite === "components") {
    return (
      <section
        aria-label="Preview"
        className="theme-preview-canvas studio-canvas flex h-full min-h-0 min-w-0 flex-col overflow-hidden bg-muted/30"
      >
        {toolbar}
        <div className="border-border/70 border-b px-3 py-2">
          <CatalogControls
            category={catalog.category}
            onCategoryChange={catalog.setCategory}
            query={catalog.query}
            onQueryChange={catalog.setQuery}
            entry={catalog.entry}
            onBack={() => catalog.setEntry(null)}
          />
        </div>
        <div className="min-h-0 flex-1 p-3 sm:p-4">
          {/* The token readout still needs an element wearing the look. */}
          <div
            ref={artboardRef}
            hidden
            data-brand={carrier.brandId}
            className={cn("theme-preview-artboard", mode === "dark" && "dark")}
          >
            {carrier.css ? <style>{carrier.css}</style> : null}
          </div>
          <CatalogFrame
            state={frameState}
            width={viewportWidth}
            minHeight={Math.min(viewportHeight, 640)}
            onOpen={catalog.setEntry}
          />
        </div>
      </section>
    );
  }

  // The carrier CSS is the production emitter scoped to this artboard: it sets
  // the same `--primary` / `--background` / `--font-sans` variables the app's
  // `html[data-brand]` swap sets, and mode is the canonical `.dark` class the
  // tokens SSOT reads. No inline token map, no `--color-*` indirection.
  return (
    <section
      aria-label="Preview"
      className="theme-preview-canvas studio-canvas flex h-full min-h-0 min-w-0 flex-col overflow-hidden bg-muted/30"
    >
      {toolbar}
      <div className="min-h-0 flex-1 overflow-auto p-3 sm:p-4">
        {carrier.warning ? (
          <p className="mx-auto mb-3 max-w-[80ch] rounded-[var(--radius-md)] border border-warning/40 bg-warning/10 px-3 py-2 text-warning-strong text-xs">
            {carrier.warning}
          </p>
        ) : null}
        {/* Viewport frame — centered; its width follows the chosen device. The
            pane scrolls when that artboard is taller than the remaining slot. */}
        <div
          ref={artboardRef}
          data-brand={carrier.brandId}
          data-mode={mode}
          style={{ maxWidth: `${viewportWidth}px`, minHeight: "100%" }}
          className={cn(
            "theme-preview-artboard mx-auto w-full overflow-hidden rounded-[var(--radius-lg)] border border-border/70 bg-background text-foreground transition-[max-width] duration-200",
            mode === "dark" && "dark",
            // Force theme fonts onto ALL descendants, beating any intermediate CSS
            // rule (e.g. globals.css @layer base h1-h6 / body font-family) that
            // would otherwise re-declare font-family and break inheritance from
            // the carrier's --font-sans / --font-heading vars.
            // code/pre/kbd/samp are excluded so monospace stays intact.
            "[&_:not(:is(h1,h2,h3,h4,h5,h6,code,pre,kbd,samp))]:![font-family:var(--font-sans,ui-sans-serif,system-ui,sans-serif)]",
            "[&_:is(h1,h2,h3,h4,h5,h6)]:![font-family:var(--font-heading,var(--font-sans,ui-sans-serif,system-ui,sans-serif))]",
            // Body font-size: apply --text-base to all <p> elements so an import
            // with fontSize.base (e.g. 1.125rem) visibly scales body copy.
            // Fallback 0.875rem matches the comfortable density text-sm baseline.
            "[&_p]:[font-size:var(--text-base,0.875rem)]",
            "text-sm [--studio-gap:1.125rem] [--studio-pad:1.25rem]",
          )}
        >
          {carrier.css ? <style>{carrier.css}</style> : null}
          <div className="theme-preview-grid gap-[var(--space-source-md,var(--studio-gap))] p-[var(--space-source-lg,var(--studio-pad))]">
            {activeSuite === "dashboard" ? (
              <>
                <DashboardPanel />
                <ChartsPanel />
              </>
            ) : null}
            {activeSuite === "pricing" ? <PricingPanel /> : null}
            {activeSuite === "forms" ? <FormsPanel /> : null}
            {activeSuite === "ai-chat" ? <AiChatPanel /> : null}
          </div>
        </div>
      </div>
    </section>
  );
}

function PreviewCard({
  title,
  className,
  children,
}: {
  title: string;
  className?: string;
  children: ReactNode;
}) {
  return (
    <section
      className={cn(
        // Single-layer ring using pre-computed --edge-soft token (mode-aware).
        // Replaced earlier 3-layer 24px-blur halo: that was perf-expensive
        // (multiple GPU paints + 2 runtime color-mix calls per paint) AND
        // contributed to overall "blur soup" subjective perception. One
        // crisp ring + slight drop shadow reads as defined card without
        // softening the whole UI.
        // The theme's --shadow-md is layered on top of the hairline ring so
        // an imported/built-in elevation token visibly takes effect on cards.
        // Fallback mirrors the original soft drop so themes without shadow tokens look unchanged.
        "rounded-[var(--radius-lg)] bg-card p-[var(--space-source-lg,var(--studio-pad))] text-card-foreground",
        "shadow-[0_0_0_1px_var(--edge-soft),var(--shadow-md,0_2px_8px_-2px_rgb(0_0_0/0.08))]",
        className,
      )}
    >
      <div className="mb-4">
        {/* --font-weight-heading: an import with fontWeight.heading 300 visibly lightens titles.
            --text-heading size is intentionally NOT applied here — card <h3>s are section labels,
            not page-h1s. A 3rem import value would distort the card layout. */}
        <h3 className="text-sm" style={{ fontWeight: "var(--font-weight-heading, 600)" }}>
          {title}
        </h3>
      </div>
      {children}
    </section>
  );
}

function FormInput({
  label,
  value,
  type = "text",
}: {
  label: string;
  value: string;
  type?: string;
}) {
  // The library field, not a hand-rolled <input>: it owns the focus ring,
  // invalid state, affix layout and read-only treatment. Its geometry is a
  // CSS-variable contract (getInputStyle merges the caller's style last), so
  // the preview points it at the carrier's control ladder instead of the
  // primitive's factory px — the field still changes with the design language.
  return (
    <Input
      readOnly
      id={`preview-${label.toLowerCase().replace(/\s+/g, "-")}`}
      label={label}
      type={type}
      value={value}
      style={
        {
          "--input-height": "var(--control-height-md, 2.5rem)",
          "--input-radius": "var(--radius-inputs, var(--radius-md))",
          "--input-font-size": "var(--control-font-size-md, 0.875rem)",
        } as CSSProperties
      }
    />
  );
}

function FormsPanel() {
  return (
    <PreviewCard title="Create an account" className="mx-auto max-w-md">
      <p className="mb-5 text-muted-foreground text-xs">Start building in seconds.</p>
      <div className="grid gap-4">
        <FormInput label="Full name" value="Ava Johnson" />
        <FormInput label="Email" value="ava.johnson@example.com" />
        <FormInput label="Password" value="************" type="password" />
        <Checkbox defaultChecked className="text-muted-foreground text-xs">
          I agree to the Terms of Service and Privacy Policy
        </Checkbox>
        <Button type="button">Create account</Button>
      </div>
    </PreviewCard>
  );
}

function PricingPanel() {
  const plans = [
    {
      name: "Starter",
      price: "$0",
      items: ["Up to 3 projects", "Basic templates", "Community support"],
    },
    {
      name: "Pro",
      price: "$19",
      items: ["Unlimited projects", "Priority support", "Custom branding"],
      popular: true,
    },
    { name: "Team", price: "$49", items: ["Team collaboration", "Admin dashboard", "API access"] },
  ];

  return (
    <PreviewCard title="Choose your plan">
      <div className="theme-pricing-grid gap-4">
        {plans.map((plan) => (
          <div
            key={plan.name}
            className={cn(
              // Same edge recipe as outer PreviewCard: single 1px ring via
              // --edge-soft (mode-aware) + soft drop shadow on the popular
              // plan. NO bg-tier step (bg-popover on bg-card was the
              // "rectangle 白线" — 0.05 L transition reads as visible edge
              // step regardless of border alpha). Card stays same bg as
              // parent; the ring + popular-shadow do the layering work.
              "flex h-full min-w-0 flex-col rounded-[var(--radius-lg)] p-4 shadow-[0_0_0_1px_var(--edge-soft)]",
              plan.popular &&
                "shadow-[0_0_0_1px_var(--edge-medium),0_4px_12px_-4px_rgb(0_0_0/0.18)]",
            )}
          >
            <div className="mb-2 flex min-h-5 items-center">
              {plan.popular ? <Badge size="sm">Most popular</Badge> : null}
            </div>
            <div className="font-semibold text-sm">{plan.name}</div>
            <div className="mt-3 flex items-end gap-1">
              <span className="font-bold text-2xl">{plan.price}</span>
              <span className="text-muted-foreground text-xs">/month</span>
            </div>
            <ul className="mt-4 flex-1 space-y-2 text-xs">
              {plan.items.map((item) => (
                <li key={item} className="flex items-start gap-2 text-muted-foreground">
                  <Check className="mt-0.5 size-3 shrink-0 text-primary" />
                  <span className="min-w-0 leading-5">{item}</span>
                </li>
              ))}
            </ul>
            <Button
              className="mt-auto w-full"
              size="sm"
              type="button"
              variant={plan.popular ? "default" : "outline"}
            >
              {plan.popular ? "Choose Pro" : "Get started"}
            </Button>
          </div>
        ))}
      </div>
    </PreviewCard>
  );
}

function DashboardPanel() {
  const stats = [
    ["Total Projects", "24", "12%"],
    ["Active Users", "1,248", "8%"],
    ["API Requests", "98.4K", "15%"],
    ["Revenue", "$12.6K", "18%"],
  ];

  return (
    <PreviewCard title="Project Overview">
      {/* Stat tiles: no own bg — blend into parent card. Spacing + typography hierarchy alone. */}
      <div className="theme-stats-grid gap-x-6 gap-y-3">
        {stats.map(([label, value, delta]) => (
          <div key={label} className="p-1">
            <div className="text-muted-foreground text-[11px]">{label}</div>
            <div className="mt-1 font-bold text-lg">{value}</div>
            <div className="mt-1 text-[11px] text-success-strong">+{delta} vs last 7 days</div>
          </div>
        ))}
      </div>
      {/* Project list: no own bg — rows separated by faint divider lines only. */}
      <div className="mt-4">
        {["Nebutra Marketing", "Design System v2", "AI Assistant", "Analytics Pipeline"].map(
          (project, index) => (
            <div key={project} className="grid grid-cols-[1fr_auto_auto] items-center gap-3 py-2.5">
              <span className="font-medium text-xs">{project}</span>
              <Badge variant={index === 3 ? "purple-subtle" : "green-subtle"} size="sm">
                {index === 3 ? "Paused" : "Active"}
              </Badge>
              <span className="text-muted-foreground text-[11px]">{index + 1}d ago</span>
            </div>
          ),
        )}
      </div>
    </PreviewCard>
  );
}

function AiChatPanel() {
  return (
    <PreviewCard title="AI Assistant" className="mx-auto max-w-lg">
      <div className="mb-4 flex items-center gap-2">
        <span className="grid size-7 place-items-center rounded-full bg-[color-mix(in_oklch,hsl(var(--primary)),transparent_85%)] text-primary">
          <Sparkles className="size-4" />
        </span>
        <div>
          <div className="font-medium text-xs">Nebutra Agent</div>
          <div className="text-[11px] text-success-strong">Online</div>
        </div>
      </div>
      <div className="ml-auto max-w-[72%] rounded-[var(--radius-lg)] bg-primary p-3 text-primary-foreground text-xs">
        Can you help me analyze last month's growth?
      </div>
      {/* Assistant message bubble: foreground-mix at 6% — barely visible halo
          that hints "this is a bubble" without forming a hard rectangle. */}
      <div className="mt-3 max-w-[78%] rounded-[var(--radius-lg)] bg-[var(--edge-faint)] p-3 text-xs">
        Sure. Growth improved across activation and retention. I attached the report.
        <div className="mt-3 flex items-center justify-between rounded-[var(--radius-md)] bg-[var(--edge-soft)] p-2">
          <span className="font-mono text-[11px]">growth-report.pdf</span>
          <Clipboard className="size-3 text-muted-foreground" />
        </div>
      </div>
      <div className="mt-4 flex gap-2">
        {["Retention", "Region", "Revenue"].map((item) => (
          <Button key={item} shape="pill" size="tiny" type="button" variant="secondary">
            {item}
          </Button>
        ))}
      </div>
    </PreviewCard>
  );
}

function ChartsPanel() {
  return (
    <PreviewCard title="Charts">
      <div className="theme-charts-grid gap-3">
        <MiniChart title="User Growth" value="1,248" variant="line" />
        <MiniChart title="Revenue" value="$12,426" variant="bar" />
        <MiniChart title="API Requests" value="98,426" variant="area" />
      </div>
    </PreviewCard>
  );
}

function MiniChart({
  title,
  value,
  variant,
}: {
  title: string;
  value: string;
  variant: "line" | "bar" | "area";
}) {
  const bars = [42, 58, 46, 72, 64, 55];
  // Flat mini chart — no nested card frame, no inner well bg. Numbers +
  // sparkline sit directly on the parent Charts card.
  return (
    <div className="min-w-0 p-1">
      <div className="mb-4 flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="font-medium text-xs leading-4">{title}</div>
          <div className="mt-1 font-bold text-lg tabular-nums">{value}</div>
        </div>
        <Badge variant="green-subtle" size="sm" className="shrink-0">
          +12.5%
        </Badge>
      </div>
      <div className="relative h-28 overflow-hidden p-1">
        {variant === "bar" ? (
          <div className="flex h-full items-end gap-3">
            {bars.map((height) => (
              <span
                key={`${title}-${height}`}
                className="flex-1 rounded-t-[var(--radius-sm)] bg-[color-mix(in_oklch,hsl(var(--primary)),transparent_20%)]"
                style={{ height: `${height}%` }}
              />
            ))}
          </div>
        ) : (
          <>
            <div className="absolute inset-x-3 bottom-3 h-[38%] rounded-t-full bg-[color-mix(in_oklch,hsl(var(--primary)),transparent_85%)] blur-sm" />
            <svg
              className="absolute inset-3 size-[calc(100%-1.5rem)]"
              viewBox="0 0 320 120"
              role="img"
              aria-label={`${title} trend`}
            >
              {/* SVG paint goes through `style`, not presentation attributes:
                  var() is not substituted inside an attribute value. */}
              <path
                d="M0 88 C42 74 56 48 98 54 C146 60 156 28 204 38 C250 47 258 20 320 24"
                style={{ stroke: "hsl(var(--primary))" }}
                strokeLinecap="round"
                strokeWidth="5"
                fill="none"
              />
              {variant === "area" && (
                <path
                  d="M0 88 C42 74 56 48 98 54 C146 60 156 28 204 38 C250 47 258 20 320 24 L320 120 L0 120 Z"
                  style={{ fill: "color-mix(in oklch, hsl(var(--primary)), transparent 78%)" }}
                />
              )}
            </svg>
          </>
        )}
      </div>
    </div>
  );
}

/** The preset in the page's URL (`?preset=`), so a look is a link. */
function presetFromLocation(): Preset | null {
  if (typeof window === "undefined") return null;
  const raw = new URLSearchParams(window.location.search).get("preset");
  if (!raw) return null;
  try {
    return parsePreset(raw);
  } catch {
    return null;
  }
}

export function StudioWorkbench() {
  const [preset, setPreset] = useState<Preset>({ base: "factory" });
  const [mode, setMode] = useState<ThemeMode>("dark");
  const [step, setStep] = useState<Step>("look");
  // Phone: the controls are a sheet under the preview; it can fold down to its tabs.
  const [sheetOpen, setSheetOpen] = useState(true);
  const [activeSuite, setActiveSuite] = useState<PreviewSuite>("dashboard");
  const [catalogCategory, setCatalogCategory] = useState<CatalogFilter>("all");
  const [catalogQuery, setCatalogQuery] = useState("");
  const [catalogEntry, setCatalogEntry] = useState<string | null>(null);
  const openEntry = useCallback((entry: string | null) => setCatalogEntry(entry), []);
  const catalog: CatalogView = {
    category: catalogCategory,
    query: catalogQuery,
    entry: catalogEntry,
    setCategory: (category) => {
      setCatalogCategory(category);
      setCatalogEntry(null);
    },
    setQuery: (query) => {
      setCatalogQuery(query);
      setCatalogEntry(null);
    },
    setEntry: openEntry,
  };
  const [viewport, setViewport] = useState<ViewportId>("1280x800");
  const [shareUrl, setShareUrl] = useState("");

  // Read the preset from the URL after mount (the server render has no query),
  // then keep the URL following it — but only once it has been read: writing
  // first would drop the `?preset=` the page was opened with.
  const [ready, setReady] = useState(false);
  useEffect(() => {
    const initial = presetFromLocation();
    if (initial) {
      setPreset(initial);
      // A shared look opens where it can be adjusted, not back at the start.
      setStep("adjust");
      // Open the preview in the mode the look greets a visitor with, when it says.
      if (initial.mode === "light" || initial.mode === "dark") setMode(initial.mode);
    }
    setReady(true);
  }, []);
  useEffect(() => {
    if (!ready) return;
    const url = new URL(window.location.href);
    const plainFactory = preset.base === "factory" && Object.keys(preset).length === 1;
    if (plainFactory) url.searchParams.delete("preset");
    else url.searchParams.set("preset", presetArgument(preset));
    window.history.replaceState(null, "", url);
    setShareUrl(url.toString());
    // The template site follows Studio: it reads this look from the shared cookie.
    writePresetCookie(plainFactory ? null : presetArgument(preset));
  }, [preset, ready]);

  const carrier = useMemo<PreviewCarrier>(() => paintedCarrierForPreset(preset), [preset]);

  const artboardRef = useRef<HTMLDivElement>(null);
  const [tokenRows, setTokenRows] = useState<TokenRow[]>([]);
  // biome-ignore lint/correctness/useExhaustiveDependencies: the deps are the re-read trigger — the artboard itself is read through a ref, not captured here.
  useEffect(() => {
    const frame = requestAnimationFrame(() => {
      const el = artboardRef.current;
      if (!el) return;
      const computed = getComputedStyle(el);
      setTokenRows(
        INSPECTED_VARS.map((name) => ({
          name,
          value: computed.getPropertyValue(name).trim(),
        })).filter((row) => row.value.length > 0),
      );
    });
    return () => cancelAnimationFrame(frame);
  }, [mode, carrier.css, activeSuite]);

  // The panel is one scroll region; a new step starts at its top.
  const panelBodyRef = useRef<HTMLDivElement>(null);
  const goTo = (next: Step) => {
    setStep(next);
    setSheetOpen(true);
    panelBodyRef.current?.scrollTo({ top: 0 });
  };

  const siteUrl = `${ACME_SITE}/?preset=${encodeURIComponent(presetArgument(preset))}`;
  const current = steps.find((s) => s.id === step) ?? steps[0];
  const nextStep = steps[steps.findIndex((s) => s.id === step) + 1];

  return (
    <div className="studio-frame flex h-full min-h-0 flex-1 flex-col overflow-hidden bg-background text-foreground">
      <div className="studio-layout min-h-0 flex-1 overflow-hidden">
        <aside
          aria-label="Studio controls"
          data-sheet={sheetOpen ? "open" : "closed"}
          className="studio-panel flex min-h-0 flex-col bg-card"
        >
          <div className="border-border/70 border-b px-4 pt-3 pb-3">
            <div className="mb-3 flex items-center justify-between gap-3">
              <h1 className="font-semibold text-foreground text-sm">Sailor Studio</h1>
              <Button
                type="button"
                variant="ghost"
                size="tiny"
                className="studio-sheet-toggle -mr-2 text-muted-foreground"
                aria-expanded={sheetOpen}
                onClick={() => setSheetOpen((open) => !open)}
                suffix={sheetOpen ? <ChevronDown /> : <ChevronUp />}
              >
                {sheetOpen ? "Hide controls" : "Show controls"}
              </Button>
            </div>
            <Tabs value={step} size="sm" onValueChange={(value) => goTo(value as Step)}>
              <TabsList aria-label="Steps" className="grid w-full grid-cols-3">
                {steps.map((s, i) => (
                  <TabsTrigger key={s.id} value={s.id}>
                    <span className="mr-1 text-muted-foreground tabular-nums">{i + 1}</span>
                    {s.label}
                  </TabsTrigger>
                ))}
              </TabsList>
            </Tabs>
          </div>
          {/* The one scroll region of the panel. */}
          <div
            ref={panelBodyRef}
            className="studio-panel-body min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 pt-4 pb-6"
          >
            {/* The cookie question lands here, not on the canvas (cookie-consent-banner.tsx). */}
            <div
              id={CONSENT_SLOT_ID}
              data-ready={ready ? "" : undefined}
              className="mb-4 empty:hidden"
            />
            <div className="mb-4">
              <h2 className="font-semibold text-foreground text-base">{current.title}</h2>
              <p className="mt-1 text-muted-foreground text-xs">{current.hint}</p>
            </div>
            {step === "look" ? (
              <LookStep
                base={preset.base}
                mode={mode}
                onSelect={(base) => setPreset({ ...preset, base })}
              />
            ) : null}
            {step === "adjust" ? <StudioKnobs preset={preset} onChange={setPreset} /> : null}
            {step === "apply" ? (
              <StudioOutput
                preset={preset}
                rows={tokenRows}
                shareUrl={shareUrl}
                siteUrl={siteUrl}
              />
            ) : null}
            {nextStep ? (
              <Button
                type="button"
                variant="secondary"
                size="sm"
                className="mt-6 w-full"
                onClick={() => goTo(nextStep.id)}
                suffix={<ArrowRight className="size-3.5" />}
              >
                Next: {nextStep.label.toLowerCase()}
              </Button>
            ) : null}
          </div>
        </aside>
        <PreviewCanvas
          preset={preset}
          carrier={carrier}
          mode={mode}
          onModeChange={setMode}
          activeSuite={activeSuite}
          onSuiteChange={setActiveSuite}
          viewport={viewport}
          onViewportChange={setViewport}
          artboardRef={artboardRef}
          catalog={catalog}
        />
      </div>
      <ApplyBar preset={preset} shareUrl={shareUrl} siteUrl={siteUrl} />
    </div>
  );
}
