"use client";

import { Badge, Button, Scroller } from "@nebutra/ui/primitives";
import { Aside, DemoPage, KeyboardPath, LONG_LABEL, Row, State } from "../demo-kit";

const STEPS = ["Queued", "Installing", "Building", "Checks", "Deploying", "Ready"];
const LOG_LINES = Array.from(
  { length: 24 },
  (_, i) => `12:0${i % 10}:${String(10 + i).padStart(2, "0")}  step ${i + 1} finished`,
);

const CARD =
  "grid size-28 shrink-0 place-items-center rounded-md border border-border bg-muted text-sm";

/** The same six cards in every rail, so the states differ only by the Scroller props. */
function Cards({ count = STEPS.length }: { count?: number }) {
  return STEPS.slice(0, count).map((step) => (
    <div className={CARD} key={step}>
      {step}
    </div>
  ));
}

function Cells({ count }: { count: number }) {
  return Array.from({ length: count }, (_, i) => (
    <div className={CARD} key={`cell-${i + 1}`}>
      {i + 1}
    </div>
  ));
}

export default function ScrollerDemo() {
  return (
    <DemoPage>
      <State
        breaks="A rail whose fade or buttons appear on a side that has nothing left to scroll, or whose button steps past an item instead of onto it."
        code={`<Scroller
  overflow="x"
  width="100%"
  height={120}
  withButtons
  contentLabel="pipeline steps"
  childrenContainerClassName="gap-3"
>
  {STEPS.map((step) => (
    <div className="grid size-28 shrink-0 place-items-center …" key={step}>{step}</div>
  ))}
</Scroller>`}
        id="rail"
        note="Horizontal rail with buttons. Each press scrolls to the next direct child. The previous button is hidden at the start, the next at the end."
        title="Horizontal rail with buttons"
      >
        <div className="max-w-md">
          <Scroller
            childrenContainerClassName="gap-3"
            contentLabel="pipeline steps"
            height={120}
            overflow="x"
            width="100%"
            withButtons
          >
            <Cards />
          </Scroller>
        </div>
      </State>

      <State
        breaks="A vertical feed without edge fades, where the cut-off row looks like the end of the list. The fades only draw on a side that still has content."
        id="feed"
        note="overflow is y by default. Scroll down: the top fade appears once you leave the start."
        title="Vertical log"
      >
        <div className="max-w-md">
          <Scroller contentLabel="build log" height={160}>
            {LOG_LINES.map((line) => (
              <div className="shrink-0 whitespace-nowrap px-3 py-1 font-mono text-xs" key={line}>
                {line}
              </div>
            ))}
          </Scroller>
        </div>
      </State>

      <State
        breaks="Two-axis content where one axis loses its affordance. With both, horizontal and vertical fades are drawn on their own sides; there are no buttons unless withButtons is set."
        id="both"
        note="Use both only for content that really overflows in two dimensions, such as a wide table."
        title="Both axes"
      >
        <div className="max-w-md">
          <Scroller
            childrenContainerClassName="grid grid-cols-[repeat(8,7rem)] gap-3"
            contentLabel="matrix"
            height={180}
            overflow="both"
          >
            <Cells count={24} />
          </Scroller>
        </div>
      </State>

      <State
        breaks="The fade covering real content where it should stay readable. edgeAffordance none removes it."
        id="no-fade"
        note="edgeAffordance=none draws no fades. The scrollbar is then the only cue that there is more."
        title="No edge affordance"
      >
        <div className="max-w-md">
          <Scroller
            childrenContainerClassName="gap-3"
            contentLabel="steps without fades"
            edgeAffordance="none"
            height={120}
            overflow="x"
            width="100%"
          >
            <Cards />
          </Scroller>
        </div>
      </State>

      <State
        breaks="Buttons that scroll the wrong axis. buttonAxis defaults to y for y and both, and to x only for x; set it to x to step sideways in a two-axis scroller."
        code={`<Scroller overflow="both" buttonAxis="x" withButtons height={160} …>`}
        id="button-axis"
        note="overflow=both with buttonAxis=x: the buttons step horizontally even though the content also scrolls vertically."
        title="Button axis"
      >
        <div className="max-w-md">
          <Scroller
            buttonAxis="x"
            childrenContainerClassName="grid grid-cols-[repeat(8,7rem)] gap-3"
            contentLabel="matrix"
            height={160}
            overflow="both"
            withButtons
          >
            <Cells count={16} />
          </Scroller>
        </div>
      </State>

      <State
        breaks="Generated button labels in English on a localized page. previousButtonLabel and nextButtonLabel replace them."
        code={`<Scroller
  overflow="x"
  withButtons
  previousButtonLabel="Étape précédente"
  nextButtonLabel="Étape suivante"
/>`}
        id="labels"
        note="Without custom labels the buttons are named Scroll {contentLabel} left and right (up and down on a vertical scroller)."
        title="Custom button labels"
      >
        <div className="max-w-md">
          <Scroller
            childrenContainerClassName="gap-3"
            contentLabel="étapes"
            height={120}
            nextButtonLabel="Étape suivante"
            overflow="x"
            previousButtonLabel="Étape précédente"
            width="100%"
            withButtons
          >
            <Cards />
          </Scroller>
        </div>
      </State>

      <State
        breaks="A scroller that renders fades or enabled buttons when its content already fits. Nothing should appear until there is something to scroll."
        id="fits"
        note="Three short items in a wide rail: no fades, and the buttons stay hidden because both are disabled."
        title="Content fits"
      >
        <div className="max-w-md">
          <Scroller
            childrenContainerClassName="gap-3"
            contentLabel="short list"
            height={120}
            overflow="x"
            width="100%"
            withButtons
          >
            <Cards count={3} />
          </Scroller>
        </div>
      </State>

      <State
        breaks="An empty list that renders a labelled region with nothing in it. With no height set the viewport collapses to its children, so an empty scroller is invisible."
        id="empty"
        note="Put an explicit empty message inside the scroller, or do not render it."
        title="Empty"
      >
        <div className="max-w-md">
          <Scroller contentLabel="notifications" height={96}>
            <div className="flex h-24 items-center justify-center text-muted-foreground text-sm">
              No notifications yet
            </div>
          </Scroller>
        </div>
      </State>

      <State
        breaks="Long unbroken labels that compress or wrap. Items on the horizontal axis need shrink-0 and no wrapping, or flex squeezes them instead of scrolling."
        id="overflow"
        note="Wide items keep their width and the rail scrolls. Without shrink-0 they would compress."
        title="Overflow — long labels"
      >
        <div className="max-w-md">
          <Scroller
            childrenContainerClassName="gap-2"
            contentLabel="tags"
            height={64}
            overflow="x"
            width="100%"
          >
            <Badge className="shrink-0" variant="outline">
              {LONG_LABEL}
            </Badge>
            <Badge className="shrink-0">Production</Badge>
            <Badge className="shrink-0" variant="gray-subtle">
              v2
            </Badge>
          </Scroller>
        </div>
      </State>

      <State
        breaks="Edge detection that assumes left-to-right. Browsers report scrollLeft as zero at the start and negative toward the end in right-to-left, so a naive check shows the fades and buttons on the wrong sides."
        id="rtl"
        note="Inside dir=rtl. The scroller reads the direction from the DOM and normalises scrollLeft, so the start edge is on the right: the previous button and its fade sit there, the chevrons mirror, and the default button labels name the physical side they scroll toward."
        title="Right-to-left"
      >
        <div className="max-w-md" dir="rtl">
          <Scroller
            childrenContainerClassName="gap-3"
            contentLabel="pipeline steps"
            height={120}
            overflow="x"
            width="100%"
            withButtons
          >
            <Cards />
          </Scroller>
        </div>
      </State>

      <State
        breaks="A scroll area that keyboard users cannot reach or operate, or whose focus ring is suppressed."
        id="keyboard"
        title="Keyboard path"
      >
        <KeyboardPath
          steps={[
            {
              keys: "Tab",
              does: "visits the previous and next buttons that are enabled. Disabled ones are skipped.",
            },
            { keys: "Enter / Space", does: "on a button, scrolls to the previous or next child." },
            {
              keys: "Tab, then arrows",
              does: "where the browser makes the scroll viewport a tab stop (the component adds no tabindex), it shows a focus ring and the arrow keys scroll it.",
            },
          ]}
        >
          <Row>
            <div className="w-full max-w-md">
              <Scroller
                childrenContainerClassName="gap-3"
                contentLabel="pipeline steps"
                height={120}
                overflow="x"
                width="100%"
                withButtons
              >
                <Cards />
              </Scroller>
            </div>
            <Button variant="ghost">Next control</Button>
          </Row>
        </KeyboardPath>
      </State>

      <Aside title="Not a carousel">
        <p>
          Scroller is native overflow with fades and optional step buttons. It does not snap, loop
          or virtualize. Use it for rails, feeds and logs; the source notes that carousels and large
          data sets belong in their own primitives.
        </p>
      </Aside>
    </DemoPage>
  );
}
