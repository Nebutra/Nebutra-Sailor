"use client";

import * as AllIcons from "@nebutra/icons";
import { Check, Copy, MagnifyingGlass as Search } from "@nebutra/icons";
import { Button, Input, Slider, ToggleGroup, ToggleGroupItem } from "@nebutra/ui/primitives";
import { cn } from "@nebutra/ui/utils";
import * as React from "react";
import { useCopy } from "@/lib/use-copy";
import {
  CATEGORIES,
  type CategoryId,
  categoryOf,
  type IconStyle,
  importSnippet,
  jsxSnippet,
  searchIcons,
  TONES,
  type ToneId,
  tidySvg,
} from "../app/(foundations)/icons/_lib/icon-catalog";

/**
 * IconBox — the whole @nebutra/icons set as a workbench rather than a list.
 *
 * Search (by the set's names and by the words people type), category, then
 * size / weight / colour applied to every glyph at once, and a click that
 * copies the import line, the React element, or the SVG, as chosen. What is
 * copied is read from what is on screen: the JSX from the controls, the SVG from
 * the rendered element's own markup, so the snippet cannot disagree with the
 * preview.
 */

type IconComponent = React.ComponentType<{
  size?: number | string;
  className?: string;
  stroke?: string;
  strokeWidth?: number;
  overflow?: string;
}>;

// The package also exports a type; only components have a runtime value worth listing.
const ICONS = new Map<string, IconComponent>(
  Object.entries(AllIcons)
    .filter(([name]) => name !== "IconProps")
    .map(([name, icon]) => [name, icon as unknown as IconComponent]),
);
const NAMES = [...ICONS.keys()];

const SIZES = [16, 20, 24, 32, 48] as const;

type CopyFormat = "import" | "react" | "svg";
const FORMATS: { id: CopyFormat; label: string }[] = [
  { id: "import", label: "Import" },
  { id: "react", label: "React" },
  { id: "svg", label: "SVG" },
];

/** SVG props for a weight. Zero passes nothing, so the glyph is the Geist drawing untouched. */
function weightProps(weight: number) {
  return weight > 0
    ? { stroke: "currentColor", strokeWidth: weight, overflow: "visible" }
    : ({} as Record<string, never>);
}

function toneClass(tone: ToneId): string {
  return TONES.find((entry) => entry.id === tone)?.className ?? "";
}

