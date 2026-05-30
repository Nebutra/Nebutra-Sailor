"use client";

import {
  BarChart,
  ChartActivity,
  Check,
  ChevronDown,
  Clipboard,
  CloudUpload,
  Command,
  Copy,
  CreditCard,
  GridSquare,
  Layout,
  Moon,
  Plus,
  MagnifyingGlass as Search,
  SettingsSliders,
  ShieldCheck,
  Sparkles,
  Sun,
} from "@nebutra/icons";
import { THEME_REGISTRY, type ThemeRegistryEntry } from "@nebutra/theme/registry";
import {
  Badge,
  Button,
  Input,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Tabs,
  TabsList,
  TabsTrigger,
} from "@nebutra/ui/primitives";
import { cn } from "@nebutra/ui/utils";
import { type CSSProperties, type ReactNode, useMemo, useState } from "react";
import { DesignMdExport } from "./design-md-export";
import { DesignMdImport } from "./design-md-import";
import type { ImportedTheme } from "./design-md-types";
import {
  getPreviewStyleFromTokenSet,
  getSwatchesFromTokenSet,
  getThemePreviewStyle,
  getThemeSwatches,
  getTokenRows,
  type ThemeMode,
} from "./theme-token-data";

type Density = "compact" | "comfortable";
type Surface = "neutral" | "brand" | "product";
type PreviewSuite = "forms" | "pricing" | "dashboard" | "ai-chat" | "charts";
type ViewportId = "1280x800" | "1440x1024" | "390x844";

const viewportSpec: Record<ViewportId, { width: number; label: string }> = {
  "1280x800": { width: 1280, label: "1280 × 800" },
  "1440x1024": { width: 1440, label: "1440 × 1024" },
  "390x844": { width: 390, label: "390 × 844" },
};

const suites: Array<{ id: PreviewSuite; label: string; icon: ReactNode }> = [
  { id: "forms", label: "Forms", icon: <Sparkles /> },
  { id: "pricing", label: "Pricing", icon: <CreditCard /> },
  { id: "dashboard", label: "Dashboard", icon: <Layout /> },
  { id: "ai-chat", label: "AI Chat", icon: <Command /> },
  { id: "charts", label: "Charts", icon: <BarChart /> },
];

const surfaceLabels: Record<Surface, string> = {
  neutral: "Neutral",
  brand: "Brand",
  product: "Product",
};

const densityScale: Record<Density, string> = {
  compact: "text-[13px] [--playground-gap:0.875rem] [--playground-pad:1rem]",
  comfortable: "text-sm [--playground-gap:1.125rem] [--playground-pad:1.25rem]",
};

function CopyButton({ value, label = "Copy" }: { value: string; label?: string }) {
  const [copied, setCopied] = useState(false);

  return (
    <Button
      size="tiny"
      variant="tertiary"
      className="h-7 border-border/70 bg-card/70 px-2 text-[11px]"
      prefix={copied ? <Check /> : <Copy />}
      onClick={async () => {
        await navigator.clipboard.writeText(value);
        setCopied(true);
        window.setTimeout(() => setCopied(false), 1200);
      }}
      type="button"
    >
      {copied ? "Copied" : label}
    </Button>
  );
}

function ThemeSwatches({
  themeId,
  size = "md",
  swatchColors,
}: {
  themeId: string;
  size?: "sm" | "md";
  swatchColors?: string[];
}) {
  const colors = swatchColors ?? getThemeSwatches(themeId);
  return (
    <div className="flex items-center gap-1.5" aria-hidden="true">
      {colors.map((color, i) => (
        <span
          key={`${themeId}-${i}-${color}`}
          className={cn(
            "rounded-[var(--radius-sm)] border border-white/10 shadow-sm",
            size === "sm" ? "size-4" : "size-5",
          )}
          style={{ background: color }}
        />
      ))}
    </div>
  );
}

/** Sentinel ID for the transient imported theme. */
const IMPORTED_THEME_ID = "__imported__";

