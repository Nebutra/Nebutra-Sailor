import { cva } from "class-variance-authority";

export const toggleGroupVariants = cva(
  "inline-flex items-center justify-center gap-1 rounded-[var(--radius-lg)] bg-muted p-1 text-muted-foreground",
  {
    variants: {
      variant: {
        default: "",
        outline: "bg-transparent border",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  },
);

export const toggleGroupItemVariants = cva(
  "inline-flex items-center justify-center whitespace-nowrap rounded-[var(--radius-md)] px-3 py-1.5 text-sm font-medium ring-offset-background transition-[background-color,box-shadow,color,opacity] duration-flow ease-out motion-reduce:transition-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 data-[state=on]:bg-background data-[state=on]:text-foreground data-[state=on]:shadow-sm",
  {
    variants: {
      variant: {
        default: "",
        outline:
          "border border-input bg-transparent hover:bg-accent hover:text-accent-foreground data-[state=on]:bg-accent data-[state=on]:text-accent-foreground",
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