export function IconGallery() {
  const [query, setQuery] = React.useState("");
  const [category, setCategory] = React.useState<CategoryId | "all">("all");
  const [size, setSize] = React.useState<number>(24);
  const [weight, setWeight] = React.useState(0);
  const [tone, setTone] = React.useState<ToneId>("inherit");
  const [format, setFormat] = React.useState<CopyFormat>("import");
  const [selected, setSelected] = React.useState<string | null>(null);
  const [flash, setFlash] = React.useState<{ name: string; label: string } | null>(null);
  const { copy } = useCopy();

  const style: IconStyle = React.useMemo(() => ({ size, weight, tone }), [size, weight, tone]);

  const counts = React.useMemo(() => {
    const byCategory = new Map<string, number>();
    for (const name of NAMES) {
      const id = categoryOf(name);
      byCategory.set(id, (byCategory.get(id) ?? 0) + 1);
    }
    return byCategory;
  }, []);

  const filtered = React.useMemo(() => searchIcons(NAMES, query, category), [query, category]);
  const active = selected && filtered.includes(selected) ? selected : (filtered[0] ?? null);

  const flashTimer = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  React.useEffect(
    () => () => {
      if (flashTimer.current) clearTimeout(flashTimer.current);
    },
    [],
  );

  const handlePick = React.useCallback(
    (name: string, svg: SVGElement | null) => {
      setSelected(name);
      const text =
        format === "import"
          ? importSnippet(name)
          : format === "react"
            ? jsxSnippet(name, style)
            : svg
              ? tidySvg(svg.outerHTML)
              : "";
      if (!text) return;
      void copy(text, name);
      setFlash({ name, label: FORMATS.find((entry) => entry.id === format)?.label ?? "" });
      if (flashTimer.current) clearTimeout(flashTimer.current);
      flashTimer.current = setTimeout(() => setFlash(null), 1600);
    },
    [copy, format, style],
  );

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-4">
        <div className="flex items-center gap-4">
          <div className="relative w-full max-w-md">
            <div className="pointer-events-none absolute inset-y-0 start-0 flex items-center ps-3 text-muted-foreground">
              <Search size={16} />
            </div>
            <Input
              aria-label="Search icons"
              className="h-10 w-full bg-background ps-9 text-foreground"
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search — “close”, “arrow up”"
              value={query}
            />
          </div>
          <p
            aria-live="polite"
            className="m-0 shrink-0 whitespace-nowrap text-muted-foreground text-sm tabular-nums"
          >
            {filtered.length} of {NAMES.length}
          </p>
        </div>

        <div className="-mx-4 overflow-x-auto px-4 pb-1 md:mx-0 md:overflow-visible md:px-0">
          <ToggleGroup
            aria-label="Category"
            className="md:max-w-full md:flex-wrap md:justify-start"
            onValueChange={(value) => {
              if (typeof value === "string" && value) setCategory(value as CategoryId | "all");
            }}
            size="sm"
            type="single"
            value={category}
          >
            <ToggleGroupItem value="all">All {NAMES.length}</ToggleGroupItem>
            {CATEGORIES.map((entry) => (
              <ToggleGroupItem key={entry.id} value={entry.id}>
                {entry.label}
                <span className="text-muted-foreground tabular-nums">{counts.get(entry.id)}</span>
              </ToggleGroupItem>
            ))}
          </ToggleGroup>
        </div>

        <div className="grid gap-x-8 gap-y-4 sm:grid-cols-2">
          <Control label="Size">
            <ToggleGroup
              aria-label="Size"
              onValueChange={(value) => {
                if (typeof value === "string" && value) setSize(Number(value));
              }}
              size="sm"
              type="single"
              value={String(size)}
            >
              {SIZES.map((option) => (
                <ToggleGroupItem key={option} value={String(option)}>
                  {option}
                </ToggleGroupItem>
              ))}
            </ToggleGroup>
          </Control>

          <Control label="Weight">
            <Slider
              aria-label="Weight"
              formatValue={(value: number) => (value === 0 ? "as shipped" : value.toFixed(2))}
              max={1.5}
              min={0}
              onValueChange={(value: number) => setWeight(value)}
              showValue
              step={0.25}
              value={weight}
            />
          </Control>

          <Control label="Colour">
            <ToggleGroup
              aria-label="Colour"
              onValueChange={(value) => {
                if (typeof value === "string" && value) setTone(value as ToneId);
              }}
              size="sm"
              type="single"
              value={tone}
            >
              {TONES.map((option) => (
                <ToggleGroupItem aria-label={option.label} key={option.id} value={option.id}>
                  <span
                    aria-hidden="true"
                    className={cn(
                      "size-3 rounded-full bg-current",
                      option.className ?? "text-foreground",
                    )}
                  />
                  <span className="sr-only">{option.label}</span>
                </ToggleGroupItem>
              ))}
            </ToggleGroup>
          </Control>

          <Control label="A click copies">
            <ToggleGroup
              aria-label="A click copies"
              onValueChange={(value) => {
                if (typeof value === "string" && value) setFormat(value as CopyFormat);
              }}
              size="sm"
              type="single"
              value={format}
            >
              {FORMATS.map((option) => (
                <ToggleGroupItem key={option.id} value={option.id}>
                  {option.label}
                </ToggleGroupItem>
              ))}
            </ToggleGroup>
          </Control>
        </div>
      </div>

      <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_21rem]">
        <div className="min-w-0">
          {/* Cell seams are the 1px gap over the border colour, so every line is one
              hairline — never two adjacent borders doubling up at the joins. */}
          <div className="grid grid-cols-3 gap-px overflow-hidden rounded-panel border border-border bg-border sm:grid-cols-4 md:grid-cols-5">
            {filtered.map((name) => {
              const Icon = ICONS.get(name);
              if (!Icon) return null;
              return (
                <IconCell
                  flashed={flash?.name === name ? flash.label : null}
                  icon={Icon}
                  key={name}
                  name={name}
                  onPick={handlePick}
                  selected={selected === name}
                  size={size}
                  tone={tone}
                  weight={weight}
                />
              );
            })}
            {filtered.length === 0 && (
              <div className="col-span-full bg-card px-6 py-16 text-center text-muted-foreground">
                No icons match “{query}”{category === "all" ? "" : " in this category"}.
              </div>
            )}
          </div>
        </div>

        <aside className="order-first min-w-0 lg:sticky lg:top-24 lg:order-last lg:self-start">
          {active ? (
            <IconDetail
              icon={ICONS.get(active)}
              name={active}
              size={size}
              style={style}
              weight={weight}
            />
          ) : null}
        </aside>
      </div>
    </div>
  );
}

function Control({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex min-w-0 flex-col gap-1.5">
      <span className="text-muted-foreground text-xs">{label}</span>
      <div className="flex min-h-8 items-center overflow-x-auto">{children}</div>
    </div>
  );
}

