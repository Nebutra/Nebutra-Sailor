"use client";

import { StatusDot } from "@nebutra/ui/primitives";
import { Aside, AxisMatrix, DemoPage, MissingAxis, Row, Specimen, State } from "../demo-kit";
import type { DemoProps } from "../derived";

export default function StatusDotDemo({ derived }: DemoProps) {
  const states = derived.axes.state ?? [];

  return (
    <DemoPage>
      <State
        breaks="A state added to the DeploymentState union without a colour, a title or a label. Every value below is read from that union at build time, so a new state cannot be added without appearing here."
        id="states"
        note={`All ${states.length} states in the DeploymentState union, with labels.`}
        title="Every state"
      >
        <AxisMatrix
          axisName="state"
          render={(state) => <StatusDot label state={state as never} />}
          values={states}
        />
      </State>

      <State
        breaks="Colour carrying the meaning on its own. Compare the two rows: the dot-only row is unreadable to anyone who cannot separate the hues, which is why label exists."
        id="label"
        note="With and without the label, same states."
        title="Colour is never the only signal"
      >
        {states.length === 0 ? (
          <MissingAxis axisName="state" />
        ) : (
          <div className="flex flex-col gap-4">
            <div>
              <div className="mb-2 font-mono text-[11px] text-muted-foreground">
                label — readable
              </div>
              <Row className="gap-6">
                {states.map((state) => (
                  <StatusDot key={state} label state={state as never} />
                ))}
              </Row>
            </div>
            <div>
              <div className="mb-2 font-mono text-[11px] text-muted-foreground">
                dot only — colour is the only signal
              </div>
              <Row className="gap-6">
                {states.map((state) => (
                  <StatusDot key={state} state={state as never} />
                ))}
              </Row>
            </div>
          </div>
        )}
      </State>

      <State
        breaks="A dot that is announced as a separate item in a list where the row already says its status, doubling every entry for a screen-reader user."
        id="decorative"
        note="decorative removes it from the accessibility tree. Use it when the adjacent text already carries the state."
        title="Decorative"
      >
        <Row className="gap-8">
          <Specimen label="default — announced">
            <StatusDot state="READY" />
          </Specimen>
          <Specimen label="decorative — silent">
            <div className="flex items-center gap-2">
              <StatusDot decorative state="READY" />
              <span className="text-foreground text-sm">Ready</span>
            </div>
          </Specimen>
        </Row>
      </State>

      <State
        breaks="A title prefix that reads awkwardly in a tooltip, e.g. 'Status: Status: Ready'."
        id="title-prefix"
        note="titlePrefix is prepended to the hover title."
        title="Title prefix"
      >
        <Row className="gap-8">
          <Specimen label="default title">
            <StatusDot label state="BUILDING" />
          </Specimen>
          <Specimen label='titlePrefix="Deployment"'>
            <StatusDot label state="BUILDING" titlePrefix="Deployment" />
          </Specimen>
        </Row>
      </State>

      <State
        breaks="A status column that wraps mid-label, or one where the dot separates from its text at a narrow width."
        id="overflow"
        note="A list at a constrained width — the dot must stay attached to its label."
        title="Overflow — in a narrow column"
      >
        <div className="max-w-[11rem] rounded-lg bg-background p-3">
          <div className="flex flex-col gap-2">
            {states.slice(0, 4).map((state) => (
              <div className="flex items-center justify-between gap-2" key={state}>
                <span className="truncate text-foreground text-sm">acme-analytics</span>
                <StatusDot label state={state as never} />
              </div>
            ))}
          </div>
        </div>
      </State>

      <Aside title="This replaces Badge's dot prop">
        <p>
          <code>Badge</code> still accepts a <code>dot</code> prop, marked deprecated in its source
          in favour of this component. If a dot needs a status meaning, it belongs here, where the
          state union, the colour and the accessible label are declared together.
        </p>
      </Aside>
    </DemoPage>
  );
}
