"use client";

/**
 * One docs-shared demo, loaded when it is about to be seen.
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

import dynamic from "next/dynamic";
import * as React from "react";

const Fallback = () => (
  <div className="h-full min-h-[160px] w-full animate-pulse rounded-[var(--radius-md)] bg-muted/60" />
);

/**
 * The template literal keeps the whole set derived: there is no map of imports
 * to maintain, and a demo added to docs-shared is reachable here without an
 * edit. Next needs the static prefix to know which directory to split.
 *
 * `webpackInclude` is load-bearing rather than tidy. Without it the context
 * takes every file in that directory whatever it is named, and three
 * extension-less fragments sitting there — `Pro`, `Title`, `Payment Method`,
 * untracked debris from a bad split in May — fail the parse and take the whole
 * build down with them.
 */
function loader(id: string) {
  return dynamic(
    () =>
      import(
        /* webpackInclude: /\.tsx$/ */
        `@nebutra/docs-shared/components/previews/${id}`
      ),
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

export function ShowcaseDemo({ id }: { id: string }) {
  const [ref, near] = useOnApproach<HTMLDivElement>();
  const Demo = React.useMemo(() => (near ? loader(id) : null), [near, id]);

  return (
    <div className="flex min-h-[180px] w-full items-center justify-center" ref={ref}>
      {Demo ? <Demo /> : <Fallback />}
    </div>
  );
}