function ThemeRegistryPanel({
  themes,
  selectedTheme,
  onSelect,
  importedEntry,
  importedSwatches,
  showImport,
  onImportToggle,
  onImported,
}: {
  themes: ThemeRegistryEntry[];
  selectedTheme: ThemeRegistryEntry;
  onSelect: (theme: ThemeRegistryEntry) => void;
  importedEntry: ThemeRegistryEntry | null;
  importedSwatches: string[];
  showImport: boolean;
  onImportToggle: () => void;
  onImported: (theme: ImportedTheme) => void;
}) {
  const [query, setQuery] = useState("");
  const filteredThemes = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    if (!normalized) return themes;
    return themes.filter((theme) =>
      `${theme.name} ${theme.id} ${theme.category} ${theme.mood}`
        .toLowerCase()
        .includes(normalized),
    );
  }, [query, themes]);

  return (
    <aside className="theme-playground-registry flex min-h-0 flex-col border-border/80 border-r bg-card">
      <div className="border-border/70 border-b p-4">
        <div className="mb-3 flex items-center justify-between gap-3">
          <div>
            <h2 className="font-semibold text-foreground text-sm">Theme Registry</h2>
            <p className="mt-1 text-muted-foreground text-xs">Built-in ecosystem themes</p>
          </div>
          <Button
            size="sm"
            variant={showImport ? "secondary" : "outline"}
            className="h-8 border-border/80 bg-background/60"
            prefix={<Plus />}
            type="button"
            onClick={onImportToggle}
            aria-expanded={showImport}
            aria-label="Import DESIGN.md theme"
          >
            {showImport ? "Cancel" : "New"}
          </Button>
        </div>

        {showImport && (
          <div className="mb-3 rounded-[var(--radius-lg)] border border-border bg-background/60 p-3">
            <p className="mb-2 font-medium text-foreground text-xs">Import DESIGN.md</p>
            <DesignMdImport onImported={onImported} />
          </div>
        )}

        <Input
          aria-label="Search themes"
          placeholder="Search themes..."
          value={query}
          onValueChange={setQuery}
          prefix={<Search className="size-4" />}
          shortcut="K"
          size="sm"
        />
      </div>

      <div className="min-h-0 flex-1 space-y-3 overflow-y-auto p-4">
        {/* Transient imported theme — shown at the top when present */}
        {importedEntry !== null && (
          <button
            key={importedEntry.id}
            type="button"
            className={cn(
              "w-full rounded-[var(--radius-lg)] border p-4 text-left transition",
              "bg-background/55 hover:border-primary/50 hover:bg-background/80",
              selectedTheme.id === IMPORTED_THEME_ID
                ? "border-primary/70 shadow-[0_0_0_1px_color-mix(in_oklch,var(--color-primary),transparent_35%)]"
                : "border-border/75",
            )}
            onClick={() => onSelect(importedEntry)}
          >
            <div className="mb-3 flex items-start justify-between gap-3">
              <div>
                <div className="flex items-center gap-2 font-semibold text-foreground text-sm">
                  {importedEntry.name}
                  <Badge variant="blue-subtle" size="sm">
                    imported
                  </Badge>
                </div>
                <div className="mt-1 text-muted-foreground text-xs">Imported via DESIGN.md</div>
              </div>
              {selectedTheme.id === IMPORTED_THEME_ID && (
                <span className="grid size-5 shrink-0 place-items-center rounded-full bg-primary text-primary-foreground">
                  <Check className="size-3" />
                </span>
              )}
            </div>
            <ThemeSwatches themeId={importedEntry.id} swatchColors={importedSwatches} />
          </button>
        )}

        {filteredThemes.map((theme) => {
          const active = theme.id === selectedTheme.id;
          return (
            <button
              key={theme.id}
              type="button"
              className={cn(
                "w-full rounded-[var(--radius-lg)] border p-4 text-left transition",
                "bg-background/55 hover:border-primary/50 hover:bg-background/80",
                active
                  ? "border-primary/70 shadow-[0_0_0_1px_color-mix(in_oklch,var(--color-primary),transparent_35%)]"
                  : "border-border/75",
              )}
              onClick={() => onSelect(theme)}
            >
              <div className="mb-3 flex items-start justify-between gap-3">
                <div>
                  <div className="font-semibold text-foreground text-sm">{theme.name}</div>
                  <div className="mt-1 line-clamp-2 text-muted-foreground text-xs">
                    {theme.mood}
                  </div>
                </div>
                {active && (
                  <span className="grid size-5 shrink-0 place-items-center rounded-full bg-primary text-primary-foreground">
                    <Check className="size-3" />
                  </span>
                )}
              </div>
              <ThemeSwatches themeId={theme.id} />
              <div className="mt-3 flex items-center justify-between gap-2">
                <Badge
                  variant={theme.category === "pro-tools" ? "green-subtle" : "blue-subtle"}
                  size="sm"
                >
                  {theme.category}
                </Badge>
                <Badge variant="outline" size="sm">
                  WCAG {theme.governance.wcag}
                </Badge>
              </div>
            </button>
          );
        })}
      </div>

      <div className="flex items-center justify-between border-border/70 border-t p-4 text-muted-foreground text-xs">
        <span>{themes.length} themes</span>
        <Button
          variant="tertiary"
          size="tiny"
          shape="square"
          aria-label="Registry settings"
          type="button"
        >
          <SettingsSliders />
        </Button>
      </div>
    </aside>
  );
}

