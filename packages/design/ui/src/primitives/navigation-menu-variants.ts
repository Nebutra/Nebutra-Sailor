import { cva } from "class-variance-authority";

import { overlayClassNames } from "../tokens/components/overlay";

export const navigationMenuTriggerStyle = cva(
  `group inline-flex h-10 w-max items-center justify-center rounded-[var(--radius-md)] bg-transparent px-4 py-2 text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:bg-accent focus-visible:text-accent-foreground ${overlayClassNames.focusRing} disabled:pointer-events-none disabled:opacity-50 data-[active]:bg-accent/50 data-[state=open]:bg-accent/50`,
);
