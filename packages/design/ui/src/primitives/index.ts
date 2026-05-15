/**
 * UI Primitives
 *
 * Low-level layout, spacing, and accessibility primitives,
 * plus Radix-based UI components (Accordion, Avatar, Badge, Button, etc.).
 *
 * Note: For typography, use the dedicated `typography/` module instead.
 */

export * from "./accessibility";
// ─── Radix-based UI components ───────────────────────────────────────────────
export {
  Accordion,
  AccordionContent,
  AccordionItem,
  type AccordionSize,
  AccordionTrigger,
} from "./accordion";
export * from "./agent-plan";
export * from "./alert";
export * from "./alert-dialog";
/**
 * @registry https://ui.nebutra.com/r/animate-in.json
 * @distribution dual-track (npm + shadcn registry) until 2026-11-09.
 *   npm remains canonical for monorepo apps; registry serves external customers
 *   via `npx shadcn@latest add ...`. See docs/architecture/2026-05-14-registry-dual-track-distribution.md.
 */
export * from "./animate-in";
export * from "./animated-beam";
export * from "./animated-circular-progress-bar";
export * from "./animated-gradient-text";
export * from "./animated-group";
export * from "./animated-hike-card";
export * from "./animated-list";
export * from "./animated-shiny-text";
export * from "./announcement";
export * from "./apple-liquid-glass-switcher";
export * from "./aspect-ratio";
export * from "./assisted-password-confirmation";
export * from "./aurora-background";
export * from "./aurora-text";
export {
  Avatar,
  AvatarFallback,
  type AvatarFallbackProps,
  AvatarGroup,
  type AvatarGroupItem,
  type AvatarGroupProps,
  AvatarImage,
  type AvatarProps,
} from "./avatar";
export * from "./avatar-circles";
export {
  AvatarWithIcon,
  type AvatarWithIconProps,
  BitbucketAvatar,
  type BitbucketAvatarProps,
  DiceBearAvatar,
  type DiceBearAvatarProps,
  type DiceBearStyle,
  GitHubAvatar,
  type GitHubAvatarProps,
  GitLabAvatar,
  type GitLabAvatarProps,
} from "./avatar-extended";
export * from "./avatar-smart-group";
export * from "./awards";
export { Badge, type BadgeProps, badgeVariants } from "./badge";
export * from "./badge-1";
export * from "./base-badge";
export * from "./base-button";
/**
 * @registry https://ui.nebutra.com/r/bento-grid.json
 * @distribution dual-track (npm + shadcn registry) until 2026-11-09.
 *   npm remains canonical for monorepo apps; registry serves external customers
 *   via `npx shadcn@latest add ...`. See docs/architecture/2026-05-14-registry-dual-track-distribution.md.
 */
export * from "./bento-grid";
export * from "./book";
export * from "./border-trail";
export * from "./box";
export * from "./brand-mark";
export * from "./breadcrumb";
export * from "./browser-mockup";
export * from "./bubble-text";
// Dashboard patterns (migrated from production)
export * from "./bulk-action-bar";
export {
  Button,
  ButtonLink,
  type ButtonLinkProps,
  type ButtonProps,
  buttonVariants,
} from "./button";
export * from "./canvas-reveal-effect";
export * from "./card";
export * from "./card-spotlight";
export * from "./carousel";
// export * from "./change-password-form";
/**
 * @registry https://ui.nebutra.com/r/chart.json
 * @distribution dual-track (npm + shadcn registry) until 2026-11-09.
 *   npm remains canonical for monorepo apps; registry serves external customers
 *   via `npx shadcn@latest add ...`. See docs/architecture/2026-05-14-registry-dual-track-distribution.md.
 */
export * from "./chart";
export {
  Checkbox,
  CheckboxGroup,
  type CheckboxGroupProps,
  type CheckboxProps,
} from "./checkbox-group";
export * from "./choicebox";
export * from "./code-block";
/**
 * Geist-style flat Collapse / CollapseGroup API on top of Accordion.
 * Use when consumers expect the Geist surface (title prop + defaultExpanded
 * + multiple group); use Accordion directly when you need the Radix tree.
 */