function TopBar({
  mode,
  density,
  surface,
  selectedTheme,
  viewingImported,
  onModeChange,
  onDensityChange,
  onSurfaceChange,
}: {
  mode: ThemeMode;
  density: Density;
  surface: Surface;
  selectedTheme: ThemeRegistryEntry;
  viewingImported: boolean;
  onModeChange: (mode: ThemeMode) => void;
  onDensityChange: (density: Density) => void;
  onSurfaceChange: (surface: Surface) => void;
}) {
  return (
    <header className="grid gap-3 border-border/80 border-b bg-background/85 p-3 backdrop-blur-xl sm:p-4 shell:grid-cols-[minmax(0,1fr)_auto] shell:items-center">
      <div className="flex min-w-0 items-center gap-3">
        <div className="min-w-0">
          <h1 className="truncate font-semibold text-base text-foreground">Theme Playground</h1>
          <p className="mt-0.5 hidden text-muted-foreground text-xs sm:block">
            Token governance workbench
          </p>
        </div>
        <Badge variant="outline" className="hidden bg-card/70 font-mono text-[11px] sm:inline-flex">
          <Command className="size-3" /> K
        </Badge>
      </div>

      <div className="flex min-w-0 flex-wrap items-center gap-2 sm:gap-3 shell:col-span-2 shell:justify-end">
        <SegmentedControl
          label="Theme Mode"
          value={mode}
          options={[
            { value: "light", label: "Light", icon: <Sun /> },
            { value: "dark", label: "Dark", icon: <Moon /> },
          ]}
          onChange={onModeChange}
        />
        <SegmentedControl
          label="Density"
          value={density}
          options={[
            { value: "compact", label: "Compact" },
            { value: "comfortable", label: "Comfortable" },
          ]}
          onChange={onDensityChange}
        />
        <label className="flex items-center gap-2 text-muted-foreground text-xs">
          <span>Surface</span>
          <Select value={surface} onValueChange={(value) => onSurfaceChange(value as Surface)}>
            <SelectTrigger size="small" className="h-8 min-w-[120px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {(Object.keys(surfaceLabels) as Surface[]).map((key) => (
                <SelectItem key={key} value={key}>
                  {surfaceLabels[key]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </label>
      </div>

      <div className="flex items-center gap-2 shell:col-start-2 shell:row-start-1 shell:justify-end">
        {!viewingImported && (
          <DesignMdExport themeId={selectedTheme.id} themeName={selectedTheme.name} />
        )}
        <Button size="sm" className="h-8" prefix={<CloudUpload />} type="button">
          Publish Theme
        </Button>
      </div>
    </header>
  );
}

function SegmentedControl<T extends string>({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: T;
  options: Array<{ value: T; label: string; icon?: ReactNode }>;
  onChange: (value: T) => void;
}) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-muted-foreground text-xs">{label}</span>
      <div className="flex rounded-[var(--radius-md)] border border-border bg-muted p-0.5">
        {options.map((option) => (
          <button
            key={option.value}
            type="button"
            className={cn(
              "inline-flex h-7 items-center gap-1.5 rounded-[calc(var(--radius-md)-2px)] px-2.5 font-medium text-xs transition",
              value === option.value
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground",
            )}
            onClick={() => onChange(option.value)}
          >
            {option.icon}
            {option.label}
          </button>
        ))}
      </div>
    </div>
  );
}

