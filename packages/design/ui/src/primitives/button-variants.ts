import { cva } from "class-variance-authority";
import { controlFocusVisibleClassName } from "./form-control";

// Heights / weights from recipe.css (--control-height-*, --font-weight-medium).
// Keyboard focus is the shared recipe in form-control.ts.
export const buttonVariants = cva(
  [
    "inline-flex items-center justify-center gap-2 whitespace-nowrap",
    "rounded-[var(--btn-default-radius,var(--radius-md))]",
    "text-[length:var(--control-font-size-md,0.875rem)] font-[number:var(--font-weight-medium,500)]",
    // `transform` is in the property list on purpose: without it the
    // active:scale-[0.97] press snapped instantly and the button felt dead
    // under the finger. Micro rail + ease-out, like every other form control;
    // motion governance pins them (primitives/__tests__/motion-governance.test.ts).
    "transition-[background-color,border-color,box-shadow,color,transform] duration-micro ease-out",
    "active:scale-[0.97] motion-reduce:transform-none motion-reduce:active:scale-100 motion-reduce:transition-none",
    controlFocusVisibleClassName,
    "disabled:pointer-events-none disabled:opacity-50",
    "aria-busy:cursor-wait",
  ].join(" "),
  {
    variants: {
      /**
       * Selects the action's visual emphasis or semantic treatment for buttons and links.
       * @default "default"
       */
      variant: {
        // Recipe-driven via packages/design/tokens/recipe.css (.btn-brand-default)
        default: "btn-brand-default",
        // Hover is the fill at 90%, like every other solid variant. It was
        // neutral-11 — the secondary-TEXT step, a mid grey under the site
        // language in both modes — so the primary action turned the grey of a
        // disabled control. A 1px lift rode along; buttons do
        // not move on hover (docs/design-system/hover-motion.md).
        ink: "bg-neutral-12 text-neutral-1 ring-1 ring-inset ring-neutral-1/5 hover:bg-neutral-12/90",
        destructive: "bg-destructive text-destructive-foreground hover:bg-destructive/90",
        // outline and ghost name their own text colour. They used to inherit it, so a
        // dark island inside a light document (the docs Split pane, a dark product
        // section) left them with the document's dark ink on a dark fill.
        outline:
          "border border-input bg-background text-foreground hover:bg-accent hover:text-accent-foreground",
        secondary: "bg-secondary text-secondary-foreground hover:bg-secondary/80",
        ghost: "text-foreground hover:bg-accent hover:text-accent-foreground",
        link: "text-primary underline-offset-4 hover:underline",
        tertiary:
          "border border-transparent bg-transparent text-muted-foreground hover:bg-accent hover:text-accent-foreground hover:border-input",
        warning: "bg-warning text-warning-foreground hover:bg-warning/90",
      },
      // One corner for every size. tiny/sm used to take --radius-sm and lg
      // --radius-lg (the container step, which a skin maps to its CARD radius),
      // while the default variant's recipe pinned --btn-default-radius at every
      // size — so in one toolbar an outline sm button was 4px beside a default
      // sm at 6px, and under Raycast a large outline button came out at 16px.
      // Geist and Radix keep one control radius across the ladder.
      /**
       * Sets text-control height, padding and type size; use `iconSize` for compact icon boxes.
       * @default "default"
       */
      size: {
        tiny: "h-[var(--control-height-tiny,1.5rem)] px-2 text-[length:var(--control-font-size-tiny,0.75rem)]",
        sm: "h-[var(--control-height-sm,2rem)] px-3 text-[length:var(--control-font-size-sm,0.875rem)]",
        default:
          "h-[var(--control-height-md,2.5rem)] px-[var(--btn-default-padding-x,1rem)] py-[var(--btn-default-padding-y,0.5rem)]",
        lg: "h-[var(--control-height-lg,3rem)] px-5 text-[length:var(--control-font-size-lg,1rem)]",
        icon: "h-[var(--control-height-md,2.5rem)] w-[var(--control-height-md,2.5rem)]",
      },
      /**
       * Sets corner treatment; square and circle also enable equal-sided icon boxes.
       * @default "default"
       */
      shape: {
        default: "",
        // Radius from --btn-default-radius / --radius-md — brand-switchable.
        // Do not hardcode rounded-md here; a language must be able to retarget
        // the corner treatment of every icon trigger at once.
        square: "rounded-[var(--btn-default-radius,var(--radius-md))]",
        // Pill radius token, not Tailwind rounded-full — same 9999px default,
        // but a brand that ships a softer "circle" can override --radius-pill.
        circle: "rounded-[var(--radius-pill,9999px)]",
        pill: "rounded-[var(--radius-pill,9999px)]",
      },
      // Icon-only box size — orthogonal to `size` (which tunes text-button
      // height/padding/font together) and to `shape` (which picks the
      // corner treatment). Only takes effect combined with shape="square"
      // or shape="circle" (see compoundVariants below); every other
      // combination ignores it. 28/32/36 cover the icon-trigger sizes that
      // actually occur in the app — 24/40/48 are already reachable via
      // shape + size (tiny/default/lg). Heights read --control-height-icon-*
      // so density-aware Brand Packages can scale them with the ladder.
      iconSize: {
        sm: "", // 28px default
        md: "", // 32px default
        lg: "", // 36px default
      },
    },
    compoundVariants: [
      { shape: "square", size: "tiny", className: "w-[var(--control-height-tiny,1.5rem)] px-0" },
      { shape: "square", size: "sm", className: "w-[var(--control-height-sm,2rem)] px-0" },
      { shape: "square", size: "default", className: "w-[var(--control-height-md,2.5rem)] px-0" },
      { shape: "square", size: "lg", className: "w-[var(--control-height-lg,3rem)] px-0" },
      {
        shape: "circle",
        size: "tiny",
        className: "w-[var(--control-height-tiny,1.5rem)] px-0",
      },
      {
        shape: "circle",
        size: "sm",
        className: "w-[var(--control-height-sm,2rem)] px-0",
      },
      {
        shape: "circle",
        size: "default",
        className: "w-[var(--control-height-md,2.5rem)] px-0",
      },
      {
        shape: "circle",
        size: "lg",
        className: "w-[var(--control-height-lg,3rem)] px-0",
      },
      // iconSize wins over the size-driven box above — matched on shape +
      // iconSize only, so it applies regardless of whatever `size` was
      // passed (or left at its "default" fallback). Corner treatment stays
      // on the shape variant (token-backed); only the box is set here.
      {
        shape: "square",
        iconSize: "sm",
        className:
          "h-[var(--control-height-icon-sm,1.75rem)] w-[var(--control-height-icon-sm,1.75rem)] px-0",
      },
      {
        shape: "square",
        iconSize: "md",
        className:
          "h-[var(--control-height-icon-md,2rem)] w-[var(--control-height-icon-md,2rem)] px-0",
      },
      {
        shape: "square",
        iconSize: "lg",
        className:
          "h-[var(--control-height-icon-lg,2.25rem)] w-[var(--control-height-icon-lg,2.25rem)] px-0",
      },
      {
        shape: "circle",
        iconSize: "sm",
        className:
          "h-[var(--control-height-icon-sm,1.75rem)] w-[var(--control-height-icon-sm,1.75rem)] px-0",
      },
      {
        shape: "circle",
        iconSize: "md",
        className:
          "h-[var(--control-height-icon-md,2rem)] w-[var(--control-height-icon-md,2rem)] px-0",
      },
      {
        shape: "circle",
        iconSize: "lg",
        className:
          "h-[var(--control-height-icon-lg,2.25rem)] w-[var(--control-height-icon-lg,2.25rem)] px-0",
      },
    ],
    defaultVariants: {
      variant: "default",
      size: "default",
      shape: "default",
    },
  },
);
