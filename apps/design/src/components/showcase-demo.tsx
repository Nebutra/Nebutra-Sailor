"use client";

/**
 * One catalog demo, loaded when it is about to be seen.
 *
 * A hundred and ninety demos on one page is a hundred and ninety chunks, and
 * several of them carry a canvas, a shader or a globe. Mounting them all at once
 * would make the index unusable on the machine of anyone it is meant to help.
 *
 * So each card mounts on approach rather than on load: the observer fires a
 * little before the card reaches the viewport, the chunk arrives, the demo
 * renders. Scrolling to the bottom of the page loads everything above it and
 * nothing below — which is the behaviour you want and also, incidentally, the
 * only way this page is affordable at all.
 *
 * `ssr: false` is deliberate rather than lazy. These demos reach for canvas,
 * WebGL and measured layout; rendering them on the server produces markup the
 * client immediately throws away, and for a few of them it produces an error.
 */

import { loadDemo } from "@nebutra/ui/catalog/loaders";
import dynamic from "next/dynamic";
import * as React from "react";

const Fallback = () => (
  <div className="h-full min-h-[160px] w-full animate-pulse rounded-[var(--radius-md)] bg-muted/60" />
);

function loader(id: string) {
  return dynamic(
    // Each catalog demo is its own chunk behind a literal import() in
    // @nebutra/ui's DEMO_LOADERS; the catalog guarantees one named export per file.
    () => loadDemo(id),
    { ssr: false, loading: Fallback },
  );
}

function useOnApproach<T extends HTMLElement>(): [React.RefObject<T | null>, boolean] {
  const ref = React.useRef<T>(null);
  const [near, setNear] = React.useState(false);

  React.useEffect(() => {
    const node = ref.current;
    if (!node || near) return;
    if (typeof IntersectionObserver === "undefined") {
      setNear(true);
      return;
    }
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) setNear(true);
      },
      { rootMargin: "400px" },
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, [near]);

  return [ref, near];
}

/**
 * One demo failing must not take the page with it.
 *
 * It did: several WebGL demos mounted together exhaust the browser's live
 * context limit, the one that loses its context throws from inside a render,
 * and React unmounts the whole tree — so scrolling a third of the way down the
 * showcase replaced the entire page with "This page couldn't load". The demos
 * that caused it are gone now, but the reason it was fatal rather than ugly was
 * the missing boundary, and that is the part worth fixing: the next demo to
 * throw should cost one card.
 */
class DemoBoundary extends React.Component<
  { children: React.ReactNode; id: string },
  { failed: boolean }
> {
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  render() {
    if (this.state.failed) {
      return (
        <p className="px-3 text-center font-mono text-[11px] text-muted-foreground">
          {this.props.id} failed to render
        </p>
      );
    }
    return this.props.children;
  }
}

export function ShowcaseDemo({ id }: { id: string }) {
  const [ref, near] = useOnApproach<HTMLDivElement>();
  const Demo = React.useMemo(() => (near ? loader(id) : null), [near, id]);

  return (
    <div className="flex min-h-[180px] w-full items-center justify-center" ref={ref}>
      {Demo ? (
        <DemoBoundary id={id}>
          <Demo />
        </DemoBoundary>
      ) : (
        <Fallback />
      )}
    </div>
  );
}
