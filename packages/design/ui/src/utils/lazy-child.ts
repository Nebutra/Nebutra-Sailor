import * as React from "react";

const REACT_LAZY = Symbol.for("react.lazy");

/**
 * The element an `asChild` wrapper received, with a lazy one resolved.
 *
 * When a Server Component hands a client primitive an element of another
 * client component (`<TooltipTrigger asChild><Button /></TooltipTrigger>` in a
 * server file), React's Flight client can deliver that child to the server
 * render as a lazy node rather than an element. `React.isValidElement` is false
 * for it, so the wrapper took its non-`asChild` branch on the server — a
 * <button> around the Button's <button> — and the normal branch in the browser:
 * invalid nesting and a hydration failure (found on /status by the customer
 * path gate). Resolving the lazy node first gives both renders the same tree.
 * Radix's Slot does the same (`use(children._payload)`).
 */
export function resolveLazyChild(node: React.ReactNode): React.ReactNode {
  if (typeof node !== "object" || node === null) return node;
  const lazy = node as { $$typeof?: symbol; _payload?: unknown };
  if (lazy.$$typeof !== REACT_LAZY) return node;
  const payload = lazy._payload as PromiseLike<React.ReactNode> | undefined;
  if (!payload || typeof payload.then !== "function") return node;
  return React.use(payload);
}
