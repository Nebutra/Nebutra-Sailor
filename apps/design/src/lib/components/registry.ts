/**
 * Coverage registry for the live component surface.
 *
 * What is hand-written here and what is not:
 *
 *   hand-written — which components have a page, which source file that page
 *                  points at, and which derived axes it should read. Those are
 *                  editorial decisions and there is no honest way to derive
 *                  them.
 *   derived      — the export list the coverage is measured against (see
 *                  `ui-source.ts`), and every variant/size/tone value rendered
 *                  on a page. A new `variant:` key in a cva map appears on the
 *                  next build. A new export appears on the index as a gap.
 *
 * `consumers` is an import-site count across `apps/**` plus
 * `packages/design/docs-shared`, measured 2026-07-30 by counting named imports
 * from `@nebutra/ui*` specifiers. It is a name-grep figure: a name mentioned in
 * a comment counts, a name reached through a re-export chain may not. Treat it
 * as ±2 and as the reason a component is on this list, not as a fact about the
 * component.
 */

export const GROUPS = [
  {
    id: "primitives",
    label: "Primitives",
    barrel: "primitives/index.ts",
    importPath: "@nebutra/ui/primitives",
    note: "Low-level controls and Radix / Base UI wrappers. The default import site for product surfaces.",
  },
  {
    id: "components",
    label: "Components",
    barrel: "components/index.ts",
    importPath: "@nebutra/ui/components",
    note: "Composed patterns and the curated @lobehub/ui compatibility surface.",
  },
  {
    id: "patterns",
    label: "Patterns",
    barrel: "patterns/index.ts",
    importPath: "@nebutra/ui/patterns",
    note: "Multi-part compositions — cards, terminals, dashboards, editors.",
  },
  {
    id: "layout",
    label: "Layout",
    barrel: "layout/index.ts",
    importPath: "@nebutra/ui/layout",
    note: "Page-level scaffolding and the four canonical page states.",
  },
] as const;

export type GroupId = (typeof GROUPS)[number]["id"];

export type AxisKind = "union" | "constArray" | "objectKeys";

export interface AxisRequest {
  /** Key the demo reads it back under. */
  as: string;
  /** Path relative to `packages/design/ui/src`. */
  file: string;
  kind: AxisKind;
  /** Type or const name to extract. */
  name: string;
}

export interface CvaRequest {
  /** Key the demo reads it back under. */
  as: string;
  /** cva export name, e.g. `badgeVariants`. */
  name: string;
  /**
   * File to start from, relative to `packages/design/ui/src`. Defaults to the
   * entry's own file; relative imports are followed one level, which is how
   * `buttonVariants` is found in `button-variants.ts`.
   */
  file?: string;
}

export interface ComponentEntry {
  slug: string;
  /** Primary export the page is about. */
  name: string;
  group: GroupId;
  /** Source file, relative to `packages/design/ui/src`. */
  entry: string;
  /**
   * Exports this page is the documented home of, including compound parts.
   * Used for coverage accounting on the index page.
   */
  covers: string[];
  /** Measured import sites (see file header). */
  consumers: number;
  /** One line on what the component is for. Editorial. */
  blurb: string;
  cva?: CvaRequest[];
  axes?: AxisRequest[];
}

