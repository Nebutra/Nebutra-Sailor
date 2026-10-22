"use client";

import type { Popover } from "@base-ui/react/popover";
import * as React from "react";

/** Base UI portal target: an element, shadow root, or ref; null uses the fallback target. */
export type PortalContainer = React.ComponentProps<typeof Popover.Portal>["container"];

export interface PortalContainerProviderProps {
  /** Target inherited by descendant overlays unless their own container is supplied. */
  container: PortalContainer;
  /** Overlays and their triggers that share the target's DOM scope. */
  children: React.ReactNode;
}

const NO_PROVIDER = Symbol("no portal container provider");
const PortalContainerContext = React.createContext<PortalContainer | typeof NO_PROVIDER>(
  NO_PROVIDER,
);

/**
 * Scopes descendant overlay portals to a DOM container so they inherit its theme.
 * Adds no DOM. The nearest provider wins; null restores fullscreen/default placement.
 *
 * Prefer an element held in state: pass its setter as the host's callback ref
 * (`ref={setHost}`) and the element as `container={host}`. Mount and replacement
 * updates then propagate directly without DOM observers. Object refs remain
 * supported for compatibility.
 */
export function PortalContainerProvider({ container, children }: PortalContainerProviderProps) {
  const [resolvedRef, setResolvedRef] = React.useState<HTMLElement | ShadowRoot | null>(null);
  const refContainer =
    container && typeof container === "object" && "current" in container ? container : null;

  // Object refs are assigned after render. Recheck every provider commit,
  // including when a stable ref is reassigned to an existing element.
  React.useEffect(() => {
    if (refContainer) setResolvedRef(refContainer.current);
  });

  React.useEffect(() => {
    if (!refContainer) return;
    if (typeof document === "undefined" || typeof MutationObserver === "undefined") return;

    // A descendant can mount or replace the host without rerendering this
    // provider. Observe those DOM commits and publish only target changes.
    const syncTarget = () => setResolvedRef(refContainer.current);
    const target = refContainer.current;
    const ownerDocument = target?.ownerDocument ?? document;
    const observer = new MutationObserver(syncTarget);
    const options = { childList: true, subtree: true };
    observer.observe(ownerDocument, options);
    const root = target?.getRootNode();
    if (root && root !== ownerDocument) observer.observe(root, options);
    return () => observer.disconnect();
  }, [refContainer]);

  return (
    <PortalContainerContext.Provider value={refContainer ? resolvedRef : container}>
      {children}
    </PortalContainerContext.Provider>
  );
}

/**
 * Resolves an explicit target, then the nearest scope, then the fullscreen element.
 * Undefined leaves Base UI's normal parent-portal or document.body placement intact.
 * Refs are passed through for Base UI to resolve when the portal mounts.
 */
export function usePortalContainer(container?: PortalContainer): PortalContainer {
  const scopedContainer = React.useContext(PortalContainerContext);
  // Null escapes an inherited scope while retaining fullscreen behavior.
  const target = container !== undefined ? container : scopedContainer;
  if (target !== NO_PROVIDER && target != null) return target;
  if (typeof document === "undefined") return undefined;
  const fullscreen = document.fullscreenElement;
  return fullscreen instanceof HTMLElement ? fullscreen : undefined;
}
