"use client";

import { Skeleton, SkeletonAvatar, SkeletonCard, SkeletonText } from "@nebutra/ui/primitives";
import * as React from "react";
import { Aside, ControlButton, Controls, DemoPage, Row, Specimen, Stack, State } from "../demo-kit";

export default function SkeletonDemo() {
  const [loaded, setLoaded] = React.useState(false);

  return (
    <DemoPage>
      <State
        breaks="A skeleton whose shape does not match the content it stands in for, so the layout jumps when the real content lands. Toggle isLoaded and watch whether anything moves."
        id="swap"
        note="Skeleton can wrap its own children and swap in when isLoaded flips. That is what keeps the placeholder and the real thing the same size."
        title="Placeholder to content"
      >
        <Controls>
          <ControlButton active={loaded} onClick={() => setLoaded((v) => !v)}>
            isLoaded
          </ControlButton>
        </Controls>
        <div className="max-w-md rounded-lg bg-background p-4">
          <div className="flex items-start gap-3">
            <Skeleton isLoaded={loaded} pill>
              <SkeletonAvatar />
            </Skeleton>
            <div className="flex flex-1 flex-col gap-2">
              <Skeleton height={16} isLoaded={loaded} width="60%">
                <div className="font-medium text-foreground text-sm">acme-analytics</div>
              </Skeleton>
              <Skeleton height={14} isLoaded={loaded} width="90%">
                <div className="text-muted-foreground text-sm">
                  Deployed 4 minutes ago from main
                </div>
              </Skeleton>
            </div>
          </div>
        </div>
      </State>

      <State
        breaks="A skeleton block with no dimensions, which collapses to nothing and leaves a hole in the layout."
        id="shapes"
        note="width and height take numbers or CSS lengths. pill, rounded and squared control the corners."
        title="Shapes"
      >
        <Row align="start">
          {(
            [
              { label: "default", props: { width: 120, height: 16 } },
              { label: "pill", props: { width: 120, height: 16, pill: true } },
              { label: "squared", props: { width: 120, height: 16, squared: true } },
              { label: "width='100%'", props: { width: "100%", height: 16 } },
            ] as const
          ).map((entry) => (
            <Specimen key={entry.label} label={entry.label}>
              <div className="w-32">
                <Skeleton {...entry.props} />
              </div>
            </Specimen>
          ))}
        </Row>
      </State>

      <State
        breaks="A pulse that keeps running for a reader who asked for reduced motion, or an animation that cannot be turned off for a screenshot test."
        id="animation"
        note="animated defaults on. disableAnimation and animated={false} both stop it."
        title="Animation"
      >
        <Row align="start">
          <Specimen label="animated (default)">
            <Skeleton height={16} width={140} />
          </Specimen>
          <Specimen label="animated={false}">
            <Skeleton animated={false} height={16} width={140} />
          </Specimen>
        </Row>
      </State>

      <State
        breaks="A composed skeleton that stops matching its real counterpart after the real component changes. These three are the library's presets, so they change together with it."
        id="presets"
        note="SkeletonText, SkeletonAvatar and SkeletonCard."
        title="Presets"
      >
        <Stack>
          <div className="max-w-md rounded-lg bg-background p-4">
            <SkeletonText />
          </div>
          <Row>
            <SkeletonAvatar />
            <SkeletonAvatar />
            <SkeletonAvatar />
          </Row>
          <div className="max-w-md">
            <SkeletonCard />
          </div>
        </Stack>
      </State>

      <State
        breaks="A skeleton list of the wrong length. Three placeholder rows followed by eleven real rows is a worse experience than one placeholder — the page reflows twice."
        id="lists"
        note="Six rows of consistent height, which is the shape a table body loads into."
        title="Lists"
      >
        <div className="max-w-md rounded-lg bg-background p-4">
          <div className="flex flex-col gap-3">
            {Array.from({ length: 6 }, (_, i) => (
              <div className="flex items-center justify-between gap-4" key={i}>
                <Skeleton height={14} width="45%" />
                <Skeleton height={14} width={64} />
              </div>
            ))}
          </div>
        </div>
      </State>

      <State
        breaks="A skeleton wider than its container, pushing the page sideways."
        id="overflow"
        note="width='100%' inside a narrow container, and a fixed width that is too big for it."
        title="Overflow"
      >
        <Row align="start">
          <Specimen label="width='100%' — fits">
            <div className="w-40 rounded-lg bg-background p-3">
              <Skeleton height={16} width="100%" />
            </div>
          </Specimen>
          <Specimen label="width={400} — does not">
            <div className="w-40 overflow-x-auto rounded-lg bg-background p-3">
              <Skeleton height={16} width={400} />
            </div>
          </Specimen>
        </Row>
      </State>

      <Aside title="Skeleton or Spinner">
        <p>
          Use a skeleton when the shape of what is coming is known, because it holds the layout. Use{" "}
          <code>Spinner</code> when it is not, or when the wait is short. Neither is focusable and
          neither has a keyboard path; the accessible signal is <code>aria-busy</code> on the region
          that is loading, which is the caller's responsibility.
        </p>
      </Aside>
    </DemoPage>
  );
}