export * from "./collapse";
export * from "./collapsible";
export * from "./color-badge";
export {
  Combobox,
  ComboboxEmpty,
  ComboboxGroupSub,
  ComboboxInput,
  ComboboxList,
  type ComboboxOption,
  ComboboxOptionItem,
  type ComboboxProps,
  ComboboxRoot,
  ComboboxSeparator,
} from "./combobox";
export * from "./command";
/**
 * @registry https://ui.nebutra.com/r/command-menu.json
 * @distribution dual-track (npm + shadcn registry) until 2026-11-09.
 *   npm remains canonical for monorepo apps; registry serves external customers
 *   via `npx shadcn@latest add ...`. See docs/architecture/2026-05-14-registry-dual-track-distribution.md.
 */
export * from "./command-menu";
export * from "./confetti";
export * from "./confirm-dialog";
export * from "./context-card";
export * from "./context-menu";
export * from "./copy-button";
export * from "./description";
export {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogOverlay,
  DialogPortal,
  DialogTitle,
  DialogTrigger,
} from "./dialog";
export * from "./display-cards";
export * from "./dithering-background";
export * from "./dithering-shader";
export * from "./dot-pattern";
export * from "./dotted-map";
export * from "./dotted-world-map";
export * from "./drawer";
export * from "./dropdown-menu";
/**
 * @registry https://ui.nebutra.com/r/dynamic-island-toc.json
 * @distribution dual-track (npm + shadcn registry) from 2026-05-14.
 *   First primitive landed under the 2026-05-14 registry policy.
 *   Self-contained, distinctive visual IP, no transitive @nebutra deps.
 *   See docs/architecture/2026-05-14-registry-dual-track-distribution.md.
 */
export * from "./dynamic-island-toc";
/**
 * @registry https://ui.nebutra.com/r/edit-tool.json
 * @distribution dual-track (npm + shadcn registry) from 2026-05-14.
 *   Inline AI tool-call rendering for file edits (Cursor / Claude Code style).
 *   Composed from TextShimmer + LoadingDots primitives.
 *   See docs/architecture/2026-05-14-registry-dual-track-distribution.md.
 */
export * from "./edit-tool";
export * from "./enable-2fa-card";
export * from "./entity";
export * from "./error-boundary";
export * from "./error-message";
export * from "./expandable-gallery";
export * from "./expandable-tabs";
export * from "./expanding-textarea";
export * from "./fallback-card";
export * from "./feature-arrow-card";
/**
 * @registry https://ui.nebutra.com/r/feature-card.json
 * @distribution dual-track (npm + shadcn registry) until 2026-11-09.
 *   npm remains canonical for monorepo apps; registry serves external customers
 *   via `npx shadcn@latest add ...`. See docs/architecture/2026-05-14-registry-dual-track-distribution.md.
 */
export * from "./feature-card";
export * from "./feature-check-item";
export * from "./feature-gate";
export * from "./feature-icon-item";
export * from "./feedback";
export * from "./field";
/**
 * Chip / thumbnail display for an attached file. Use in chat composers,
 * message bubbles, or attachment lists. Distinct from the chat tool-family
 * — this renders *user input* (uploaded files), not AI output. Removable
 * variant is keyboard-accessible (focus-visible reveal, not hover-only).
 */
export * from "./file-attachment";
/**
 * Decorative file-format card with colored banner + content placeholder.
 * Sibling of Folder (decorative tile family). 26 format banners are
 * categorical labels — raw Tailwind palette is correct here per the same
 * reasoning as Folder. Always aria-hidden (no interactivity).
 */
