import * as React from "react";

/**
 * Base UI triggers render a native <button> by default and, when handed an
 * element through `render`, assume it is still one (`nativeButton` defaults to
 * true). Our `asChild` wrappers passed any child — a <div> around an image, a
 * <time>, a <span> — and Base UI warned on every one and left it without
 * button semantics. Each trigger now states what it renders.
 */

/** Components that render a native <button> mark themselves with this. */
export const RENDERS_NATIVE_BUTTON = Symbol.for("nebutra.ui.rendersNativeButton");

/** Does this trigger element render a native <button>? No element: Base UI renders its own. */
export function rendersNativeButton(element: unknown): boolean {
  if (!React.isValidElement(element)) return true;
  if (element.type === "button") return true;
  const type = element.type as { [RENDERS_NATIVE_BUTTON]?: boolean } | string;
  if (typeof type === "string") return false;
  const props = element.props as { asChild?: boolean };
  return type?.[RENDERS_NATIVE_BUTTON] === true && props.asChild !== true;
}
