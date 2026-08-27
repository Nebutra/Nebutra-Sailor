"use client";

import { AnimateIn, AnimateInGroup, AnimateSwap, Badge, Button } from "@nebutra/ui/primitives";
import * as React from "react";
import {
  Aside,
  ControlButton,
  Controls,
  DemoPage,
  MissingAxis,
  Row,
  Specimen,
  Stack,
  State,
} from "../demo-kit";
import type { DemoProps } from "../derived";

const SLIDE_PRESETS = new Set([
  "slideFromRight",
  "slideFromLeft",
  "slideFromTop",
  "slideFromBottom",
]);

function Card({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-lg bg-background p-4 text-foreground text-sm shadow-ambient-sm">
      {children}
    </div>
  );
}

export default function AnimateInDemo({ derived }: DemoProps) {
  const presets = derived.axes.preset ?? [];
  const [run, setRun] = React.useState(0);
  const [swapIndex, setSwapIndex] = React.useState(0);

  const panes = ["Overview", "Deployments", "Analytics"];

  return (
    <DemoPage>
      <State
        breaks="A preset added to PRESETS that nobody looked at. Every value below is read from that object at build time — press Replay to run them all again."
        id="presets"
        note={`All ${presets.length} presets declared in PRESETS. The slide presets are shown inside a clipped frame, because off-canvas is what they are for.`}
        title="Every preset"
      >
        <Controls>
          <ControlButton onClick={() => setRun((v) => v + 1)}>Replay</ControlButton>
        </Controls>
        {presets.length === 0 ? (
          <MissingAxis axisName="preset" />
        ) : (
          <Row align="start" className="gap-6">
            {presets.map((preset) => (
              <Specimen key={preset} label={preset}>
                {SLIDE_PRESETS.has(preset) ? (
                  <div className="h-20 w-36 overflow-hidden rounded-lg bg-muted/60">
                    <AnimateIn key={`${preset}-${run}`} preset={preset as never}>
                      <Card>{preset}</Card>
                    </AnimateIn>
                  </div>
                ) : (
                  <div className="w-36">
                    <AnimateIn key={`${preset}-${run}`} preset={preset as never}>
                      <Card>{preset}</Card>
                    </AnimateIn>
                  </div>
                )}
              </Specimen>
            ))}
          </Row>
        )}
      </State>

      <State
        breaks="A stagger so slow the last item arrives after the reader has moved on, or so fast it reads as one block. Replay and compare the three."
        id="stagger"
        note="Three stagger speeds over the same six items."
        title="Staggered groups"
      >
        <Controls>
          <ControlButton onClick={() => setRun((v) => v + 1)}>Replay</ControlButton>
        </Controls>
        <div className="grid gap-6 md:grid-cols-3">
          {(["fast", "normal", "slow"] as const).map((stagger) => (
            <div key={stagger}>
              <div className="mb-2 font-mono text-[11px] text-muted-foreground">{stagger}</div>
              <AnimateInGroup
                className="flex flex-col gap-2"
                key={`${stagger}-${run}`}
                stagger={stagger}
              >
                {Array.from({ length: 6 }, (_, i) => (
                  <AnimateIn key={i} preset="fadeUp">
                    <Card>Item {i + 1}</Card>
                  </AnimateIn>
                ))}
              </AnimateInGroup>
            </div>
          ))}
        </div>
      </State>

      <State
        breaks="A delay long enough that the content reads as missing. Anything past a few hundred milliseconds looks like a failed load, not an animation."
        id="delay"
        note="Same preset, four delays. The last one is deliberately too long."
        title="Delay"
      >
        <Controls>
          <ControlButton onClick={() => setRun((v) => v + 1)}>Replay</ControlButton>
        </Controls>
        <Row align="start" className="gap-6">
          {[0, 0.15, 0.4, 1.2].map((delay) => (
            <Specimen key={delay} label={`delay={${delay}}`}>
              <div className="w-32">
                <AnimateIn delay={delay} key={`${delay}-${run}`} preset="emerge">
                  <Card>{delay}s</Card>
                </AnimateIn>
              </div>
            </Specimen>
          ))}
        </Row>
      </State>

      <State
        breaks="A keyed swap that animates the container instead of the content, so the panel resizes on every change. Click through the panes and watch the frame stay put."
        id="swap"
        note="AnimateSwap animates on a changing key. The swap preset is shorter than emerge on purpose: it replaces content the reader is already looking at."
        title="Keyed content swap"
      >
        <Stack>
          <Row>
            {panes.map((pane, i) => (
              <ControlButton active={swapIndex === i} key={pane} onClick={() => setSwapIndex(i)}>
                {pane}
              </ControlButton>
            ))}
          </Row>
          <div className="min-h-24 rounded-lg bg-background p-4">
            <AnimateSwap preset="swap" swapKey={swapIndex}>
              <div className="flex flex-col gap-2">
                <div className="font-medium text-foreground text-sm">{panes[swapIndex]}</div>
                <div className="text-muted-foreground text-sm">
                  Content for the {panes[swapIndex]?.toLowerCase()} pane.
                </div>
              </div>
            </AnimateSwap>
          </div>
        </Stack>
      </State>

      <State
        breaks="A scroll-triggered animation that never fires because the element was already in view on load, leaving the content invisible. Scroll this section out of view and back."
        id="in-view"
        note="inView defers the animation until the element enters the viewport, once."
        title="Scroll-triggered"
      >
        <div className="h-40 overflow-y-auto rounded-lg bg-background p-4">
          <div className="h-32 text-muted-foreground text-sm">Scroll down inside this box.</div>
          <AnimateInGroup className="flex flex-col gap-2" inView stagger="normal">
            {Array.from({ length: 5 }, (_, i) => (
              <AnimateIn inView key={i} preset="emerge">
                <Card>Revealed on scroll — {i + 1}</Card>
              </AnimateIn>
            ))}
          </AnimateInGroup>
          <div className="h-32" />
        </div>
      </State>

      <State
        breaks="Content that is only reachable after an animation completes. Everything below must be readable and operable with animation off — which is what a reader with prefers-reduced-motion gets. Both components drop to a plain div in that case."
        id="reduced-motion"
        note="Set prefers-reduced-motion in the OS and reload: AnimateIn and AnimateInGroup render their children with no motion at all, not a shortened animation."
        title="Reduced motion"
      >
        <AnimateInGroup className="flex flex-wrap gap-3" stagger="fast">
          {["Production", "Preview", "Development"].map((label) => (
            <AnimateIn key={label} preset="fadeUp">
              <Badge variant="blue-subtle">{label}</Badge>
            </AnimateIn>
          ))}
        </AnimateInGroup>
      </State>

      <State
        breaks="An entrance animation on an interactive element that delays the moment it becomes clickable. The button below is live from the first frame; if a wrapper ever changes that, it shows here."
        id="interactive"
        note="An animated wrapper around a control. Click it during the animation."
        title="Around an interactive element"
      >
        <Controls>
          <ControlButton onClick={() => setRun((v) => v + 1)}>Replay</ControlButton>
        </Controls>
        <AnimateIn delay={0.8} key={`interactive-${run}`} preset="emerge">
          <Button>Clickable while animating</Button>
        </AnimateIn>
      </State>

      <Aside title="Why raw motion.div is banned">
        <p>
          CLAUDE.md forbids <code>motion.div</code> with hand-typed values. The reason is on this
          page: the presets carry the brand's durations and easings, and they read reduced-motion
          for you. A hand-written <code>initial={"{{ opacity: 0, y: 20 }}"}</code> does neither, and
          there are currently ten presets it would have to keep in step with by hand.
        </p>
      </Aside>
    </DemoPage>
  );
}