export * from "./file-card";
// Pill-style category filter (MiniMax / GPT Store discovery row)
export * from "./filter-pills";
export * from "./flex";
export * from "./flickering-grid";
/**
 * Decorative animated folder with hover-reveal papers. Renders as aria-hidden
 * <div> by default; becomes a real <button> with keyboard support when
 * `onClick` is provided. Colors are categorical labels (red folder / yellow
 * folder), not brand-derived — hence raw Tailwind palette over semantic tokens.
 */
export * from "./folder";
export * from "./form";
export * from "./gauge";
export * from "./geist-tooltip";
export * from "./github-calendar";
export * from "./github-inline-diff";
/**
 * @registry https://ui.nebutra.com/r/globe.json
 * @distribution dual-track (npm + shadcn registry) until 2026-11-09.
 *   npm remains canonical for monorepo apps; registry serves external customers
 *   via `npx shadcn@latest add ...`. See docs/architecture/2026-05-14-registry-dual-track-distribution.md.
 */
export * from "./globe";
export * from "./glowing-effect";
export * from "./gradient-animated-text";
export * from "./grain-gradient-background";
export * from "./grid-feature-card";
export * from "./grid-pattern-card";
export * from "./grid-system";
export * from "./heading";
export * from "./hex-grid";
export * from "./highlighter";
export * from "./hover-card";
export * from "./infinite-slider";
export { Input, type InputProps } from "./input";
export * from "./input-otp";
export * from "./interactive-card";
export * from "./interactive-frosted-glass-card";
export * from "./iphone-mockup";
export * from "./kbd";
/**
 * @registry https://ui.nebutra.com/r/kpi-card.json
 * @distribution dual-track (npm + shadcn registry) until 2026-11-09.
 *   npm remains canonical for monorepo apps; registry serves external customers
 *   via `npx shadcn@latest add ...`. See docs/architecture/2026-05-14-registry-dual-track-distribution.md.
 */
export * from "./kpi-card";
export { Label, type LabelProps, labelVariants } from "./label";
export * from "./layout";
export * from "./light-rays";
export * from "./line-shadow-text";
export * from "./loader";
export * from "./loading-dots";
export * from "./macbook-pro";
/**
 * @registry https://ui.nebutra.com/r/magic-card.json
 * @distribution dual-track (npm + shadcn registry) until 2026-11-09.
 *   npm remains canonical for monorepo apps; registry serves external customers
 *   via `npx shadcn@latest add ...`. See docs/architecture/2026-05-14-registry-dual-track-distribution.md.
 */
export * from "./magic-card";
export * from "./material";
/**
 * Inline AI tool-call rendering for MCP tool invocations. Sibling of
 * EditTool / QuestionTool. Composes TextShimmer; uses @nebutra/icons
 * ChevronRight. Three states (pending / completed / interrupted),
 * verb conjugation, priority-sorted args, JSON pretty-print + truncation,
 * expandable output region.
 */
export * from "./mcp-tool";
export * from "./menubar";
export * from "./mesh-gradient-bg";
// Streaming-aware markdown renderer for AI responses. Wraps Streamdown with
// our prose tokens — single source-of-truth for chat text rendering.
export * from "./message-content";
/**
 * @registry https://ui.nebutra.com/r/metric-card.json
 * @distribution dual-track (npm + shadcn registry) until 2026-11-09.
 *   npm remains canonical for monorepo apps; registry serves external customers
 *   via `npx shadcn@latest add ...`. See docs/architecture/2026-05-14-registry-dual-track-distribution.md.
 */
export * from "./metric-card";
export * from "./multiple-selector";
export * from "./navigation-menu";
export * from "./neuro-noise-bg";
export * from "./noise-pattern-card";
export * from "./notification-message-list";
export * from "./pagination";
export * from "./pagination-control";
export * from "./popover";
/**
 * @registry https://ui.nebutra.com/r/pricing-card.json
 * @distribution dual-track (npm + shadcn registry) until 2026-11-09.
 *   npm remains canonical for monorepo apps; registry serves external customers
 *   via `npx shadcn@latest add ...`. See docs/architecture/2026-05-14-registry-dual-track-distribution.md.
 */