const IconCell = React.memo(function IconCell({
  name,
  icon: Icon,
  size,
  weight,
  tone,
  selected,
  flashed,
  onPick,
}: {
  name: string;
  icon: IconComponent;
  size: number;
  weight: number;
  tone: ToneId;
  selected: boolean;
  flashed: string | null;
  onPick: (name: string, svg: SVGElement | null) => void;
}) {
  return (
    <Button
      aria-label={name}
      aria-pressed={selected}
      className={cn(
        "group relative h-28 flex-col gap-0 rounded-none bg-card p-3 text-foreground focus-visible:z-10",
        selected && "bg-accent",
      )}
      onClick={(event) => onPick(name, event.currentTarget.querySelector("svg"))}
      variant="ghost"
    >
      <span
        className={cn(
          "mb-2 flex min-h-0 flex-1 items-center justify-center overflow-hidden",
          toneClass(tone),
        )}
      >
        <Icon className="shrink-0" size={size} {...weightProps(weight)} />
      </span>
      <span className="line-clamp-2 w-full whitespace-normal break-all px-1 text-center font-medium text-2xs text-muted-foreground leading-tight transition-colors group-hover:text-current">
        {name}
      </span>

      {flashed ? (
        <span className="absolute inset-0 flex items-center justify-center gap-2 bg-background/80 font-medium text-foreground text-xs backdrop-blur-sm">
          <Check className="text-success-strong" size={16} />
          Copied {flashed}
        </span>
      ) : null}
    </Button>
  );
});

function IconDetail({
  name,
  icon: Icon,
  size,
  weight,
  style,
}: {
  name: string;
  icon: IconComponent | undefined;
  size: number;
  weight: number;
  style: IconStyle;
}) {
  const previewRef = React.useRef<HTMLDivElement>(null);
  const [svg, setSvg] = React.useState("");
  const { copied, copy } = useCopy();

  // The SVG is read back from the rendered element, so it is exactly what the
  // preview shows — size, weight and all.
  // biome-ignore lint/correctness/useExhaustiveDependencies: re-read whenever the drawing changes
  React.useEffect(() => {
    const element = previewRef.current?.querySelector("svg");
    setSvg(element ? tidySvg(element.outerHTML) : "");
  }, [name, size, weight]);

  if (!Icon) return null;

  const category = CATEGORIES.find((entry) => entry.id === categoryOf(name));
  const snippets: { key: string; label: string; text: string }[] = [
    { key: "import", label: "Import", text: importSnippet(name) },
    { key: "react", label: "React", text: jsxSnippet(name, style) },
    { key: "svg", label: "SVG", text: svg },
  ];

  return (
    <div className="flex flex-col overflow-hidden rounded-lg border border-border bg-card">
      <div
        className={cn(
          "flex h-24 items-center justify-center border-border border-b bg-background lg:h-40",
          toneClass(style.tone),
        )}
        ref={previewRef}
      >
        <Icon size={size} {...weightProps(weight)} />
      </div>

      <div className="flex items-start justify-between gap-3 px-4 pt-4">
        <div className="min-w-0">
          <p className="m-0 truncate font-medium text-foreground text-sm">{name}</p>
          <p className="m-0 text-muted-foreground text-xs">{category?.label}</p>
        </div>
        <Button onClick={() => void copy(name, "name")} size="sm" variant="ghost">
          {copied === "name" ? <Check size={14} /> : <Copy size={14} />}
          {copied === "name" ? "Copied" : "Name"}
        </Button>
      </div>

      <div className="flex flex-col gap-2 p-4 lg:gap-3">
        {snippets.map((snippet) => (
          <div className="min-w-0" key={snippet.key}>
            <div className="mb-1 flex items-center justify-between">
              <span className="text-muted-foreground text-xs">{snippet.label}</span>
              <Button
                aria-label={`Copy ${snippet.label} for ${name}`}
                disabled={!snippet.text}
                onClick={() => void copy(snippet.text, snippet.key)}
                size="tiny"
                variant="ghost"
              >
                {copied === snippet.key ? <Check size={12} /> : <Copy size={12} />}
                {copied === snippet.key ? "Copied" : "Copy"}
              </Button>
            </div>
            {/* Below lg the panel sits above the grid; the code stays one tap away via Copy. */}
            <pre className="m-0 hidden max-h-40 overflow-auto whitespace-pre-wrap break-all rounded-md border border-border bg-background p-2.5 font-mono text-foreground text-xs leading-relaxed lg:block">
              <code>{snippet.text || " "}</code>
            </pre>
          </div>
        ))}
      </div>
    </div>
  );
}
