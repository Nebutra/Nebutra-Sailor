export const cssTransition = {
  color: "transition-colors duration-micro ease-out motion-reduce:transition-none",
  background: "transition-colors duration-micro ease-out motion-reduce:transition-none",
  border: "transition-colors duration-micro ease-out motion-reduce:transition-none",
  shadow: "transition-shadow duration-flow ease-out motion-reduce:transition-none",
  opacity: "transition-opacity duration-micro ease-out motion-reduce:transition-none",
  transform: "transition-transform duration-flow ease-out motion-reduce:transition-none",
} as const;

export const interactiveCssTransition =
  "transition-[color,background-color,border-color,box-shadow,opacity,transform] duration-flow ease-out motion-reduce:transition-none";

export type CssTransition = keyof typeof cssTransition;