export * from "./pricing-card";
export * from "./progress";
export * from "./progressive-blur";
/**
 * Full-width non-dismissible banner for project-wide states needing
 * resolution (overdue billing, rollback, attack mitigation). Non-dismissible
 * by design — if it can be dismissed without resolving the state, use Note.
 */
export * from "./project-banner";
/**
 * @registry https://ui.nebutra.com/r/question-tool.json
 * @distribution dual-track (npm + shadcn registry) from 2026-05-14.
 *   Inline AI chat-tool rendering for multi-step questionnaires. Self-contained,
 *   distinctive visual IP, no transitive @nebutra deps beyond icons + utils.
 *   See docs/architecture/2026-05-14-registry-dual-track-distribution.md.
 */
export * from "./question-tool";
export { RadioGroup, RadioGroupItem } from "./radio-group";
export * from "./radio-group-card";
export * from "./radio-group-stacked";
export * from "./reaction-chip";
/**
 * Short relative-time label (`2m` / `5h` / `Yesterday`) with hover popover
 * showing absolute UTC + local time. Built on ContextCard.
 */
export * from "./relative-time-card";
export * from "./resizable";
export * from "./responsive";
export * from "./safari";
export * from "./scroll-velocity";
/**
 * Inline AI tool-call rendering for search/retrieval results. Sibling of
 * EditTool / QuestionTool / McpTool / TodoTool. Rows with `url` render as
 * honest external anchors (rel="noopener noreferrer"); rows without are
 * inert <li> with no fake hover affordance.
 */
export * from "./search-tool";
export {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectScrollDownButton,
  SelectScrollUpButton,
  SelectSeparator,
  SelectTrigger,
  SelectValue,
} from "./select";
export { Separator } from "./separator";
export * from "./sheet";
export * from "./shine-border";
export * from "./skeleton";
export * from "./slider";
export * from "./slider-number-flow";
export * from "./spacing";
export * from "./spinner";
export * from "./stack";
export * from "./stars-canvas";
export * from "./status-badge";
export * from "./stepper";
/**
 * Inline status pill for delegated subagent invocations. Lightest member
 * of the chat tool-family — single line, no body, no expand. Sibling of
 * EditTool / QuestionTool / McpTool / TodoTool / SearchTool. The `elapsedTime`
 * field accepts an already-formatted display string ("6s", "1m 24s");
 * upstream owns the timer to avoid drift between adjacent rows.
 */
export * from "./subagent-tool";
export { Switch, type SwitchProps } from "./switch";
export * from "./table";
export {
  Tabs,
  TabsContent,
  type TabsContentProps,
  TabsList,
  type TabsListProps,
  type TabsProps,
  TabsTrigger,
  type TabsTriggerProps,
  tabsContentVariants,
  tabsListVariants,
  tabsTriggerVariants,
} from "./tabs";
export * from "./terminal";
export * from "./text";
export * from "./text-loop";
export * from "./text-scramble";
export * from "./text-shimmer";
export * from "./textarea";
export * from "./theme-switcher";
// Sonner-backed toaster + `toast` API. Mount `<Toaster />` once at app root.
export * from "./toaster";
/**
 * Inline AI tool-call rendering for the Claude TodoWrite tool family.
 * Sibling of EditTool / QuestionTool / McpTool. Flat, read-only, streaming.
 * Distinct from AgentPlan — TodoTool is chat-inline; AgentPlan is dashboard.
 * Status enum (`pending` / `in_progress` / `completed`) deliberately mirrors
 * the TodoWrite tool wire format (underscored, not hyphenated).
 */
export * from "./todo-tool";
export * from "./toggle";
export * from "./toggle-group";
export {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "./tooltip";
export * from "./tree";
export * from "./upgrade-banner";
export * from "./video-player";
export * from "./video-text";
export * from "./warp-background";
export * from "./wave-animation";
export * from "./waves-bg";
export * from "./word-fade-in";
export * from "./x-post-card";
