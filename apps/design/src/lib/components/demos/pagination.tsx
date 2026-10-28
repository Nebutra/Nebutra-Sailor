"use client";

import { Pagination } from "@nebutra/ui/primitives";
import type * as React from "react";
import { Aside, DemoPage, KeyboardPath, Stack, State } from "../demo-kit";

/** Keeps a demo link from navigating away from the page being read. */
const hold = (event: React.MouseEvent) => {
  if (event.target instanceof Element && event.target.closest("a")) event.preventDefault();
};

const PREVIOUS = { title: "Installation", href: "/docs/installation" };
const NEXT = { title: "Theming", href: "/docs/theming" };
const LONG_TITLE =
  "Provisioning a dedicated single-tenant analytics cluster in Frankfurt (eu-central-1)";

export default function PaginationDemo() {
  return (
    <DemoPage>
      <State
        breaks="A numbered page list expected where there is none. Pagination links to the two neighbours of the current page and nothing else; it has no page numbers, current-page marker or ellipsis."
        code={`<Pagination
  previous={{ title: "Installation", href: "/docs/installation" }}
  next={{ title: "Theming", href: "/docs/theming" }}
/>`}
        id="default"
        note="Two rails, side by side from the sm breakpoint and stacked below it. Hover a rail: the border and background change and the arrow nudges outward."
        title="Default"
      >
        <div className="max-w-xl">
          <Pagination next={NEXT} onClick={hold} previous={PREVIOUS} />
        </div>
      </State>

      <State
        breaks="A missing neighbour rendered as a disabled or empty button. On the first or last page the slot is simply empty, and the remaining rail stays on its own side."
        code={`<Pagination next={{ title: "Theming", href: "/docs/theming" }} />`}
        id="ends"
        note="Top: the first page, so only next. Bottom: the last page, so only previous. Below sm the empty slot collapses and the rail takes the full width."
        title="First and last page"
      >
        <Stack className="max-w-xl">
          <Pagination aria-label="First page" next={NEXT} onClick={hold} />
          <Pagination aria-label="Last page" onClick={hold} previous={PREVIOUS} />
        </Stack>
      </State>

      <State
        breaks="Captions fixed in English. previousLabel and nextLabel replace the small words above the titles; they do not change the link's accessible name."
        code={`<Pagination
  nextLabel="Continue"
  previousLabel="Back"
  …
/>`}
        id="labels"
        note="Custom captions on both rails."
        title="Custom captions"
      >
        <div className="max-w-xl">
          <Pagination
            next={NEXT}
            nextLabel="Continue"
            onClick={hold}
            previous={PREVIOUS}
            previousLabel="Back"
          />
        </div>
      </State>

      <State
        breaks="A long title that wraps and pushes the two rails to different heights, or one that overflows the rail. The title truncates with an ellipsis; the full title stays in the accessible name."
        id="overflow"
        note="Very long titles in a narrow container. Each rail truncates on one line."
        title="Overflow — long titles"
      >
        <div className="max-w-md rounded-lg bg-background p-3">
          <Pagination
            next={{ title: LONG_TITLE, href: "/docs/next" }}
            onClick={hold}
            previous={{ title: LONG_TITLE, href: "/docs/previous" }}
          />
        </div>
      </State>

      <State
        breaks="A landmark with nothing in it. With neither neighbour the component now renders nothing, so a screen reader finds no empty region; the dashed frame below is all that remains."
        id="empty"
        note="Neither previous nor next: no nav is rendered and nothing is visible."
        title="Empty — no neighbours"
      >
        <div className="max-w-xl rounded-lg border border-border border-dashed p-3">
          <Pagination aria-label="No neighbours" />
        </div>
      </State>

      <State
        breaks="An arrow that points away from the page it leads to, or a hover nudge that moves the wrong way, in a right-to-left page."
        id="rtl"
        note="The same pair inside dir=rtl. The slots follow the writing direction (previous moves to the right), the arrows mirror with them and text alignment is logical (text-start, text-end)."
        title="Right-to-left"
      >
        <div className="max-w-xl" dir="rtl">
          <Pagination next={NEXT} onClick={hold} previous={PREVIOUS} />
        </div>
      </State>

      <State
        breaks="Nothing — this state exists to record an absence."
        id="no-states"
        note="Pagination has no disabled, loading or current-page state, and no size. A side that does not exist is left out, not disabled. The rails are plain anchors, so there is no client-side navigation unless the page intercepts the click."
        title="States Pagination deliberately does not have"
      >
        <div className="max-w-xl">
          <Pagination next={NEXT} onClick={hold} />
        </div>
      </State>

      <State
        breaks="Rails that are not reachable by keyboard, or that trap the focus ring. Each rail is an anchor and takes the page's focus ring."
        id="keyboard"
        title="Keyboard path"
      >
        <KeyboardPath
          steps={[
            { keys: "Tab / Shift+Tab", does: "moves between the previous and next links." },
            { keys: "Enter", does: "follows the focused link." },
            {
              keys: "screen reader",
              does: "reads each link as “Go to previous page: <title>” or “Go to next page: <title>”.",
            },
          ]}
        >
          <Pagination
            aria-label="Keyboard navigation"
            next={NEXT}
            onClick={hold}
            previous={PREVIOUS}
          />
        </KeyboardPath>
      </State>

      <Aside title="Pagination in the library is not a page-number list">
        <p>
          If you need numbered pages (1 … 4 5 6 … 20) there is no component for it yet. This one is
          the previous/next rail used at the bottom of documentation pages. The anchors carry{" "}
          <code>rel=&quot;prev&quot;</code> and <code>rel=&quot;next&quot;</code>.
        </p>
      </Aside>
    </DemoPage>
  );
}