function CanvasHeader({
  activeSuite,
  onSuiteChange,
  viewport,
  onViewportChange,
}: {
  activeSuite: PreviewSuite;
  onSuiteChange: (suite: PreviewSuite) => void;
  viewport: ViewportId;
  onViewportChange: (viewport: ViewportId) => void;
}) {
  return (
    <div className="grid gap-3 border-border/70 border-b p-4 tight:grid-cols-[minmax(0,1fr)_auto_auto] tight:items-center">
      <div>
        <h2 className="font-semibold text-foreground text-sm">Live Preview Canvas</h2>
        <p className="mt-1 text-muted-foreground text-xs">
          Same semantic suite, different token payload.
        </p>
      </div>
      <div className="min-w-0 overflow-x-auto">
        <Tabs
          value={activeSuite}
          size="sm"
          onValueChange={(value) => onSuiteChange(value as PreviewSuite)}
        >
          <TabsList className="min-w-max border border-border bg-card/80">
            {suites.map((suite) => (
              <TabsTrigger key={suite.id} value={suite.id}>
                <span className="inline-flex items-center gap-1.5">
                  {suite.icon}
                  {suite.label}
                </span>
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
      </div>
      <Select value={viewport} onValueChange={(v) => onViewportChange(v as ViewportId)}>
        <SelectTrigger size="small" className="h-8 min-w-[120px]">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {(Object.keys(viewportSpec) as ViewportId[]).map((id) => (
            <SelectItem key={id} value={id}>
              {viewportSpec[id].label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

function PreviewCanvas({
  theme,
  mode,
  density,
  surface,
  activeSuite,
  onSuiteChange,
  viewport,
  onViewportChange,
  styleOverride,
}: {
  theme: ThemeRegistryEntry;
  mode: ThemeMode;
  density: Density;
  surface: Surface;
  activeSuite: PreviewSuite;
  onSuiteChange: (suite: PreviewSuite) => void;
  viewport: ViewportId;
  onViewportChange: (viewport: ViewportId) => void;
  styleOverride?: CSSProperties;
}) {
  const style = styleOverride ?? getThemePreviewStyle(theme.id, mode);
  const viewportWidth = viewportSpec[viewport].width;

  // Tailwind v4 in this app uses `@theme inline { --color-*: hsl(var(--*)) }`,
  // which inlines the value into the utility — so `bg-background` reads `--background`
  // directly, NOT `--color-background`. Theme JSON stores oklch values that can't live
  // inside `hsl(...)`. Solution: inside the preview, bypass the indirection and read
  // `var(--color-*)` straight from the wrapper's inline style.
  return (
    <section className="theme-preview-canvas min-h-0 min-w-0 bg-background/55">
      <CanvasHeader
        activeSuite={activeSuite}
        onSuiteChange={onSuiteChange}
        viewport={viewport}
        onViewportChange={onViewportChange}
      />
      <div className="h-full min-h-[680px] overflow-auto p-4">
        {/* Viewport frame — centered, max-width clamps to selected device width.
            Switching the dropdown actually resizes the inner canvas. */}
        <div
          data-theme={theme.id}
          data-mode={mode}
          data-surface={surface}
          style={{ ...style, maxWidth: `${viewportWidth}px` }}
          className={cn(
            "mx-auto min-h-[640px] w-full overflow-hidden rounded-[var(--radius-lg)] bg-[var(--color-background)] text-[color:var(--color-foreground)] transition-[max-width] duration-200",
            densityScale[density],
          )}
        >
          <div className="theme-preview-grid gap-[var(--playground-gap)] p-[var(--playground-pad)]">
            <FormsPanel active={activeSuite === "forms"} />
            <PricingPanel active={activeSuite === "pricing"} />
            <DashboardPanel active={activeSuite === "dashboard"} />
            <AiChatPanel active={activeSuite === "ai-chat"} />
            <ChartsPanel active={activeSuite === "charts"} />
          </div>
        </div>
      </div>
    </section>
  );
}

function PreviewCard({
  title,
  active,
  className,
  children,
}: {
  title: string;
  active?: boolean;
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
        "rounded-[var(--radius-lg)] bg-[var(--color-card)] p-[var(--playground-pad)] text-[color:var(--color-card-foreground)]",
        "shadow-[0_0_0_1px_var(--edge-soft),0_2px_8px_-2px_rgb(0_0_0/0.08)]",
        active && "shadow-[0_0_0_1px_var(--edge-medium),0_4px_12px_-2px_rgb(0_0_0/0.12)]",
        className,
      )}
    >
      <div className="mb-3 flex items-center justify-between gap-3">
        <h3 className="font-semibold text-sm">{title}</h3>
        {active && <Badge size="sm">Focused</Badge>}
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
  return (
    <label className="grid gap-1.5">
      <span className="font-medium text-[11px] text-[color:var(--color-foreground)]">{label}</span>
      {/* theme preview: bespoke recessed-well style, must bypass primitive */}
      <input
        data-allow-native
        type={type}
        readOnly
        value={value}
        // Recessed well, not an outlined box — inset 1px hint + a tiny top inset
        // shadow simulates "input pressed into the surface". Reads as soft and
        // affordant; no hard outline anywhere.
        // Input bg matches the card so there's NO color step at the edge —
        // the inset top shadow alone signals "pressed well". Top shadow is
        // visible on light (black on white) and reads as subtle depression on
        // dark (black-on-dark gives a faint inner darkening at the top edge).
        className="h-9 rounded-[var(--radius-md)] bg-[var(--color-card)] px-3 text-[color:var(--color-foreground)] text-xs outline-none shadow-[inset_0_1px_2px_0_rgb(0_0_0/0.18)]"
      />
    </label>
  );
}

function FormsPanel({ active }: { active: boolean }) {
  return (
    <PreviewCard title="Create an account" active={active} className="theme-preview-span-5">
      <p className="mb-4 text-[color:var(--color-muted-foreground)] text-xs">
        Start building in seconds.
      </p>
      <div className="grid gap-3">
        <FormInput label="Full name" value="Ava Johnson" />
        <FormInput label="Email" value="ava.johnson@example.com" />
        <FormInput label="Password" value="************" type="password" />
        <div className="flex items-center gap-2 text-[color:var(--color-muted-foreground)] text-xs">
          <span className="grid size-4 place-items-center rounded-[var(--radius-sm)] bg-[var(--color-primary)] text-[color:var(--color-primary-foreground)]">
            <Check className="size-3" />
          </span>
          I agree to the Terms of Service and Privacy Policy
        </div>
        <button
          className="h-10 rounded-[var(--radius-md)] bg-[var(--color-primary)] px-4 font-medium text-[color:var(--color-primary-foreground)] text-sm shadow-[var(--shadow-md)]"
          type="button"
        >
          Create account
        </button>
      </div>
    </PreviewCard>
  );
}

function PricingPanel({ active }: { active: boolean }) {
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
    <PreviewCard title="Choose your plan" active={active} className="theme-preview-span-7">
      <div className="theme-pricing-grid gap-3">
        {plans.map((plan) => (
          <div
            key={plan.name}
            className={cn(
              // Sub-tier: hairline border + bg-popover (one tier up from card,
              // ~0.05 L delta = visibly raised). Same Linear pattern.
              "relative rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-popover)] p-4",
              plan.popular && "shadow-[0_2px_8px_-2px_rgb(0_0_0/0.15)]",
            )}
          >
            {plan.popular && (
              <Badge className="-top-3 -translate-x-1/2 absolute left-1/2" size="sm">
                Most popular
              </Badge>
            )}
            <div className="font-semibold text-sm">{plan.name}</div>
            <div className="mt-3 flex items-end gap-1">
              <span className="font-bold text-2xl">{plan.price}</span>
              <span className="text-[color:var(--color-muted-foreground)] text-xs">/month</span>
            </div>
            <ul className="mt-4 space-y-2 text-xs">
              {plan.items.map((item) => (
                <li
                  key={item}
                  className="flex items-center gap-2 text-[color:var(--color-muted-foreground)]"
                >
                  <Check className="size-3 text-[color:var(--color-primary)]" />
                  {item}
                </li>
              ))}
            </ul>
            <button
              className={cn(
                "mt-5 min-h-9 w-full rounded-[var(--radius-md)] px-2 py-1.5 text-center font-medium text-xs leading-tight",
                plan.popular
                  ? "bg-[var(--color-primary)] text-[color:var(--color-primary-foreground)]"
                  : "bg-[var(--color-card)] text-[color:var(--color-card-foreground)]",
              )}
              type="button"
            >
              {plan.popular ? "Choose Pro" : "Get started"}
            </button>
          </div>
        ))}
      </div>
    </PreviewCard>
  );
}

function DashboardPanel({ active }: { active: boolean }) {
  const stats = [
    ["Total Projects", "24", "12%"],
    ["Active Users", "1,248", "8%"],
    ["API Requests", "98.4K", "15%"],
    ["Revenue", "$12.6K", "18%"],
  ];

  return (
    <PreviewCard title="Project Overview" active={active} className="theme-preview-span-7">
      {/* Stat tiles: no own bg — blend into parent card. Spacing + typography hierarchy alone. */}
      <div className="theme-stats-grid gap-x-6 gap-y-3">
        {stats.map(([label, value, delta]) => (
          <div key={label} className="p-1">
            <div className="text-[color:var(--color-muted-foreground)] text-[11px]">{label}</div>
            <div className="mt-1 font-bold text-lg">{value}</div>
            <div className="mt-1 text-[11px] text-[color:var(--color-success)]">
              +{delta} vs last 7 days
            </div>
          </div>
        ))}
      </div>
      {/* Project list: no own bg — rows separated by faint divider lines only. */}
      <div className="mt-4">
        {["Nebutra Marketing", "Design System v2", "AI Assistant", "Analytics Pipeline"].map(
          (project, index) => (
            <div
              key={project}
              className="grid grid-cols-[1fr_auto_auto] items-center gap-3 border-[color-mix(in_oklab,var(--color-foreground),transparent_94%)] border-b py-2.5 last:border-b-0"
            >
              <span className="font-medium text-xs">{project}</span>
              <Badge variant={index === 3 ? "purple-subtle" : "green-subtle"} size="sm">
                {index === 3 ? "Paused" : "Active"}
              </Badge>
              <span className="text-[color:var(--color-muted-foreground)] text-[11px]">
                {index + 1}d ago
              </span>
            </div>
          ),
        )}
      </div>
    </PreviewCard>
  );
}

function AiChatPanel({ active }: { active: boolean }) {
  return (
    <PreviewCard title="AI Assistant" active={active} className="theme-preview-span-5">
      <div className="mb-4 flex items-center gap-2">
        <span className="grid size-7 place-items-center rounded-full bg-[color-mix(in_oklch,var(--color-primary),transparent_85%)] text-[color:var(--color-primary)]">
          <Sparkles className="size-4" />
        </span>
        <div>
          <div className="font-medium text-xs">Nebutra Agent</div>
          <div className="text-[11px] text-[color:var(--color-success)]">Online</div>
        </div>
      </div>
      <div className="ml-auto max-w-[72%] rounded-[var(--radius-lg)] bg-[var(--color-primary)] p-3 text-[color:var(--color-primary-foreground)] text-xs">
        Can you help me analyze last month's growth?
      </div>
      {/* Assistant message bubble: foreground-mix at 6% — barely visible halo
          that hints "this is a bubble" without forming a hard rectangle. */}
      <div className="mt-3 max-w-[78%] rounded-[var(--radius-lg)] bg-[color-mix(in_oklab,var(--color-foreground),transparent_94%)] p-3 text-xs">
        Sure. Growth improved across activation and retention. I attached the report.
        <div className="mt-3 flex items-center justify-between rounded-[var(--radius-md)] bg-[color-mix(in_oklab,var(--color-foreground),transparent_92%)] p-2">
          <span className="font-mono text-[11px]">growth-report.pdf</span>
          <Clipboard className="size-3 text-[color:var(--color-muted-foreground)]" />
        </div>
      </div>
      <div className="mt-4 flex gap-2">
        {["Retention", "Region", "Revenue"].map((item) => (
          <button
            key={item}
            className="rounded-full bg-[color-mix(in_oklab,var(--color-foreground),transparent_94%)] px-3 py-1 text-[color:var(--color-muted-foreground)] text-[11px]"
            type="button"
          >
            {item}
          </button>
        ))}
      </div>
    </PreviewCard>
  );
}

function ChartsPanel({ active }: { active: boolean }) {
  return (
    <PreviewCard title="Charts" active={active} className="theme-preview-span-12">
      <div className="grid gap-3 lg:grid-cols-3">
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
    <div className="p-1">
      <div className="mb-4 flex items-start justify-between">
        <div>
          <div className="font-medium text-xs">{title}</div>
          <div className="mt-1 font-bold text-lg">{value}</div>
        </div>
        <Badge variant="green-subtle" size="sm">
          +12.5%
        </Badge>
      </div>
      <div className="relative h-28 overflow-hidden p-1">
        {variant === "bar" ? (
          <div className="flex h-full items-end gap-3">
            {bars.map((height) => (
              <span
                key={`${title}-${height}`}
                className="flex-1 rounded-t-[var(--radius-sm)] bg-[color-mix(in_oklch,var(--color-primary),transparent_20%)]"
                style={{ height: `${height}%` }}
              />
            ))}
          </div>
        ) : (
          <>
            <div className="absolute inset-x-3 bottom-3 h-[38%] rounded-t-full bg-[color-mix(in_oklch,var(--color-primary),transparent_85%)] blur-sm" />
            <svg
              className="absolute inset-3 size-[calc(100%-1.5rem)]"
              viewBox="0 0 320 120"
              role="img"
              aria-label={`${title} trend`}
            >
              <path
                d="M0 88 C42 74 56 48 98 54 C146 60 156 28 204 38 C250 47 258 20 320 24"
                fill="none"
                stroke="var(--color-primary)"
                strokeLinecap="round"
                strokeWidth="5"
              />
              {variant === "area" && (
                <path
                  d="M0 88 C42 74 56 48 98 54 C146 60 156 28 204 38 C250 47 258 20 320 24 L320 120 L0 120 Z"
                  fill="color-mix(in oklch, var(--color-primary), transparent 78%)"
                />
              )}
            </svg>
          </>
        )}
      </div>
    </div>
  );
}

function TokenInspector({
  theme,
  mode,
  onThemeChange,
}: {
  theme: ThemeRegistryEntry;
  mode: ThemeMode;
  onThemeChange: (theme: ThemeRegistryEntry) => void;
}) {
  const rows = getTokenRows(theme.id, mode);
  const cliCommand = `nebutra theme inspect ${theme.id} --format json`;

  return (
    <aside className="theme-playground-inspector flex min-h-0 flex-col border-border/80 border-l bg-card">
      <div className="flex items-center justify-between border-border/70 border-b p-4">
        <div>
          <h2 className="font-semibold text-foreground text-sm">Token Inspector</h2>
          <p className="mt-1 text-muted-foreground text-xs">Registry, CLI and Figma governance</p>
        </div>
        <Button
          variant="tertiary"
          size="tiny"
          shape="square"
          aria-label="Close inspector"
          type="button"
        >
          <ChevronDown />
        </Button>
      </div>

      <div className="min-h-0 flex-1 space-y-4 overflow-y-auto p-4">
        <label className="grid gap-2 text-xs">
          <span className="font-medium text-muted-foreground">Theme</span>
          <Select
            value={theme.id}
            onValueChange={(value) => {
              const nextTheme = THEME_REGISTRY.themes.find((item) => item.id === value);
              if (nextTheme) onThemeChange(nextTheme);
            }}
          >
            <SelectTrigger className="h-9">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {THEME_REGISTRY.themes.map((item) => (
                <SelectItem key={item.id} value={item.id}>
                  {item.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </label>

        <InspectorBlock
          title="CSS Variables"
          action={
            <CopyButton
              value={rows.map((row) => `${row.name}: ${row.value};`).join("\n")}
              label="Copy all"
            />
          }
        >
          <div className="space-y-2">
            {rows.slice(0, 9).map((row) => (
              <div
                key={row.name}
                className="grid grid-cols-[1rem_minmax(0,1fr)] items-center gap-2 text-xs"
              >
                <span
                  className="size-4 rounded-[var(--radius-sm)] border border-border"
                  style={{ background: row.value }}
                />
                <div className="min-w-0">
                  <div className="truncate font-mono text-foreground">{row.name}</div>
                  <div className="truncate font-mono text-muted-foreground text-[11px]">
                    {row.value}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </InspectorBlock>

        <InspectorBlock title="DTCG Token Path" action={<CopyButton value={theme.tokenPath} />}>
          <code className="block rounded-[var(--radius-md)] border border-border bg-background p-3 font-mono text-[11px] text-muted-foreground">
            themes.{theme.id}.colors.primary
          </code>
        </InspectorBlock>

        <InspectorBlock title="CLI" action={<CopyButton value={cliCommand} />}>
          <code className="block rounded-[var(--radius-md)] border border-border bg-background p-3 font-mono text-[11px] text-muted-foreground">
            {cliCommand}
          </code>
        </InspectorBlock>

        <div className="rounded-[var(--radius-lg)] border border-border bg-background p-4">
          <div className="mb-3 flex items-center justify-between">
            <div>
              <div className="font-semibold text-sm">Contrast Score</div>
              <div className="text-muted-foreground text-xs">Normal text baseline</div>
            </div>
            <Badge variant="green-subtle" icon={<ShieldCheck />}>
              WCAG 2.1 AA
            </Badge>
          </div>
          <div className="flex items-end gap-2">
            <span className="font-bold text-2xl text-success">AA</span>
            <span className="font-semibold text-lg">6.21:1</span>
            <Badge variant="success" size="sm">
              Pass
            </Badge>
          </div>
        </div>

        <div className="rounded-[var(--radius-lg)] border border-border bg-background p-4">
          <div className="mb-4 flex items-center gap-3">
            <span className="grid size-8 place-items-center rounded-[var(--radius-md)] bg-primary/15 text-primary">
              <GridSquare className="size-4" />
            </span>
            <div>
              <div className="font-semibold text-sm">Figma Sync</div>
              <div className="text-muted-foreground text-xs">Synced 2 minutes ago</div>
            </div>
          </div>
          <div className="space-y-2 text-xs">
            {["Tokens updated", "Styles generated", "Variables synced"].map((item) => (
              <div key={item} className="flex items-center gap-2 text-muted-foreground">
                <Check className="size-3 text-success" />
                {item}
              </div>
            ))}
          </div>
          <Button
            variant="outline"
            size="sm"
            className="mt-4 w-full border-border bg-card"
            prefix={<ChartActivity />}
            type="button"
          >
            Sync now
          </Button>
        </div>
      </div>
    </aside>
  );
}

function InspectorBlock({
  title,
  action,
  children,
}: {
  title: string;
  action?: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className="rounded-[var(--radius-lg)] border border-border bg-background p-4">
      <div className="mb-3 flex items-center justify-between gap-3">
        <h3 className="font-medium text-muted-foreground text-xs">{title}</h3>
        {action}
      </div>
      {children}
    </div>
  );
}

/** Build a ThemeRegistryEntry shell from an ImportedTheme so the panel can render swatches. */
function makeImportedRegistryEntry(imported: ImportedTheme): ThemeRegistryEntry {
  return {
    id: IMPORTED_THEME_ID,
    name: `Imported · ${imported.name}`,
    mood: "Imported via DESIGN.md",
    category: "imported",
    tokenPath: "",
    install: { command: "", registryUrl: "" },
    compatibility: {
      tailwind: "4",
      cssVariables: true,
      figmaVariables: false,
      shadcnRegistry: false,
    },
    governance: { wcag: "AA", requiredTokens: [], visualSuites: [] },
  };
}

export function ThemePlaygroundWorkbench() {
  const [selectedTheme, setSelectedTheme] = useState<ThemeRegistryEntry>(() => {
    const defaultTheme =
      THEME_REGISTRY.themes.find((theme) => theme.id === THEME_REGISTRY.defaultTheme) ??
      THEME_REGISTRY.themes[0];
    if (!defaultTheme) {
      throw new Error("Theme registry is empty.");
    }
    return defaultTheme;
  });
  const [mode, setMode] = useState<ThemeMode>("dark");
  const [density, setDensity] = useState<Density>("comfortable");
  const [surface, setSurface] = useState<Surface>("neutral");
  const [activeSuite, setActiveSuite] = useState<PreviewSuite>("forms");
  const [viewport, setViewport] = useState<ViewportId>("1280x800");

  // DESIGN.md import state
  const [importedTheme, setImportedTheme] = useState<ImportedTheme | null>(null);
  const [showImport, setShowImport] = useState(false);

  const viewingImported = selectedTheme.id === IMPORTED_THEME_ID;

  const importedEntry = importedTheme !== null ? makeImportedRegistryEntry(importedTheme) : null;

  const importedSwatches =
    importedTheme !== null ? getSwatchesFromTokenSet(importedTheme.tokenSet) : [];

  // Compute override style when the imported theme is selected
  const importedPreviewStyle =
    viewingImported && importedTheme !== null
      ? getPreviewStyleFromTokenSet(importedTheme.tokenSet, mode)
      : undefined;

  function handleImported(theme: ImportedTheme) {
    setImportedTheme(theme);
    setSelectedTheme(makeImportedRegistryEntry(theme));
    // Do NOT close the import panel — the report (missingRequired / unmapped /
    // warnings) must remain visible so the user knows what was dropped.
    // The user closes the panel manually via the "Cancel" / "New" toggle.
  }

  return (
    <div className="theme-playground-frame flex min-h-[calc(100vh-7rem)] flex-col overflow-hidden rounded-[var(--radius-lg)] border border-border bg-background text-foreground shadow-sm">
      <TopBar
        mode={mode}
        density={density}
        surface={surface}
        selectedTheme={selectedTheme}
        viewingImported={viewingImported}
        onModeChange={setMode}
        onDensityChange={setDensity}
        onSurfaceChange={setSurface}
      />
      <main className="theme-playground-layout min-h-0 flex-1 overflow-hidden border-border/70 border-t">
        <ThemeRegistryPanel
          themes={THEME_REGISTRY.themes}
          selectedTheme={selectedTheme}
          onSelect={setSelectedTheme}
          importedEntry={importedEntry}
          importedSwatches={importedSwatches}
          showImport={showImport}
          onImportToggle={() => setShowImport((v) => !v)}
          onImported={handleImported}
        />
        <PreviewCanvas
          theme={selectedTheme}
          mode={mode}
          density={density}
          surface={surface}
          activeSuite={activeSuite}
          onSuiteChange={setActiveSuite}
          viewport={viewport}
          onViewportChange={setViewport}
          styleOverride={importedPreviewStyle}
        />
        <TokenInspector theme={selectedTheme} mode={mode} onThemeChange={setSelectedTheme} />
      </main>
    </div>
  );
}
