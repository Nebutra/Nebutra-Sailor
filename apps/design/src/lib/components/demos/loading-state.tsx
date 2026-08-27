"use client";

import { LoadingState } from "@nebutra/ui/layout";
import { Aside, DemoPage, Row, Specimen, Stack, State } from "../demo-kit";

const SIZES = ["small", "medium", "large"] as const;

export default function LoadingStateDemo() {
  return (
    <DemoPage>
      <State
        breaks="A loading state with no message, which tells a screen reader nothing beyond 'status'. The message becomes the aria-label, so omitting it costs accessibility, not just clarity."
        id="default"
        note="With and without a message. Both announce; only one says what is happening."
        title="Default"
      >
        <Row align="start">
          <Specimen label="with message">
            <div className="w-64 rounded-lg bg-background">
              <LoadingState message="Fetching deployments…" />
            </div>
          </Specimen>
          <Specimen label='no message — announces "Loading"'>
            <div className="w-64 rounded-lg bg-background">
              <LoadingState />
            </div>
          </Specimen>
        </Row>
      </State>

      <State
        breaks="A size whose border width does not scale, so the small spinner reads as a dot and the large one as a ring."
        id="sizes"
        note="Three sizes. Note the vertical padding does not change with the size — the block is the same height in all three."
        title="Sizes"
      >
        <Row align="start">
          {SIZES.map((size) => (
            <Specimen key={size} label={size === "large" ? `${size} (default)` : size}>
              <div className="w-48 rounded-lg bg-background">
                <LoadingState size={size} />
              </div>
            </Specimen>
          ))}
        </Row>
      </State>

      <State
        breaks="A loading state that changes the panel's height when it resolves, so the page jumps. The two panels below are the same fixed height; watch the outline, not the spinner."
        id="layout"
        note="The same panel loading and loaded, at a fixed height."
        title="Holding the layout"
      >
        <Row align="start">
          <Specimen label="loading">
            <div className="flex h-40 w-64 items-center justify-center rounded-lg bg-background">
              <LoadingState message="Fetching deployments…" />
            </div>
          </Specimen>
          <Specimen label="loaded">
            <div className="flex h-40 w-64 flex-col gap-2 rounded-lg bg-background p-4 text-foreground text-sm">
              <div>a1b2c3d — Ready</div>
              <div>9f8e7d6 — Ready</div>
              <div>4c5b6a7 — Building</div>
            </div>
          </Specimen>
        </Row>
      </State>

      <State
        breaks="A long message that wraps into three lines inside a narrow panel and pushes the spinner off-centre."
        id="overflow"
        note="A long message at a constrained width."
        title="Overflow — long message"
      >
        <div className="max-w-[14rem] rounded-lg bg-background">
          <LoadingState message="Provisioning a dedicated single-tenant analytics cluster in Frankfurt (eu-central-1)" />
        </div>
      </State>

      <State
        breaks="A loading state used where a skeleton belongs. For a list whose shape is known, the skeleton holds the layout and this does not — the comparison is the point."
        id="versus-skeleton"
        note="The same list, waiting two ways."
        title="Against a skeleton"
      >
        <Stack>
          <Row align="start">
            <Specimen label="LoadingState">
              <div className="h-40 w-64 rounded-lg bg-background">
                <LoadingState message="Loading" size="medium" />
              </div>
            </Specimen>
            <Specimen label="Skeleton rows">
              <div className="flex h-40 w-64 flex-col gap-3 rounded-lg bg-background p-4">
                {Array.from({ length: 4 }, (_, i) => (
                  <div className="flex justify-between gap-3" key={i}>
                    <div className="h-3.5 w-1/2 animate-pulse rounded bg-muted" />
                    <div className="h-3.5 w-12 animate-pulse rounded bg-muted" />
                  </div>
                ))}
              </div>
            </Specimen>
          </Row>
        </Stack>
      </State>

      <Aside title="This one does not use Spinner">
        <p>
          LoadingState draws its own spinner from border utilities rather than composing the{" "}
          <code>Spinner</code> primitive, which is why its sizes are named{" "}
          <code>small | medium | large</code> while Spinner's are <code>xs | sm | md | lg</code>.
          Two loading indicators in one library will drift; the pair is visible here rather than
          asserted somewhere else. There is no keyboard path — it is a status output.
        </p>
      </Aside>
    </DemoPage>
  );
}
