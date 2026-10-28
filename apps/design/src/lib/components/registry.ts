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
  /**
   * When `consumers` was counted, if not on the date in the file header — an
   * entry added later is counted on the day it is added.
   */
  consumersMeasured?: string;
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
    covers: ["Button", "ButtonLink", "buttonVariants"],
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
    group: "primitives",
    entry: "primitives/card.tsx",
    covers: [
      "Card",
      "CardRoot",
      "CardHeader",
      "CardTitle",
      "CardDescription",
      "CardContent",
      "CardBody",
      "CardFooter",
      "CardIcon",
    ],
    consumers: 30,
    blurb:
      "The one card surface — variant, padding, interactive, and parts that read the card's padding. @nebutra/ui/layout and /patterns re-export it.",
    cva: [{ as: "card", name: "cardVariants" }],
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
    slug: "toast",
    name: "Toaster",
    group: "primitives",
    entry: "primitives/toaster.tsx",
    covers: ["Toaster", "toast", "useToasts"],
    consumers: 9,
    consumersMeasured: "2026-10-22",
    blurb:
      "Notifications on top of Sonner. Mount one Toaster, then call useToasts() or toast() from anywhere.",
    axes: [{ as: "tone", file: "primitives/toaster.tsx", kind: "union", name: "ToastTone" }],
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
  {
    slug: "accordion",
    name: "Accordion",
    group: "primitives",
    entry: "primitives/accordion.tsx",
    covers: ["Accordion", "AccordionContent", "AccordionItem", "AccordionTrigger"],
    consumers: 11,
    consumersMeasured: "2026-10-23",
    blurb:
      "Vertically stacked disclosure sections. One or many open, arrow-key navigation between triggers.",
  },
  {
    slug: "collapsible",
    name: "Collapsible",
    group: "primitives",
    entry: "primitives/collapsible.tsx",
    covers: ["Collapsible", "CollapsibleContent", "CollapsibleTrigger"],
    consumers: 6,
    consumersMeasured: "2026-10-23",
    blurb:
      "A single disclosure region with a trigger. The low-level piece Accordion is built from.",
  },
  {
    slug: "breadcrumb",
    name: "Breadcrumb",
    group: "primitives",
    entry: "primitives/breadcrumb.tsx",
    covers: [
      "Breadcrumb",
      "BreadcrumbEllipsis",
      "BreadcrumbItem",
      "BreadcrumbLink",
      "BreadcrumbList",
      "BreadcrumbPage",
      "BreadcrumbSeparator",
    ],
    consumers: 6,
    consumersMeasured: "2026-10-23",
    blurb: "Location trail with a current-page marker and an overflow ellipsis.",
  },
  {
    slug: "pagination",
    name: "Pagination",
    group: "primitives",
    entry: "primitives/pagination.tsx",
    covers: ["Pagination"],
    consumers: 6,
    consumersMeasured: "2026-10-23",
    blurb:
      "Previous and next links with optional titles. It does not render page numbers or an ellipsis.",
  },
  {
    slug: "navigation-menu",
    name: "NavigationMenu",
    group: "primitives",
    entry: "primitives/navigation-menu.tsx",
    covers: [
      "NavigationMenu",
      "NavigationMenuContent",
      "NavigationMenuIndicator",
      "NavigationMenuItem",
      "NavigationMenuLink",
      "NavigationMenuList",
      "NavigationMenuTrigger",
      "NavigationMenuViewport",
    ],
    consumers: 0,
    consumersMeasured: "2026-10-23",
    blurb: "Site-level navigation with hover and keyboard-opened content panels.",
  },
  {
    slug: "menubar",
    name: "Menubar",
    group: "primitives",
    entry: "primitives/menubar.tsx",
    covers: [
      "Menubar",
      "MenubarCheckboxItem",
      "MenubarContent",
      "MenubarGroup",
      "MenubarItem",
      "MenubarLabel",
      "MenubarMenu",
      "MenubarPortal",
      "MenubarRadioGroup",
      "MenubarRadioItem",
      "MenubarSeparator",
      "MenubarShortcut",
      "MenubarSub",
      "MenubarSubContent",
      "MenubarSubTrigger",
      "MenubarTrigger",
    ],
    consumers: 0,
    consumersMeasured: "2026-10-23",
    blurb: "Desktop-style horizontal menu bar. Roving focus across top-level menus.",
  },
  {
    slug: "stepper",
    name: "Stepper",
    group: "primitives",
    entry: "primitives/stepper.tsx",
    covers: [
      "ProgressStepper",
      "Stepper",
      "StepperContent",
      "StepperNavigation",
      "StepperProvider",
    ],
    consumers: 0,
    consumersMeasured: "2026-10-23",
    blurb: "Ordered multi-step flow with per-step status and navigation.",
  },
  {
    slug: "toggle-group",
    name: "ToggleGroup",
    group: "primitives",
    entry: "primitives/toggle-group.tsx",
    covers: ["ToggleGroup", "ToggleGroupItem"],
    cva: [
      { as: "item", name: "toggleGroupItemVariants", file: "primitives/toggle-group-variants.ts" },
    ],
    consumers: 22,
    consumersMeasured: "2026-10-23",
    blurb: "A set of toggle buttons that act as single or multiple selection.",
  },
  {
    slug: "alert-dialog",
    name: "AlertDialog",
    group: "primitives",
    entry: "primitives/alert-dialog.tsx",
    covers: [
      "AlertDialog",
      "AlertDialogAction",
      "AlertDialogCancel",
      "AlertDialogContent",
      "AlertDialogDescription",
      "AlertDialogFooter",
      "AlertDialogHeader",
      "AlertDialogOverlay",
      "AlertDialogPortal",
      "AlertDialogTitle",
      "AlertDialogTrigger",
    ],
    consumers: 3,
    consumersMeasured: "2026-10-23",
    blurb: "Interrupting confirmation modal. Cannot be dismissed by clicking outside.",
  },
  {
    slug: "sheet",
    name: "Sheet",
    group: "primitives",
    entry: "primitives/sheet.tsx",
    covers: [
      "Sheet",
      "SheetBody",
      "SheetClose",
      "SheetContent",
      "SheetDescription",
      "SheetFooter",
      "SheetHeader",
      "SheetOverlay",
      "SheetPortal",
      "SheetTitle",
      "SheetTrigger",
    ],
    consumers: 6,
    consumersMeasured: "2026-10-23",
    blurb: "Edge-anchored modal panel for secondary tasks that keep the page in view.",
  },
  {
    slug: "drawer",
    name: "Drawer",
    group: "primitives",
    entry: "primitives/drawer.tsx",
    covers: [
      "Drawer",
      "DrawerBody",
      "DrawerClose",
      "DrawerContent",
      "DrawerDescription",
      "DrawerFooter",
      "DrawerHeader",
      "DrawerOverlay",
      "DrawerPortal",
      "DrawerTitle",
      "DrawerTrigger",
    ],
    consumers: 5,
    consumersMeasured: "2026-10-23",
    blurb: "Touch-friendly bottom or side panel with drag-to-dismiss.",
  },
  {
    slug: "hover-card",
    name: "HoverCard",
    group: "primitives",
    entry: "primitives/hover-card.tsx",
    covers: ["HoverCard"],
    consumers: 0,
    consumersMeasured: "2026-10-23",
    blurb:
      "Preview card revealed on hover, keyboard focus or a click. Never the only way to reach its content.",
  },
  {
    slug: "context-menu",
    name: "ContextMenu",
    group: "primitives",
    entry: "primitives/context-menu.tsx",
    covers: [
      "ContextMenu",
      "ContextMenuCheckboxItem",
      "ContextMenuContent",
      "ContextMenuGroup",
      "ContextMenuItem",
      "ContextMenuLabel",
      "ContextMenuRadioGroup",
      "ContextMenuRadioItem",
      "ContextMenuRoot",
      "ContextMenuSeparator",
      "ContextMenuShortcut",
      "ContextMenuSub",
      "ContextMenuSubContent",
      "ContextMenuSubTrigger",
      "ContextMenuTrigger",
    ],
    consumers: 0,
    consumersMeasured: "2026-10-23",
    blurb: "Right-click and long-press menu, with the same item model as DropdownMenu.",
  },
  {
    slug: "command",
    name: "Command",
    group: "primitives",
    entry: "primitives/command.tsx",
    covers: [
      "Command",
      "CommandDialog",
      "CommandEmpty",
      "CommandGroup",
      "CommandInput",
      "CommandItem",
      "CommandList",
      "CommandResults",
      "CommandSeparator",
      "CommandShortcut",
    ],
    consumers: 27,
    consumersMeasured: "2026-10-23",
    blurb: "Searchable command list with groups, shortcuts and an optional dialog shell.",
  },
  {
    slug: "checkbox-group",
    name: "CheckboxGroup",
    group: "primitives",
    entry: "primitives/checkbox-group.tsx",
    covers: ["CheckboxGroup"],
    consumers: 1,
    consumersMeasured: "2026-10-23",
    blurb: "Layout and naming wrapper for a set of checkboxes. Each checkbox keeps its own state.",
  },
  {
    slug: "input-otp",
    name: "InputOTP",
    group: "primitives",
    entry: "primitives/input-otp.tsx",
    covers: ["InputOTP", "InputOTPGroup", "InputOTPSeparator", "InputOTPSlot"],
    consumers: 3,
    consumersMeasured: "2026-10-23",
    blurb: "One-time-code entry with per-slot focus, paste support and autofill.",
  },
  {
    slug: "number-field",
    name: "NumberField",
    group: "primitives",
    entry: "primitives/number-field.tsx",
    covers: ["NumberField"],
    consumers: 19,
    consumersMeasured: "2026-10-23",
    blurb: "Numeric input with stepper buttons, clamping and keyboard increments.",
  },
  {
    slug: "date-picker",
    name: "DatePicker",
    group: "primitives",
    entry: "primitives/date-picker.tsx",
    covers: ["DatePicker"],
    consumers: 5,
    consumersMeasured: "2026-10-23",
    blurb: "Single-date entry that opens a calendar. Keyboard and typed input both work.",
  },
  {
    slug: "calendar",
    name: "Calendar",
    group: "primitives",
    entry: "primitives/calendar.tsx",
    covers: ["Calendar"],
    consumers: 8,
    consumersMeasured: "2026-10-23",
    blurb: "Month grid for picking dates, with disabled days and keyboard navigation.",
  },
  {
    slug: "radio-group-card",
    name: "RadioGroupCard",
    group: "primitives",
    entry: "primitives/radio-group-card.tsx",
    covers: ["RadioGroupCard", "RadioGroupCardItem"],
    consumers: 1,
    consumersMeasured: "2026-10-23",
    blurb: "Radio group rendered as selectable cards for plan and option choices.",
  },
  {
    slug: "multiple-selector",
    name: "MultipleSelector",
    group: "primitives",
    entry: "primitives/multiple-selector.tsx",
    covers: ["MultipleSelector"],
    consumers: 1,
    consumersMeasured: "2026-10-23",
    blurb: "Multi-select with removable tokens, async search and creatable values.",
  },
  {
    slug: "dropzone",
    name: "Dropzone",
    group: "primitives",
    entry: "primitives/dropzone.tsx",
    covers: ["Dropzone"],
    consumers: 4,
    consumersMeasured: "2026-10-23",
    blurb: "File drop target with accept rules, size limits and a keyboard-reachable picker.",
  },
  {
    slug: "aspect-ratio",
    name: "AspectRatio",
    group: "primitives",
    entry: "primitives/aspect-ratio.tsx",
    covers: ["AspectRatio"],
    consumers: 0,
    consumersMeasured: "2026-10-23",
    blurb: "Fixed-ratio frame that keeps media from shifting the layout while it loads.",
  },
  {
    slug: "data-list",
    name: "DataList",
    group: "primitives",
    entry: "primitives/data-list.tsx",
    covers: ["DataList"],
    consumers: 4,
    consumersMeasured: "2026-10-23",
    blurb:
      "Shared table-style list with loading, empty and error bodies that hold one reserved height.",
  },
  {
    slug: "resizable",
    name: "ResizablePanelGroup",
    group: "primitives",
    entry: "primitives/resizable.tsx",
    covers: ["ResizableHandle", "ResizablePanel", "ResizablePanelGroup"],
    consumers: 0,
    consumersMeasured: "2026-10-23",
    blurb: "Resizable split panes with drag and keyboard dividers.",
  },
  {
    slug: "scroller",
    name: "Scroller",
    group: "primitives",
    entry: "primitives/scroller.tsx",
    covers: ["Scroller"],
    consumers: 0,
    consumersMeasured: "2026-10-23",
    blurb: "Scroll container with edge fades and optional scroll buttons.",
  },
  {
    slug: "copy-button",
    name: "CopyButton",
    group: "primitives",
    entry: "primitives/copy-button.tsx",
    covers: [
      "CopyableField",
      "CopyButton",
      "CopyCodeButton",
      "CopyIdButton",
      "CopyLinkButton",
      "CopyMenuItem",
    ],
    consumers: 28,
    consumersMeasured: "2026-10-23",
    blurb:
      "Copy-to-clipboard control with a confirmed state, a failure state and a screen-reader announcement.",
  },
  {
    slug: "split-button",
    name: "SplitButton",
    group: "primitives",
    entry: "primitives/split-button.tsx",
    covers: ["SplitButton", "SplitButtonMenuItem"],
    consumers: 1,
    consumersMeasured: "2026-10-23",
    blurb: "Primary action with an attached menu of alternatives.",
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
