import { cva } from "class-variance-authority";

// Heights: tiny=24px sm=32px md=40px lg=48px (Geist-matching).
// Focus ring uses the shared neutral ring token, 2px ring, 2px offset.
export const buttonVariants = cva(
  [
    "inline-flex items-center justify-center gap-2 whitespace-nowrap",
    "rounded-[var(--radius-md)] text-sm font-medium",
    "transition-colors duration-micro ease-out",
    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
    "disabled:pointer-events-none disabled:opacity-50",
    "aria-busy:cursor-wait",
  ].join(" "),
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground hover:bg-primary/90",
        ink: "bg-[var(--neutral-12)] text-[var(--neutral-1)] ring-1 ring-inset ring-[color:var(--neutral-1)]/5 hover:bg-[var(--neutral-11)] hover:-translate-y-px active:translate-y-0 transition-[transform,background-color] duration-micro",
        destructive: "bg-destructive text-destructive-foreground hover:bg-destructive/90",
        outline: "border border-input bg-background hover:bg-accent hover:text-accent-foreground",
        secondary: "bg-secondary text-secondary-foreground hover:bg-secondary/80",
        ghost: "hover:bg-accent hover:text-accent-foreground",
        link: "text-primary underline-offset-4 hover:underline",
        tertiary:
          "border border-transparent bg-transparent text-muted-foreground hover:bg-accent hover:text-accent-foreground hover:border-input",
        warning: "bg-warning text-warning-foreground hover:bg-warning/90",
      },
      size: {
        tiny: "h-6 rounded-[var(--radius-sm)] px-2 text-[11px]",
        sm: "h-8 rounded-[var(--radius-sm)] px-3 text-xs",
        default: "h-10 px-4 py-2",
        lg: "h-12 rounded-[var(--radius-lg)] px-5 text-base",
        icon: "h-10 w-10",
      },
      shape: {
        default: "",
        square: "",
        circle: "",
      },
    },
    compoundVariants: [
      { shape: "square", size: "tiny", className: "w-6 px-0" },
      { shape: "square", size: "sm", className: "w-8 px-0" },
      { shape: "square", size: "default", className: "w-10 px-0" },
      { shape: "square", size: "lg", className: "w-12 px-0" },
      { shape: "circle", size: "tiny", className: "w-6 px-0 rounded-full" },
      { shape: "circle", size: "sm", className: "w-8 px-0 rounded-full" },
      { shape: "circle", size: "default", className: "w-10 px-0 rounded-full" },
      { shape: "circle", size: "lg", className: "w-12 px-0 rounded-full" },
    ],
    defaultVariants: {
      variant: "default",
      size: "default",
      shape: "default",
    },
  },
);
