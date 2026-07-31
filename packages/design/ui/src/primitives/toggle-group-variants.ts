import { cva } from "class-variance-authority";

export const toggleGroupVariants = cva(
  "inline-flex items-center justify-center gap-1 rounded-[var(--radius-lg)] bg-muted p-1 text-muted-foreground",
  {
    variants: {
      variant: {
        default: "",
        outline: "bg-transparent border",
        // Segmented pill look — theme-toggle / mode-pills style. Rounded-full
        // track with a rounded-full active segment (see toggleGroupItemVariants).
        pill: "rounded-full bg-neutral-2 p-0.5",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  },
);

export const toggleGroupItemVariants = cva(
  "inline-flex items-center justify-center gap-1.5 whitespace-nowrap rounded-[var(--radius-md)] px-3 py-1.5 text-sm font-medium ring-offset-background transition-[background-color,box-shadow,color,opacity] duration-flow ease-out motion-reduce:transition-none disabled:pointer-events-none disabled:opacity-50 data-[state=on]:bg-background data-[state=on]:text-foreground data-[state=on]:shadow-sm",
  {
    variants: {
      variant: {
        default: "",
        outline:
          "border border-input bg-transparent hover:bg-accent hover:text-accent-foreground data-[state=on]:bg-accent data-[state=on]:text-accent-foreground",
        pill: "rounded-full text-neutral-11 hover:text-neutral-12 data-[state=on]:bg-primary/5 data-[state=on]:text-primary data-[state=on]:shadow-none",
      },
      size: {
        default: "h-9 px-3",
        sm: "h-8 px-2",
        lg: "h-10 px-4",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);
