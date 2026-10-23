"use client";

import { AspectRatio, Skeleton } from "@nebutra/ui/primitives";
import * as React from "react";
import {
  Aside,
  ControlButton,
  Controls,
  DemoPage,
  LONG_PARAGRAPH,
  Row,
  Specimen,
  State,
} from "../demo-kit";

const RATIOS = [
  { label: "1 / 1", value: 1 },
  { label: "4 / 3", value: 4 / 3 },
  { label: "16 / 9", value: 16 / 9 },
  { label: "21 / 9", value: 21 / 9 },
  { label: "3 / 4", value: 3 / 4 },
];

function Fill({ children }: { children: React.ReactNode }) {
  return (
    <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-accent to-muted text-muted-foreground text-sm">
      {children}
    </div>
  );
}

export default function AspectRatioDemo() {
  const [loaded, setLoaded] = React.useState(false);

  return (
    <DemoPage>
      <State
        breaks="A ratio that is read as height divided by width, or one that drifts from the number passed. Each frame is measured by the browser from the ratio prop alone."
        code={`<AspectRatio className="overflow-hidden rounded-lg" ratio={16 / 9}>
  <div className="absolute inset-0" />
</AspectRatio>`}
        id="ratios"
        note="ratio is width divided by height. The default is 1."
        title="Common ratios"
      >
        <Row align="start">
          {RATIOS.map((ratio) => (
            <Specimen key={ratio.label} label={ratio.label}>
              <div className="w-36">
                <AspectRatio className="overflow-hidden rounded-lg" ratio={ratio.value}>
                  <Fill>{ratio.label}</Fill>
                </AspectRatio>
              </div>
            </Specimen>
          ))}
        </Row>
      </State>

      <State
        breaks="A frame that collapses to zero height until the media arrives, shifting everything below it. Here the box is the same size in both states."
        code={`<AspectRatio ratio={16 / 9}>
  {loaded ? <img alt="Cover" className="size-full object-cover" src={src} /> : <Skeleton className="absolute inset-0" height="100%" width="100%" />}
</AspectRatio>`}
        id="loading"
        note="The point of the component: the Skeleton and the loaded content fill the same reserved box, so toggling does not move the line of text below."
        title="Loading, then loaded"
      >
        <Controls>
          <ControlButton active={loaded} onClick={() => setLoaded((v) => !v)}>
            loaded
          </ControlButton>
        </Controls>
        <div className="max-w-xs">
          <AspectRatio className="overflow-hidden rounded-lg" ratio={16 / 9}>
            {loaded ? (
              <Fill>Cover image</Fill>
            ) : (
              <Skeleton className="absolute inset-0" height="100%" width="100%" />
            )}
          </AspectRatio>
          <p className="mt-2 text-muted-foreground text-xs">The text below stays where it is.</p>
        </div>
      </State>

      <State
        breaks="Children that look broken because the frame does not stretch them. A bare child sits in the top corner at its own size."
        id="fill"
        note="AspectRatio reserves the box and nothing more. The left child is placed as is; the right one fills the frame with absolute inset-0."
        title="Children are not stretched"
      >
        <Row align="start">
          <Specimen label="in normal flow">
            <div className="w-40">
              <AspectRatio className="rounded-lg bg-muted" ratio={4 / 3}>
                <span className="p-2 text-xs">Top corner</span>
              </AspectRatio>
            </div>
          </Specimen>
          <Specimen label="absolute inset-0">
            <div className="w-40">
              <AspectRatio className="overflow-hidden rounded-lg" ratio={4 / 3}>
                <Fill>Fills</Fill>
              </AspectRatio>
            </div>
          </Specimen>
        </Row>
      </State>

      <State
        breaks="Content taller than the frame pushing the layout, or being clipped when the author expected it to grow. Which one happens is decided by overflow on the frame, not by the ratio."
        id="overflow"
        note="Without overflow-hidden the box grows to hold its content, so the ratio is a minimum, not a guarantee. With overflow-hidden the ratio holds and the content is cut."
        title="Overflow — content taller than the frame"
      >
        <Row align="start">
          <Specimen label="grows">
            <div className="w-48">
              <AspectRatio className="rounded-lg bg-muted" ratio={16 / 9}>
                <p className="m-0 p-3 text-xs">{LONG_PARAGRAPH}</p>
              </AspectRatio>
            </div>
          </Specimen>
          <Specimen label="overflow-hidden">
            <div className="w-48">
              <AspectRatio className="overflow-hidden rounded-lg bg-muted" ratio={16 / 9}>
                <p className="m-0 p-3 text-xs">{LONG_PARAGRAPH}</p>
              </AspectRatio>
            </div>
          </Specimen>
        </Row>
      </State>

      <State
        breaks="A frame that keeps a fixed width and overflows a narrow container, or that refuses to shrink with it. It is width: 100% of its parent."
        id="narrow"
        note="AspectRatio is w-full, so it follows its container. Both frames below hold 16 / 9 at their own width."
        title="Follows its container"
      >
        <Row align="start">
          <div className="w-24">
            <AspectRatio className="overflow-hidden rounded-lg" ratio={16 / 9}>
              <Fill>96</Fill>
            </AspectRatio>
          </div>
          <div className="w-72 max-w-full">
            <AspectRatio className="overflow-hidden rounded-lg" ratio={16 / 9}>
              <Fill>288</Fill>
            </AspectRatio>
          </div>
        </Row>
      </State>

      <State
        breaks="A frame or its content that assumes left-to-right. The frame has no directional styling; only the content inside it can break."
        id="rtl"
        note="The frame is symmetric. This content uses logical alignment, so it mirrors with the document direction."
        title="Right-to-left"
      >
        <div className="w-56" dir="rtl">
          <AspectRatio className="overflow-hidden rounded-lg bg-muted" ratio={4 / 3}>
            <p className="absolute start-3 top-3 m-0 max-w-[80%] text-xs">
              إطار بنسبة ثابتة بين العرض والارتفاع
            </p>
          </AspectRatio>
        </div>
      </State>

      <State
        breaks="Nothing — this state exists to record an absence."
        id="no-states"
        note="AspectRatio is a layout frame. It has no disabled, focus, error or loading state of its own and renders a plain div. Express those on what you put inside it."
        title="States AspectRatio deliberately does not have"
      >
        <Row>
          <div className="w-40">
            <AspectRatio className="rounded-lg border border-border border-dashed" ratio={1} />
          </div>
        </Row>
      </State>

      <Aside title="Passing style">
        <p>
          The ratio is written to the inline <code>aspect-ratio</code> style, then your{" "}
          <code>style</code> is spread over it. A <code>style.aspectRatio</code> therefore wins over
          the <code>ratio</code> prop; use one or the other.
        </p>
      </Aside>
    </DemoPage>
  );
}