export const COMPONENTS: ComponentEntry[] = [
  {
    slug: "badge",
    name: "Badge",
    group: "primitives",
    entry: "primitives/badge.tsx",
    covers: ["Badge", "badgeVariants"],
    consumers: 149,
    blurb: "Inline status and category label. The most-imported export in the library.",
    cva: [{ as: "badge", name: "badgeVariants" }],
  },
  {
    slug: "button",
    name: "Button",
    group: "primitives",
    entry: "primitives/button.tsx",
    covers: ["Button", "ButtonLink", "BaseButton", "buttonVariants"],
    consumers: 145,
    blurb: "The action control. Carries loading, prefix/suffix and an anchor twin.",
    cva: [{ as: "button", name: "buttonVariants" }],
  },
  {
    slug: "input",
    name: "Input",
    group: "primitives",
    entry: "primitives/input.tsx",
    covers: ["Input"],
    consumers: 87,
    blurb: "Single-line text control with affixes, clear, reveal, shortcut hint and inline error.",
    axes: [{ as: "size", file: "tokens/components/input.ts", kind: "union", name: "InputSize" }],
  },
  {
    slug: "animate-in",
    name: "AnimateIn",
    group: "primitives",
    entry: "primitives/animate-in.tsx",
    covers: ["AnimateIn", "AnimateInGroup", "AnimateSwap"],
    consumers: 58,
    blurb:
      "The only sanctioned entrance animation. Raw motion.div with hand-typed values is banned.",
    axes: [
      { as: "preset", file: "primitives/animate-in.tsx", kind: "objectKeys", name: "PRESETS" },
    ],
  },
  {
    slug: "textarea",
    name: "Textarea",
    group: "primitives",
    entry: "primitives/textarea.tsx",
    covers: ["Textarea"],
    consumers: 34,
    blurb: "Multi-line text control sharing Input's field scale, description and error contract.",
    axes: [
      { as: "size", file: "tokens/components/textarea.ts", kind: "union", name: "TextareaSize" },
    ],
  },
  {
    slug: "card",
    name: "Card",
    group: "patterns",
    entry: "patterns/Card/Card.tsx",
    covers: [
      "Card",
      "CardRoot",
      "CardHeader",
      "CardTitle",
      "CardDescription",
      "CardBody",
      "CardFooter",
      "CardIcon",
    ],
    consumers: 30,
    blurb: "Compound surface container. Note there is a second Card in @nebutra/ui/layout.",
    axes: [
      {
        as: "variant",
        file: "patterns/Card/Card.tsx",
        kind: "objectKeys",
        name: "variantStyles",
      },
      { as: "padding", file: "patterns/Card/Card.tsx", kind: "objectKeys", name: "paddingMap" },
    ],
  },
  {
    slug: "combobox",
    name: "Combobox",
    group: "primitives",
    entry: "primitives/combobox.tsx",
    covers: ["Combobox"],
    consumers: 27,
    blurb: "Searchable single-select. Owns its own loading, empty and error copy.",
    axes: [{ as: "size", file: "primitives/combobox.tsx", kind: "union", name: "ComboboxSize" }],
  },
  {
    slug: "progress",
    name: "Progress",
    group: "primitives",
    entry: "primitives/progress.tsx",
    covers: ["Progress", "progressVariants"],
    consumers: 23,
    blurb: "Determinate and indeterminate progress, with threshold colours and stop markers.",
    cva: [{ as: "progress", name: "progressVariants" }],
  },
  {
    slug: "checkbox",
    name: "Checkbox",
    group: "primitives",
    entry: "primitives/checkbox-group.tsx",
    covers: ["Checkbox", "CheckboxGroup"],
    consumers: 16,
    blurb: "Checkbox and its group wrapper, including the indeterminate state.",
  },
  {
    slug: "label",
    name: "Label",
    group: "primitives",
    entry: "primitives/label.tsx",
    covers: ["Label"],
    consumers: 15,
    blurb:
      "Form label. Carries the peer-disabled styling that makes a disabled row read as disabled.",
  },
  {
    slug: "slider",
    name: "Slider",
    group: "primitives",
    entry: "primitives/slider.tsx",
    covers: ["Slider"],
    consumers: 14,
    blurb: "Single and range slider with a value readout and unit suffix.",
  },
  {
    slug: "page-header",
    name: "PageHeader",
    group: "layout",
    entry: "layout/PageHeader.tsx",
    covers: ["PageHeader"],
    consumers: 14,
    blurb: "Title, description and action slot for the top of a product page.",
  },
  {
    slug: "status-dot",
    name: "StatusDot",
    group: "primitives",
    entry: "primitives/status-dot.tsx",
    covers: ["StatusDot"],
    consumers: 11,
    blurb: "Deployment state indicator. Colour is never the only signal — the label is.",
    axes: [
      { as: "state", file: "primitives/status-dot.tsx", kind: "union", name: "DeploymentState" },
    ],
  },
  {
    slug: "empty-state",
    name: "EmptyState",
    group: "layout",
    entry: "layout/EmptyState.tsx",
    covers: ["EmptyState"],
    consumers: 10,
    blurb:
      "The canonical empty state. Generic 暂无 / no-items-yet copy is lint-banned in apps/web.",
  },
  {
    slug: "toggle",
    name: "Toggle",
    group: "primitives",
    entry: "primitives/toggle.tsx",
    covers: ["Toggle"],
    consumers: 9,
    blurb: "On/off switch with a label. This is the boolean control; Switch is segmented.",
    axes: [
      { as: "size", file: "tokens/components/toggle.ts", kind: "constArray", name: "toggleSizes" },
      {
        as: "color",
        file: "tokens/components/toggle.ts",
        kind: "constArray",
        name: "toggleColors",
      },
    ],
  },
  {
    slug: "radio-group",
    name: "RadioGroup",
    group: "primitives",
    entry: "primitives/radio-group.tsx",
    covers: ["RadioGroup", "RadioGroupItem"],
    consumers: 9,
    blurb: "Exclusive choice group with roving-focus keyboard navigation.",
  },
  {
    slug: "separator",
    name: "Separator",
    group: "primitives",
    entry: "primitives/separator.tsx",
    covers: ["Separator"],
    consumers: 8,
    blurb: "Horizontal and vertical rule. Prefer spacing and a tonal background shift over a line.",
  },
  {
    slug: "loading-state",
    name: "LoadingState",
    group: "layout",
    entry: "layout/LoadingState.tsx",
    covers: ["LoadingState"],
    consumers: 8,
    blurb: "Centred spinner with an optional message, for a whole panel or page region.",
  },
  {
    slug: "alert",
    name: "Alert",
    group: "primitives",
    entry: "primitives/alert.tsx",
    covers: [
      "Alert",
      "AlertIcon",
      "AlertTitle",
      "AlertDescription",
      "AlertContent",
      "AlertToolbar",
      "alertVariants",
    ],
    consumers: 7,
    blurb: "Inline contextual message. Four appearances crossed with seven variants.",
    cva: [{ as: "alert", name: "alertVariants" }],
  },
  {
    slug: "tabs",
    name: "Tabs",
    group: "primitives",
    entry: "primitives/tabs.tsx",
    covers: ["Tabs"],
    consumers: 7,
    blurb: "Controlled tab bar taking a tabs array. Six apps hand-rolled a role=tablist instead.",
    cva: [{ as: "list", name: "tabsListVariants" }],
  },
  {
    slug: "table",
    name: "Table",
    group: "primitives",
    entry: "primitives/table.tsx",
    covers: ["Table"],
    consumers: 6,
    blurb:
      "Compound data table with numeric alignment. 28 files still hand-write raw table markup.",
  },
  {
    slug: "tooltip",
    name: "Tooltip",
    group: "primitives",
    entry: "primitives/tooltip.tsx",
    covers: ["Tooltip", "TooltipTrigger", "TooltipContent", "TooltipProvider"],
    consumers: 6,
    blurb: "Hover and focus hint. Keyboard focus must open it, not just the pointer.",
  },
  {
    slug: "popover",
    name: "Popover",
    group: "primitives",
    entry: "primitives/popover.tsx",
    covers: ["Popover", "PopoverTrigger", "PopoverContent", "PopoverAnchor"],
    consumers: 6,
    blurb: "Anchored overlay with focus trap, Escape and outside-press already handled.",
  },
  {
    slug: "select",
    name: "Select",
    group: "primitives",
    entry: "primitives/select.tsx",
    covers: ["Select", "SelectTrigger", "SelectContent", "SelectItem", "SelectValue"],
    consumers: 5,
    blurb: "Themeable listbox. A raw OS select cannot be themed and is lint-banned in apps.",
    axes: [{ as: "size", file: "tokens/components/select.ts", kind: "union", name: "SelectSize" }],
  },
  {
    slug: "switch",
    name: "Switch",
    group: "primitives",
    entry: "primitives/switch.tsx",
    covers: ["Switch"],
    consumers: 5,
    blurb: "Segmented selector for two or three views of one surface — not a boolean toggle.",
  },
  {
    slug: "avatar",
    name: "Avatar",
    group: "primitives",
    entry: "primitives/avatar.tsx",
    covers: ["Avatar", "AvatarImage", "AvatarFallback"],
    consumers: 5,
    blurb: "User image with letter and placeholder fallbacks, and a broken-source path.",
  },
  {
    slug: "field",
    name: "Field",
    group: "primitives",
    entry: "primitives/field.tsx",
    covers: ["Field"],
    consumers: 5,
    blurb: "Label + description + error wrapper mandated by the form-controls rule in CLAUDE.md.",
  },
  {
    slug: "skeleton",
    name: "Skeleton",
    group: "primitives",
    entry: "primitives/skeleton.tsx",
    covers: ["Skeleton", "SkeletonText", "SkeletonAvatar", "SkeletonCard"],
    consumers: 4,
    blurb: "Loading placeholder that can wrap its own children and swap in when loaded.",
  },
  {
    slug: "spinner",
    name: "Spinner",
    group: "primitives",
    entry: "primitives/spinner.tsx",
    covers: ["Spinner"],
    consumers: 4,
    blurb: "The single canonical loading indicator. The variant prop is deprecated and inert.",
    axes: [
      {
        as: "size",
        file: "tokens/components/spinner.ts",
        kind: "objectKeys",
        name: "spinnerSizes",
      },
      {
        as: "tone",
        file: "tokens/components/spinner.ts",
        kind: "objectKeys",
        name: "spinnerTones",
      },
      { as: "variant", file: "primitives/spinner.tsx", kind: "union", name: "SpinnerVariant" },
    ],
  },
  {
    slug: "dialog",
    name: "Dialog",
    group: "primitives",
    entry: "primitives/dialog.tsx",
    covers: [
      "Dialog",
      "DialogTrigger",
      "DialogContent",
      "DialogHeader",
      "DialogFooter",
      "DialogTitle",
      "DialogDescription",
      "DialogClose",
    ],
    consumers: 3,
    blurb: "Modal surface. Focus trap, Escape and restore-focus come from the primitive.",
  },
  {
    slug: "dropdown-menu",
    name: "DropdownMenu",
    group: "primitives",
    entry: "primitives/dropdown-menu.tsx",
    covers: [
      "DropdownMenu",
      "DropdownMenuTrigger",
      "DropdownMenuContent",
      "DropdownMenuItem",
      "DropdownMenuLabel",
      "DropdownMenuSeparator",
      "DropdownMenuShortcut",
      "DropdownMenuCheckboxItem",
    ],
    consumers: 3,
    blurb: "Menu with typeahead and arrow-key navigation. Seven app menus reimplement this.",
  },
  {
    slug: "kbd",
    name: "Kbd",
    group: "primitives",
    entry: "primitives/kbd.tsx",
    covers: ["Kbd"],
    consumers: 3,
    blurb: "Keyboard shortcut display with platform-aware modifier glyphs.",
  },
  {
    slug: "error-state",
    name: "ErrorState",
    group: "layout",
    entry: "layout/ErrorState.tsx",
    covers: ["ErrorState"],
    consumers: 2,
    blurb: "Panel-level failure state with a retry action and an error id to quote in support.",
  },
];

export const COMPONENTS_BY_SLUG = new Map(COMPONENTS.map((c) => [c.slug, c]));

export function componentsInGroup(group: GroupId): ComponentEntry[] {
  return COMPONENTS.filter((c) => c.group === group).sort((a, b) => b.consumers - a.consumers);
}

/** Every export name claimed by a page, across all groups. */
export function coveredNames(): Set<string> {
  const set = new Set<string>();
  for (const entry of COMPONENTS) {
    for (const name of entry.covers) set.add(name);
  }
  return set;
}

/**
 * The measurement date for `consumers`. Shown on the index so nobody reads a
 * stale ranking as current.
 */
export const CONSUMER_COUNT_MEASURED = "2026-07-30";
