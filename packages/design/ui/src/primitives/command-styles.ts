import { cn } from "../utils/cn";

export const commandFrameClassName = cn(
  "[&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:font-medium",
  "[&_[cmdk-group-heading]]:text-muted-foreground",
  "[&_[cmdk-group]:not([hidden])_~[cmdk-group]]:pt-0",
  "[&_[cmdk-group]]:px-2",
  "[&_[data-cmdk-input-wrapper]_svg]:h-5 [&_[data-cmdk-input-wrapper]_svg]:w-5",
  "[&_[cmdk-input]]:h-12",
  "[&_[cmdk-item]]:px-2 [&_[cmdk-item]]:py-2.5",
  "[&_[cmdk-item]_svg]:h-4 [&_[cmdk-item]_svg]:w-4",
);

// The divider stays neutral. A command palette's input is focused the moment
// it opens, so a focus-coloured divider is not a signal — it is a permanent
// blue line under the field (PARA, 2026-09-25). The caret shows focus.
export const commandInputWrapperClassName = cn("flex items-center border-b border-border px-3");

export const commandInputClassName = cn(
  "flex h-11 w-full appearance-none border-0 bg-transparent py-3 text-sm text-foreground shadow-none outline-none",
  "placeholder:text-muted-foreground disabled:cursor-not-allowed disabled:opacity-50",
  "outline-none focus-visible:outline-none",
  "[&::-webkit-search-cancel-button]:appearance-none",
  "[&::-webkit-search-decoration]:appearance-none",
  "[&::-webkit-search-results-button]:appearance-none",
  "[&::-webkit-search-results-decoration]:appearance-none",
);
